#!/usr/bin/env node
// Run every eval on a campaign's specs and trace the results.
//
// For each approved carousel spec we run:
//   - code evals   (deterministic structural checks — evals/code-evals.js)
//   - llm judge     (subjective scores from a different model — evals/llm-judge.js)
// Each spec gets a parent `eval.<key>` span with `eval_code.<key>` and
// `eval_judge.<key>` children (auto-nested), the judge span carrying real
// token/cost. Scores are written to campaigns/<camp>/evals/<key>.json and a
// summary.tsv, and attached to the trace span (.evals) with artifact links.
//
// Usage:
//   node evals/run-evals.js campaigns/<campaign-dir> [--no-judge] [--judge-model sonnet] [--audience "..."]
//
// Share a run id with the rest of the pipeline by exporting TRACE_ID.

const fs = require("fs");
const path = require("path");
const { Tracer } = require("../observability/tracer");
const { preview } = require("../observability/traceTypes");
const { runCodeEvals } = require("./code-evals");
const { judgeSpec, buildPrompt } = require("./llm-judge");

const REPO = path.join(__dirname, "..");
const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--no-judge") flags.noJudge = true;
  else if (argv[i] === "--judge-model") flags.judgeModel = argv[++i];
  else if (argv[i] === "--audience") flags.audience = argv[++i];
  else pos.push(argv[i]);
}
const camp = path.resolve(REPO, pos[0] || "");
const approved = path.join(camp, "approved");
const generated = path.join(camp, "generated");
const srcDir = fs.existsSync(approved) && fs.readdirSync(approved).some((f) => f.endsWith(".json")) ? approved : generated;
if (!fs.existsSync(srcDir)) {
  console.error(`no approved/ or generated/ specs in ${pos[0]}`);
  process.exit(1);
}
const evalsDir = path.join(camp, "evals");
fs.mkdirSync(evalsDir, { recursive: true });

// Carousel specs only (reels use a different schema).
const specs = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: path.join(srcDir, f), spec: JSON.parse(fs.readFileSync(path.join(srcDir, f), "utf8")) }))
  .filter(({ spec }) => Array.isArray(spec.slides));

if (!specs.length) {
  console.error(`no carousel specs found in ${path.relative(REPO, srcDir)}`);
  process.exit(1);
}

const tracer = new Tracer({
  campaignId: path.basename(camp),
  metadata: { step: "run-evals", format: "health-carousel" },
});

// Audience defaults to the brief's if present; otherwise the campaign norm.
const audience = flags.audience || "20–35, busy, tired-by-3pm, health-curious but overwhelmed by advice";

// Guard: the judge MUST be a different model than the generator, or it's grading
// its own work. The generator is this agent (Opus); the judge defaults to Sonnet.
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || "claude-opus-4-8";
const family = (m) => (String(m).toLowerCase().match(/opus|sonnet|haiku/) || [])[0] || null;
if (!flags.noJudge) {
  const judgeModel = flags.judgeModel || process.env.JUDGE_MODEL || "sonnet";
  if (family(judgeModel) && family(judgeModel) === family(GENERATOR_MODEL)) {
    console.error(
      `✗ judge model "${judgeModel}" is the same family as the generator "${GENERATOR_MODEL}".\n` +
        `  The LLM-as-judge must be a DIFFERENT model than the one that wrote the specs.\n` +
        `  Pick another with --judge-model <sonnet|haiku|…> or set JUDGE_MODEL.`
    );
    process.exit(1);
  }
}

function artifactsFor(spec) {
  const num = String(spec.key).slice(0, 2);
  const links = [{ label: "spec", path: path.relative(REPO, path.join(srcDir, `${spec.key}.json`)) }];
  for (const which of ["cover", "cta"]) {
    const p = path.join(REPO, "vibe-carousels", "ai-bg", `${num}-${which}.png`);
    if (fs.existsSync(p)) links.push({ label: `bg-${which}`, path: path.relative(REPO, p) });
  }
  return links;
}

async function evalOne({ file, spec }) {
  return tracer.span(
    `eval.${spec.key}`,
    async (parent, child) => {
      parent.input = `${spec.key} (${spec.eyebrow})`;
      const artifacts = artifactsFor(spec);
      parent.artifacts = artifacts;

      // --- code evals (deterministic) ---
      const code = await child(
        `eval_code.${spec.key}`,
        async (s) => {
          const r = runCodeEvals(spec);
          s.input = preview(spec.caption, 60);
          s.output = `${r.passed}/${r.total} checks (${r.results.filter((x) => !x.pass).map((x) => x.name).join(",") || "all pass"})`;
          s.status = r.pass ? "success" : "error";
          if (!r.pass) s.error = `failed: ${r.results.filter((x) => !x.pass).map((x) => `${x.name} (${x.detail})`).join("; ")}`;
          s.promptVersion = "code-evals-v1";
          s.evals = { code: r };
          s.artifacts = artifacts;
          return r;
        },
        { metadata: { key: spec.key, evalType: "code" } }
      );

      // --- llm judge (subjective, different model) ---
      let judge = { skipped: true, reason: "skipped via --no-judge" };
      if (!flags.noJudge) {
        judge = await child(
          `eval_judge.${spec.key}`,
          async (s) => {
            s.input = preview(buildPrompt(spec, audience), 90);
            s.promptVersion = "judge-v1";
            s.config = { judgeModel: flags.judgeModel || process.env.JUDGE_MODEL || "sonnet", outputFormat: "json", temperature: null };
            s.temperature = null;
            const res = await judgeSpec(spec, { model: flags.judgeModel, audience });
            s.model = res.model || s.config.judgeModel;
            s.tokensIn = res.tokensIn;
            s.tokensOut = res.tokensOut;
            s.costUsd = res.costUsd;
            s.artifacts = artifacts;
            if (res.skipped) {
              s.status = "skipped";
              s.output = res.reason;
            } else {
              s.output = `overall ${res.overall}/5 · ` + Object.entries(res.scores).map(([k, v]) => `${k[0]}${k.split("_")[1] ? k.split("_")[1][0] : ""}:${v}`).join(" ");
              s.evals = { judge: { scores: res.scores, overall: res.overall } };
            }
            return res;
          },
          { metadata: { key: spec.key, evalType: "judge" } }
        );
      }

      // --- persist the per-spec eval report (scores attached to the output) ---
      const report = {
        key: spec.key,
        eyebrow: spec.eyebrow,
        spec: path.relative(REPO, file),
        artifacts,
        code,
        judge,
        evaluatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(evalsDir, `${spec.key}.json`), JSON.stringify(report, null, 2));
      parent.output = `code ${code.passed}/${code.total}` + (judge.skipped ? ", judge skipped" : `, judge ${judge.overall}/5`);
      parent.evals = { code: { pass: code.pass, score: code.score }, judge: judge.skipped ? null : { overall: judge.overall } };
      return report;
    },
    { metadata: { key: spec.key } }
  );
}

// limited concurrency — judge calls are heavy
const CONC = 3;
(async () => {
  console.log(`Evaluating ${specs.length} spec(s) from ${path.relative(REPO, srcDir)}${flags.noJudge ? " (code only)" : ""}…\n`);
  const reports = [];
  const queue = [...specs];
  const workers = Array.from({ length: Math.min(CONC, queue.length) }, async () => {
    while (queue.length) reports.push(await evalOne(queue.shift()));
  });
  await Promise.all(workers);

  // summary.tsv — eval scores per deck
  const header = "key\tcode_pass\tcode_score\tjudge_overall\thook\tclarity\taudience\tnovelty\tbrand\tpredicted\tjudge_cost_usd\n";
  const rows = reports
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => {
      const j = r.judge && !r.judge.skipped ? r.judge.scores : {};
      const o = (k) => (j[k] != null ? j[k] : "");
      return [
        r.key,
        r.code.pass ? "PASS" : "FAIL",
        r.code.score,
        r.judge && !r.judge.skipped ? r.judge.overall : "",
        o("hook_strength"), o("clarity"), o("audience_fit"), o("novelty"), o("brand_fit"), o("predicted_performance"),
        r.judge && r.judge.costUsd != null ? r.judge.costUsd : "",
      ].join("\t");
    })
    .join("\n");
  fs.writeFileSync(path.join(evalsDir, "summary.tsv"), header + rows + "\n");

  // console summary
  console.log("\nkey                     code        judge(overall)  hook cla aud nov brd prd");
  console.log("----------------------- ----------- --------------- ---- --- --- --- --- ---");
  for (const r of reports.sort((a, b) => a.key.localeCompare(b.key))) {
    const j = r.judge && !r.judge.skipped ? r.judge.scores : null;
    const cell = (v) => String(v ?? "·").padStart(3);
    console.log(
      `${r.key.padEnd(23)} ${(r.code.passed + "/" + r.code.total + (r.code.pass ? " ok" : " FAIL")).padEnd(11)} ` +
        `${(j ? r.judge.overall + "/5" : "skipped").padEnd(15)} ` +
        (j ? `${cell(j.hook_strength)} ${cell(j.clarity)} ${cell(j.audience_fit)} ${cell(j.novelty)} ${cell(j.brand_fit)} ${cell(j.predicted_performance)}` : "")
    );
  }
  const s = tracer.summary();
  console.log(`\ntrace ${s.traceId}: ${s.spans} span(s), $${s.costUsd} judge cost`);
  console.log(`reports → ${path.relative(REPO, evalsDir)}/  (per-deck JSON + summary.tsv)`);
  console.log(`view → node observability/traceViewer.js ${path.relative(REPO, camp)} --evals`);
})();
