#!/usr/bin/env node
// Push local JSONL traces to LangSmith.
//
// Usage:
//   node observability/export-to-langsmith.js campaigns/<campaign>      # newest run
//   node observability/export-to-langsmith.js campaigns/<campaign> --all
//   node observability/export-to-langsmith.js traces/<run>.jsonl
//   node observability/export-to-langsmith.js campaigns                 # every campaign
//   ... [--project NAME] [--eu] [--endpoint URL] [--dry-run]
//
// Credentials come from env or config/observability.local.yaml (gitignored).
// --dry-run maps + prints a summary without sending (no key needed).

const fs = require("fs");
const path = require("path");
const { loadConfig, spansToRuns, postRuns, ping, US } = require("./langsmith");

const REPO = path.join(__dirname, "..");
const raw = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a === "--all") flags.all = true;
  else if (a === "--dry-run") flags.dryRun = true;
  else if (a === "--eu") flags.endpoint = "https://eu.api.smith.langchain.com";
  else if (a === "--endpoint") flags.endpoint = raw[++i];
  else if (a === "--project") flags.project = raw[++i];
  else if (!a.startsWith("--")) pos.push(a);
}

function jsonlIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}
function resolveFiles(target) {
  const p = path.resolve(REPO, target);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return [p];
  if (!fs.existsSync(p)) return [];
  const own = path.join(p, "traces");
  if (fs.existsSync(own)) { const f = jsonlIn(own); return flags.all ? f : f.slice(0, 1); }
  const scanned = [];
  for (const child of fs.readdirSync(p)) {
    const td = path.join(p, child, "traces");
    if (fs.existsSync(td)) scanned.push(...jsonlIn(td));
  }
  return scanned.length ? scanned : jsonlIn(p);
}

const target = pos[0];
if (!target) { console.error("usage: export-to-langsmith.js <trace.jsonl | campaigns/<campaign> | campaigns> [--all] [--eu] [--project NAME] [--dry-run]"); process.exit(1); }

const files = resolveFiles(target);
if (!files.length) { console.error(`no trace files for: ${target}`); process.exit(1); }

const spans = [];
for (const f of files) for (const line of fs.readFileSync(f, "utf8").split("\n")) {
  if (line.trim()) { try { spans.push(JSON.parse(line)); } catch {} }
}
if (!spans.length) { console.error("no spans found."); process.exit(1); }

const config = loadConfig({ project: flags.project, endpoint: flags.endpoint });
const runs = spansToRuns(spans, config.project);

(async () => {
  console.log(`${spans.length} span(s) → ${runs.length} LangSmith run(s) (incl. synthetic roots)`);
  console.log(`project: ${config.project}   endpoint: ${config.endpoint}${config.endpoint === US ? " (US)" : ""}`);

  if (flags.dryRun) {
    const byType = {};
    for (const r of runs) byType[r.run_type] = (byType[r.run_type] || 0) + 1;
    console.log(`run types: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    console.log("sample run:\n" + JSON.stringify({ ...runs.find((r) => r.run_type === "llm") || runs[0] }, null, 2).slice(0, 900));
    console.log("\n(dry run — nothing sent)");
    return;
  }

  if (!config.hasKey) {
    console.error(
      "\n✗ no LANGSMITH_API_KEY found.\n" +
        "  Add it to a gitignored .env at the repo root (preferred):\n" +
        "    cp .env.example .env   # then set LANGSMITH_API_KEY=lsv2_pt_xxx\n" +
        "  or export LANGSMITH_API_KEY=... in your shell — then re-run."
    );
    process.exit(1);
  }

  const p = await ping(config);
  if (!p.ok) console.warn(`(warning: /info probe returned ${p.status}${p.error ? " " + p.error : ""} — sending anyway)`);

  const res = await postRuns(runs, config);
  if (res.ok) {
    const traces = [...new Set(spans.map((s) => s.traceId))];
    console.log(`\n✓ sent ${runs.length} run(s) to LangSmith (HTTP ${res.status}).`);
    console.log(`  view: ${config.endpoint.replace("api.", "").replace("https://", "https://")}  → project "${config.project}"`);
    console.log(`  traces: ${traces.join(", ")}`);
  } else {
    console.error(`\n✗ export failed (HTTP ${res.status}). ${res.error || res.body || ""}`);
    process.exit(1);
  }
})();
