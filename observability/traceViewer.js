#!/usr/bin/env node
// View traces. Renders the run as a nested tree with token/cost, eval scores,
// and (verbose) input/output previews, config, and artifact links. Supports
// filtering and comparing two runs.
//
// Targets:
//   <file>.jsonl                         a single trace file
//   campaigns/<campaign>                 that campaign's traces/ (newest run)
//   campaigns                            scan EVERY campaign's traces/ (feature 8)
//
// Flags:
//   --all                merge all run files under the target (not just newest)
//   -v, --verbose        per-span input→output preview, config, artifacts (1,6,7)
//   --errors             error message + stack trace for failed spans (2)
//   --evals              per-deck code/judge eval-score table (5)
//   --flat               disable parent/child tree indentation (4)
//   --json               machine-readable rollup
//   --format X --model Y --status S --span SUBSTR --campaign NAME    filters (8)
//   --compare A B        side-by-side rollup of two targets (9)
//
// Examples:
//   node observability/traceViewer.js campaigns/2026-06-15-energy-basics-batch-001 -v
//   node observability/traceViewer.js campaigns/2026-06-15-energy-basics-batch-001 --evals
//   node observability/traceViewer.js campaigns --status error --all
//   node observability/traceViewer.js --compare campaigns/<A> campaigns/<B>

const fs = require("fs");
const path = require("path");
const { STATUS, preview } = require("./traceTypes");

const REPO = path.join(__dirname, "..");
const CAMPAIGNS = path.join(REPO, "campaigns");

// ---- args ----------------------------------------------------------------
const raw = process.argv.slice(2);
const flags = { filters: {} };
const pos = [];
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  switch (a) {
    case "--all": flags.all = true; break;
    case "-v": case "--verbose": flags.verbose = true; break;
    case "--errors": flags.errors = true; break;
    case "--evals": flags.evals = true; break;
    case "--flat": flags.flat = true; break;
    case "--json": flags.json = true; break;
    case "--compare": flags.compare = true; break;
    case "--format": flags.filters.format = raw[++i]; break;
    case "--model": flags.filters.model = raw[++i]; break;
    case "--status": flags.filters.status = raw[++i]; break;
    case "--span": flags.filters.span = raw[++i]; break;
    case "--campaign": flags.filters.campaign = raw[++i]; break;
    default: if (!a.startsWith("--")) pos.push(a); else { console.error(`unknown flag ${a}`); process.exit(1); }
  }
}

// ---- file resolution -----------------------------------------------------
function jsonlIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function resolveFiles(target) {
  const p = path.resolve(REPO, target);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return [p];
  if (!fs.existsSync(p)) return [];
  // a campaign dir → its traces/
  const own = path.join(p, "traces");
  if (fs.existsSync(own)) {
    const files = jsonlIn(own);
    return flags.all ? files : files.slice(0, 1);
  }
  // the campaigns/ root (or any dir of campaigns) → scan every child's traces/
  const scanned = [];
  for (const child of fs.readdirSync(p)) {
    const td = path.join(p, child, "traces");
    if (fs.existsSync(td)) scanned.push(...jsonlIn(td));
  }
  if (scanned.length) return flags.all ? scanned : scanned;
  return jsonlIn(p); // bare dir of jsonl
}

function loadSpans(files) {
  const spans = [];
  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); o._file = file; spans.push(o); } catch { /* skip */ }
    }
  }
  return spans;
}

function applyFilters(spans, f) {
  return spans.filter((s) => {
    if (f.format && (s.metadata?.format || "") !== f.format) return false;
    if (f.model && (s.model || "") !== f.model) return false;
    if (f.status && s.status !== f.status) return false;
    if (f.span && !s.spanId.includes(f.span)) return false;
    if (f.campaign && !(s.metadata?.campaignId || "").includes(f.campaign)) return false;
    return true;
  });
}

// ---- rollup --------------------------------------------------------------
function rollup(spans, files) {
  const sum = (k) => spans.reduce((a, s) => a + (s[k] || 0), 0);
  const judge = spans.filter((s) => s.metadata?.evalType === "judge" && s.evals?.judge?.overall != null);
  const code = spans.filter((s) => s.metadata?.evalType === "code");
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null);
  return {
    files: (files || []).map((f) => path.relative(REPO, f)),
    runs: [...new Set(spans.map((s) => s.traceId))].length,
    spans: spans.length,
    ok: spans.filter((s) => s.status === STATUS.SUCCESS).length,
    failed: spans.filter((s) => s.status === STATUS.ERROR).length,
    skipped: spans.filter((s) => s.status === STATUS.SKIPPED).length,
    latencyMs: sum("latencyMs"),
    tokensIn: sum("tokensIn"),
    tokensOut: sum("tokensOut"),
    costUsd: Math.round(sum("costUsd") * 1e6) / 1e6,
    evalCodePassRate: code.length ? Math.round((code.filter((s) => s.status === "success").length / code.length) * 100) : null,
    evalJudgeAvg: avg(judge.map((s) => s.evals.judge.overall)),
  };
}

// ---- tree ordering (feature 4) -------------------------------------------
// Order spans depth-first by parentSpanId, scoped per traceId, with a `depth`.
function asTree(spans) {
  if (flags.flat) return spans.map((s) => ({ s, depth: 0 }));
  const out = [];
  const byRun = {};
  spans.forEach((s, i) => { (byRun[s.traceId] = byRun[s.traceId] || []).push({ s, i }); });
  for (const run of Object.values(byRun)) {
    const ids = new Set(run.map((n) => n.s.spanId));
    const childrenOf = (pid) => run.filter((n) => (n.s.parentSpanId && ids.has(n.s.parentSpanId) ? n.s.parentSpanId : null) === pid)
      .sort((a, b) => a.i - b.i);
    const walk = (pid, depth) => { for (const n of childrenOf(pid)) { out.push({ s: n.s, depth }); walk(n.s.spanId, depth + 1); } };
    walk(null, 0);
  }
  return out;
}

const num = (n) => (n == null ? "·" : String(n));
const mark = (st) => (st === STATUS.SUCCESS ? "•" : st === STATUS.ERROR ? "✗" : "–");
const pad = (v, w) => { const s = String(v); return s.length > w ? s.slice(0, w - 1) + "…" : s.padEnd(w); };

// ---- renderers -----------------------------------------------------------
function renderTable(spans) {
  const rows = asTree(spans);
  const cols = [
    ["span", 30], ["st", 2], ["model", 18], ["ms", 8], ["in", 7], ["out", 7], ["usd", 9], ["eval", 10],
  ];
  console.log(cols.map(([h, w]) => pad(h, w)).join(" "));
  console.log(cols.map(([, w]) => "-".repeat(w)).join(" "));
  for (const { s, depth } of rows) {
    const name = "  ".repeat(depth) + s.spanId;
    let ev = "";
    if (s.evals?.judge?.overall != null) ev = `J ${s.evals.judge.overall}/5`;
    else if (s.evals?.code) ev = `C ${s.evals.code.passed ?? (s.evals.code.pass ? "ok" : "fail")}${s.evals.code.total ? "/" + s.evals.code.total : ""}`;
    console.log([
      pad(name, 30), mark(s.status), pad(s.model || "·", 18),
      pad(num(s.latencyMs), 8), pad(num(s.tokensIn), 7), pad(num(s.tokensOut), 7),
      pad(s.costUsd == null ? "·" : s.costUsd, 9), pad(ev, 10),
    ].join(" "));
    if (flags.verbose) {
      if (s.input != null) console.log(`      in : ${preview(s.input, 96)}`);
      if (s.output != null) console.log(`      out: ${preview(s.output, 96)}`);
      const cfg = [s.model && `model=${s.model}`, s.temperature != null && `temp=${s.temperature}`, s.promptVersion && `prompt=${s.promptVersion}`, s.config && `cfg=${preview(s.config, 60)}`].filter(Boolean).join("  ");
      if (cfg) console.log(`      cfg: ${cfg}`);
      if (s.artifacts && s.artifacts.length) console.log(`      art: ${s.artifacts.map((a) => `${a.label}=${a.path || a.url}`).join("  ")}`);
    }
  }
}

function renderErrors(spans) {
  const fails = spans.filter((s) => s.status === STATUS.ERROR);
  if (!fails.length) { console.log("no failed spans."); return; }
  console.log(`${fails.length} failed span(s):\n`);
  for (const s of fails) {
    console.log(`✗ ${s.spanId}  (${s.metadata?.campaignId || ""})`);
    console.log(`  error: ${s.error || "(no message)"}`);
    if (s.input != null) console.log(`  input: ${preview(s.input, 120)}`);
    if (s.stack) console.log(s.stack.split("\n").map((l) => "    " + l).join("\n"));
    console.log("");
  }
}

function renderEvals(spans) {
  // group eval scores per deck key (feature 5)
  const byKey = {};
  for (const s of spans) {
    const key = s.metadata?.key;
    if (!key) continue;
    if (s.metadata.evalType === "code" && s.evals?.code) (byKey[key] = byKey[key] || {}).code = s.evals.code;
    if (s.metadata.evalType === "judge" && s.evals?.judge) (byKey[key] = byKey[key] || {}).judge = s.evals.judge;
  }
  const keys = Object.keys(byKey).sort();
  if (!keys.length) { console.log("no eval spans found (run: node evals/run-evals.js <campaign>)."); return; }
  console.log("deck                    code        judge  hook cla aud nov brd prd");
  console.log("----------------------- ----------- ------ ---- --- --- --- --- ---");
  const cell = (v) => String(v ?? "·").padStart(3);
  for (const k of keys) {
    const c = byKey[k].code, j = byKey[k].judge?.scores;
    const o = byKey[k].judge?.overall;
    console.log(
      `${pad(k, 23)} ${pad(c ? `${c.passed}/${c.total}${c.pass ? " ok" : " FAIL"}` : "·", 11)} ${pad(o != null ? o + "/5" : "·", 6)} ` +
      (j ? `${cell(j.hook_strength)} ${cell(j.clarity)} ${cell(j.audience_fit)} ${cell(j.novelty)} ${cell(j.brand_fit)} ${cell(j.predicted_performance)}` : "")
    );
  }
}

function printRollup(r) {
  console.log(
    `${r.runs} run(s), ${r.spans} span(s): ${r.ok} ok, ${r.failed} failed, ${r.skipped} skipped · ` +
    `${r.latencyMs}ms · ${r.tokensIn}/${r.tokensOut} tok · $${r.costUsd}` +
    (r.evalCodePassRate != null ? ` · code ${r.evalCodePassRate}% pass` : "") +
    (r.evalJudgeAvg != null ? ` · judge ${r.evalJudgeAvg}/5` : "")
  );
}

// ---- compare (feature 9) -------------------------------------------------
function compare(a, b) {
  const load = (t) => { const files = resolveFiles(t); return { label: t, r: rollup(applyFilters(loadSpans(files), flags.filters), files) }; };
  const A = load(a), B = load(b);
  const rows = [
    ["runs", "runs"], ["spans", "spans"], ["ok", "ok"], ["failed", "failed"], ["skipped", "skipped"],
    ["latencyMs", "latency ms"], ["tokensIn", "tok in"], ["tokensOut", "tok out"], ["costUsd", "cost usd"],
    ["evalCodePassRate", "code % pass"], ["evalJudgeAvg", "judge /5"],
  ];
  console.log(pad("metric", 16) + pad("A: " + path.basename(a), 26) + pad("B: " + path.basename(b), 26) + "Δ (B−A)");
  console.log("-".repeat(78));
  for (const [k, label] of rows) {
    const av = A.r[k], bv = B.r[k];
    const d = typeof av === "number" && typeof bv === "number" ? Math.round((bv - av) * 1e6) / 1e6 : "·";
    console.log(pad(label, 16) + pad(num(av), 26) + pad(num(bv), 26) + (d === "·" ? "·" : (d > 0 ? "+" : "") + d));
  }
}

// ---- main ----------------------------------------------------------------
if (flags.compare) {
  if (pos.length < 2) { console.error("usage: traceViewer.js --compare <A> <B>"); process.exit(1); }
  compare(pos[0], pos[1]);
  process.exit(0);
}

const target = pos[0];
if (!target) {
  console.error("usage: traceViewer.js <trace.jsonl | campaigns/<campaign> | campaigns> [flags]  (see --help in source)");
  process.exit(1);
}
const files = resolveFiles(target);
if (!files.length) { console.error(`no trace files found for: ${target}`); process.exit(1); }
const spans = applyFilters(loadSpans(files), flags.filters);
const r = rollup(spans, files);

if (flags.json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

console.log(r.files.join(", "));
const activeFilters = Object.entries(flags.filters).filter(([, v]) => v);
if (activeFilters.length) console.log("filters: " + activeFilters.map(([k, v]) => `${k}=${v}`).join(" "));
console.log("");

if (flags.errors) renderErrors(spans);
else if (flags.evals) renderEvals(spans);
else renderTable(spans);

console.log("");
printRollup(r);
