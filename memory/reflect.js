#!/usr/bin/env node
// Reflexion memory — write a structured reflection after a generation+eval run,
// then distill it into reusable strategy memories the next campaign can recall.
//
//   episodic   → memory/reflections/<campaign>__<traceId>.json   (one per run)
//   semantic   → memory/strategies.json                          (distilled, deduped)
//
// We first compute deterministic signals from the campaign's eval reports
// (per-dimension averages, weakest/strongest, code failures, hooks used), then
// ask an LLM to synthesize lessons + concrete strategy adjustments grounded in
// those signals and the judge's rationales. Strategies merge into the store by
// stable id (support count bumps, evidence appends) so the memory stays small
// and gets more confident over time instead of growing unbounded.
//
// Usage:
//   node memory/reflect.js campaigns/<campaign-dir> [--model sonnet]
//
// Share the run id with the rest of the pipeline via TRACE_ID. Reflection model
// defaults to REFLECT_MODEL or "sonnet".

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { Tracer } = require("../observability/tracer");
const { preview } = require("../observability/traceTypes");

const REPO = path.join(__dirname, "..");
const MEM = __dirname;
const REFLECTIONS = path.join(MEM, "reflections");
const STRATEGIES = path.join(MEM, "strategies.json");
const DIMS = ["hook_strength", "clarity", "audience_fit", "novelty", "brand_fit", "predicted_performance"];

const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--model") flags.model = argv[++i];
  else pos.push(argv[i]);
}
const camp = path.resolve(REPO, pos[0] || "");
const evalsDir = path.join(camp, "evals");
if (!fs.existsSync(evalsDir)) {
  console.error(`no evals/ in ${pos[0]} — run: node evals/run-evals.js ${pos[0]}`);
  process.exit(1);
}
const campName = path.basename(camp);
const format = inferFormat();
const model = flags.model || process.env.REFLECT_MODEL || "sonnet";

function inferFormat() {
  try {
    const brief = fs.readFileSync(path.join(camp, "brief.md"), "utf8");
    const m = /\*\*Format:\*\*\s*([a-z0-9-]+)/i.exec(brief);
    if (m) return m[1];
  } catch {}
  return "health-carousel";
}

// ---- gather signals from the eval reports --------------------------------
function loadReports() {
  return fs
    .readdirSync(evalsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(evalsDir, f), "utf8")));
}

function signals(reports) {
  const judged = reports.filter((r) => r.judge && !r.judge.skipped);
  const dimAvg = {};
  for (const d of DIMS) {
    const vals = judged.map((r) => r.judge.scores[d]).filter((n) => typeof n === "number");
    dimAvg[d] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
  }
  const ranked = Object.entries(dimAvg).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1]);
  const codeFails = reports
    .filter((r) => r.code && !r.code.pass)
    .map((r) => `${r.key}: ${r.code.results.filter((x) => !x.pass).map((x) => x.name).join(",")}`);
  // judge rationales for the two weakest dimensions, to ground the reflection
  const weak = ranked.slice(0, 2).map(([d]) => d);
  const weakNotes = {};
  for (const d of weak) weakNotes[d] = judged.map((r) => `${r.key}: ${r.judge.rationales[d]}`).filter(Boolean);
  const hooks = reports.map((r) => {
    try {
      const spec = JSON.parse(fs.readFileSync(path.join(REPO, r.spec), "utf8"));
      return spec.slides?.[0]?.title;
    } catch { return null; }
  }).filter(Boolean);
  return {
    decks: reports.length,
    judged: judged.length,
    dimAvg,
    weakest: ranked[0] || null,
    strongest: ranked[ranked.length - 1] || null,
    codeFails,
    weakNotes,
    hooks,
  };
}

// ---- headless claude (JSON) ----------------------------------------------
function extractJson(text) {
  const start = (text || "").indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}
function callClaudeJson(prompt) {
  return new Promise((resolve) => {
    execFile("claude", ["-p", prompt, "--model", model, "--output-format", "json"], { maxBuffer: 1e8, timeout: 180000 }, (err, stdout) => {
      if (err && !stdout) return resolve({ ok: false, reason: `claude CLI failed: ${err.message}` });
      let env;
      try { env = JSON.parse(stdout); } catch { return resolve({ ok: false, reason: "bad CLI envelope" }); }
      const obj = extractJson(env.result || "");
      const u = env.usage || {};
      resolve({
        ok: !!obj, obj,
        model: env.modelUsage ? Object.keys(env.modelUsage).find((m) => m.includes(model) || m.includes("sonnet")) || model : model,
        tokensIn: env.usage ? (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : null,
        tokensOut: u.output_tokens ?? null,
        costUsd: env.total_cost_usd ?? null,
        reason: obj ? null : "no JSON in reflection",
      });
    });
  });
}

function buildPrompt(sig, goal) {
  const dimLine = Object.entries(sig.dimAvg).map(([d, v]) => `${d}: ${v ?? "n/a"}`).join(", ");
  const weakBlock = Object.entries(sig.weakNotes).map(([d, notes]) => `Weak dimension "${d}":\n  - ${notes.join("\n  - ")}`).join("\n");
  return `You are the strategy memory of a short-form content system. A campaign of ${sig.decks} ${format} decks just finished generation and evaluation. Reflect on the eval results and distill reusable lessons that should change how the NEXT campaign is generated.

CAMPAIGN GOAL: ${goal || "(none stated)"}
JUDGE SCORES (1-5 avg across the batch): ${dimLine}
WEAKEST: ${sig.weakest ? sig.weakest.join(" = ") : "n/a"}   STRONGEST: ${sig.strongest ? sig.strongest.join(" = ") : "n/a"}
CODE-EVAL FAILURES: ${sig.codeFails.length ? sig.codeFails.join("; ") : "none"}
HOOKS USED THIS BATCH:
- ${sig.hooks.join("\n- ")}

JUDGE RATIONALES ON THE WEAKEST DIMENSIONS:
${weakBlock || "(none)"}

Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "summary": "2-3 sentences on how this batch performed and why",
  "what_worked": ["short, specific"],
  "what_underperformed": ["short, specific"],
  "strategies": [
    {"id":"kebab-case-stable-id","title":"short imperative rule","guidance":"one concrete instruction the generator should follow next time","tag":"one of: hook|novelty|clarity|audience|brand|structure|caption","confidence":0.0-1.0}
  ]
}
Make strategies ACTIONABLE and grounded in the scores above (especially the weakest dimension). 2-4 strategies. Reuse an obvious stable id (e.g. "push-contrarian-novelty") so repeated lessons merge over time.`;
}

// ---- distill into the strategy store -------------------------------------
function loadStore() {
  if (fs.existsSync(STRATEGIES)) { try { return JSON.parse(fs.readFileSync(STRATEGIES, "utf8")); } catch {} }
  return { version: 1, updatedAt: null, strategies: [] };
}
function distill(store, proposed, evidenceBase) {
  for (const p of proposed) {
    if (!p || !p.id) continue;
    const existing = store.strategies.find((s) => s.id === p.id);
    const ev = { campaign: evidenceBase.campaign, weakest: evidenceBase.weakest, at: evidenceBase.at };
    if (existing) {
      existing.support += 1;
      existing.confidence = Math.min(1, Math.round(((existing.confidence + (p.confidence || 0.5)) / 2 + 0.05) * 100) / 100);
      existing.guidance = p.guidance || existing.guidance; // freshest phrasing
      existing.lastSeen = evidenceBase.at;
      existing.evidence.push(ev);
    } else {
      store.strategies.push({
        id: p.id,
        title: p.title || p.id,
        guidance: p.guidance || "",
        tag: p.tag || "general",
        format,
        support: 1,
        confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
        createdAt: evidenceBase.at,
        lastSeen: evidenceBase.at,
        evidence: [ev],
      });
    }
  }
  // strongest, most-supported first
  store.strategies.sort((a, b) => b.support - a.support || b.confidence - a.confidence);
  store.updatedAt = evidenceBase.at;
  return store;
}

// ---- run -----------------------------------------------------------------
const tracer = new Tracer({ campaignId: campName, metadata: { step: "reflect", format } });

(async () => {
  fs.mkdirSync(REFLECTIONS, { recursive: true });
  const reports = loadReports();
  if (!reports.length) { console.error("no eval reports to reflect on."); process.exit(1); }
  const sig = signals(reports);
  let goal = "";
  try { goal = (/(##\s*Goal\s*\n)([\s\S]*?)(\n##\s)/i.exec(fs.readFileSync(path.join(camp, "brief.md"), "utf8")) || [])[2]?.trim() || ""; } catch {}

  const at = new Date().toISOString();
  const result = await tracer.span(
    `reflect.${campName}`,
    async (span) => {
      span.model = model;
      span.config = { reflectModel: model };
      span.promptVersion = "reflect-v1";
      span.input = `${sig.decks} decks · weakest ${sig.weakest ? sig.weakest.join("=") : "n/a"}`;
      const r = await callClaudeJson(buildPrompt(sig, goal));
      span.tokensIn = r.tokensIn; span.tokensOut = r.tokensOut; span.costUsd = r.costUsd;
      if (r.model) span.model = r.model;
      if (!r.ok) { span.status = "error"; span.error = r.reason; throw new Error(r.reason); }

      const reflection = { campaign: campName, traceId: tracer.traceId, format, at, model: r.model, goal, signals: sig, ...r.obj };
      const file = path.join(REFLECTIONS, `${campName}__${tracer.traceId}.json`);
      fs.writeFileSync(file, JSON.stringify(reflection, null, 2));

      const store = distill(loadStore(), r.obj.strategies || [], { campaign: campName, weakest: sig.weakest?.[0] || null, at });
      fs.writeFileSync(STRATEGIES, JSON.stringify(store, null, 2));

      span.output = preview(r.obj.summary, 90);
      span.artifacts = [
        { label: "reflection", path: path.relative(REPO, file) },
        { label: "strategies", path: path.relative(REPO, STRATEGIES) },
      ];
      return { reflection, store, r };
    },
    { metadata: { campaign: campName } }
  ).catch((e) => ({ error: e.message }));

  if (result.error) { console.error(`✗ reflection failed: ${result.error}`); process.exit(1); }

  const { reflection, store } = result;
  console.log(`\nReflection on ${campName} (${sig.decks} decks, weakest: ${sig.weakest ? sig.weakest.join("=") : "n/a"})\n`);
  console.log(reflection.summary + "\n");
  console.log("strategies distilled into memory:");
  for (const p of reflection.strategies || []) {
    const s = store.strategies.find((x) => x.id === p.id);
    console.log(`  • [${p.tag}] ${p.title}  (support ${s.support}, conf ${s.confidence})`);
    console.log(`      ${p.guidance}`);
  }
  console.log(`\nepisodic → memory/reflections/${campName}__${tracer.traceId}.json`);
  console.log(`semantic → memory/strategies.json  (${store.strategies.length} strategies total)`);
  console.log(`recall next time → node memory/retrieve.js --format ${format}`);
})();
