#!/usr/bin/env node
// Recall the most relevant strategy memories for an upcoming campaign and emit
// them as a markdown context block the generator reads BEFORE writing specs.
// This closes the loop: lessons distilled by memory/reflect.js after past runs
// steer how the next batch is generated.
//
// Ranking = support (how many runs backed it) + confidence, boosted by keyword
// overlap with the campaign's topics, filtered to the format (format-agnostic
// strategies always qualify).
//
// Usage:
//   node memory/retrieve.js --format health-carousel [--topics "sleep,caffeine"] [--top 6]
//   node memory/retrieve.js --campaign campaigns/<dir>   # infer format+topics from brief.md, write context.md
//   node memory/retrieve.js --format health-carousel --json

const fs = require("fs");
const path = require("path");
const { Tracer } = require("../observability/tracer");

const REPO = path.join(__dirname, "..");
const STRATEGIES = path.join(__dirname, "strategies.json");

const argv = process.argv.slice(2);
const flags = { top: 6 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--format") flags.format = argv[++i];
  else if (a === "--topics") flags.topics = argv[++i];
  else if (a === "--top") flags.top = parseInt(argv[++i], 10) || 6;
  else if (a === "--campaign") flags.campaign = argv[++i];
  else if (a === "--json") flags.json = true;
}

// Infer format + topics from a campaign brief when --campaign is given.
let writeTo = null;
if (flags.campaign) {
  const camp = path.resolve(REPO, flags.campaign);
  writeTo = path.join(camp, "context.md");
  try {
    const brief = fs.readFileSync(path.join(camp, "brief.md"), "utf8");
    if (!flags.format) flags.format = (/\*\*Format:\*\*\s*([a-z0-9-]+)/i.exec(brief) || [])[1];
    if (!flags.topics) {
      const items = (/##\s*Items to generate([\s\S]*?)(\n##\s|$)/i.exec(brief) || [])[1] || "";
      flags.topics = items.split("\n").filter((l) => /^\s*\d+\./.test(l)).join(" ");
    }
  } catch {}
}

const store = fs.existsSync(STRATEGIES) ? JSON.parse(fs.readFileSync(STRATEGIES, "utf8")) : { strategies: [] };
const keywords = (flags.topics || "")
  .toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

function score(s) {
  if (flags.format && s.format && s.format !== flags.format) return -1; // wrong format
  const hay = `${s.title} ${s.guidance} ${s.tag}`.toLowerCase();
  const overlap = keywords.filter((k) => hay.includes(k)).length;
  return s.support * 1.0 + s.confidence * 2.0 + overlap * 1.5;
}

const ranked = store.strategies
  .map((s) => ({ s, score: score(s) }))
  .filter((x) => x.score >= 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, flags.top)
  .map((x) => x.s);

if (flags.json) {
  console.log(JSON.stringify({ format: flags.format, count: ranked.length, strategies: ranked }, null, 2));
  process.exit(0);
}

function block() {
  if (!ranked.length) {
    return `## Strategy memory\n_No strategy memory yet for ${flags.format || "this format"} — generate a batch and run \`node memory/reflect.js\` to start learning._\n`;
  }
  const lines = ranked.map(
    (s) => `- **[${s.tag}] ${s.title}** — ${s.guidance}  _(support ${s.support}, confidence ${s.confidence})_`
  );
  return (
    `## Strategy memory — apply while generating\n` +
    `_Distilled from ${new Set(store.strategies.flatMap((s) => s.evidence.map((e) => e.campaign))).size} past run(s). ` +
    `Higher support = more runs backed this lesson._\n\n` +
    lines.join("\n") + "\n"
  );
}

const md = block();
console.log(md);

if (writeTo) {
  fs.writeFileSync(writeTo, md);
  console.log(`(written to ${path.relative(REPO, writeTo)} — read this before generating)`);
  // trace the recall step so it shows up in the run
  const tracer = new Tracer({ campaignId: path.basename(path.dirname(writeTo)), metadata: { step: "retrieve-memory", format: flags.format } });
  tracer.record({
    spanId: "recall_strategy_memory",
    input: `format=${flags.format} topics=${keywords.join(",") || "(none)"}`,
    output: `recalled ${ranked.length} strateg${ranked.length === 1 ? "y" : "ies"}: ${ranked.map((s) => s.id).join(", ") || "none"}`,
    artifacts: [{ label: "context", path: path.relative(REPO, writeTo) }],
    metadata: { recalled: ranked.length },
  });
}
