#!/usr/bin/env node
// Log one already-completed LLM/tool step as a trace span from the CLI.
//
// The interactive generation steps (writing carousel/reel specs) are done by an
// LLM agent, not by a node script, so this is how those steps get traced. Tool
// scripts (gen-bg-from-specs.js, build_transformations.js) trace themselves.
//
// Group a whole run under one id by passing --trace (or exporting TRACE_ID).
//
// Usage:
//   node observability/log-span.js \
//     --campaign campaigns/2026-06-15-energy-basics-batch-001 \
//     --span generate_spec.34-morning-light \
//     --model claude-opus-4-8 --status success \
//     --input "topic=morning sunlight" --output "34-morning-light.json (7 slides)" \
//     --tokens-in 1800 --tokens-out 900 --latency 5200 \
//     --prompt-version health-carousel/prompt.md --temperature 0.7 \
//     --config '{"maxTokens":4096}' --artifact spec=campaigns/.../34.json \
//     --parent generate_specs --meta format=health-carousel --trace run_energy_001
//
// Repeat --artifact and --meta for multiple entries. --config takes JSON or a string.

const { Tracer } = require("./tracer");

const argv = process.argv.slice(2);
const opt = {};
const meta = {};
const artifacts = []; // --artifact label=path (repeatable)
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  if (!k.startsWith("--")) continue;
  const v = argv[i + 1];
  i++;
  const kv = (str) => { const eq = str.indexOf("="); return eq > 0 ? [str.slice(0, eq), str.slice(eq + 1)] : null; };
  switch (k) {
    case "--meta": { const p = kv(v); if (p) meta[p[0]] = p[1]; break; }
    case "--artifact": { const p = kv(v); if (p) artifacts.push({ label: p[0], path: p[1] }); break; }
    default:
      opt[k.slice(2)] = v;
  }
}

if (!opt.span) {
  console.error("log-span.js: --span <id> is required");
  process.exit(1);
}

const num = (x) => (x == null ? undefined : Number(x));
const tracer = new Tracer({
  traceId: opt.trace,
  campaignId: opt.campaign,
  metadata: opt.format ? { format: opt.format } : {},
  quiet: true,
});

let config = null;
if (opt.config) { try { config = JSON.parse(opt.config); } catch { config = opt.config; } }

tracer.record({
  spanId: opt.span,
  input: opt.input ?? null,
  output: opt.output ?? null,
  model: opt.model ?? null,
  temperature: num(opt.temperature),
  promptVersion: opt["prompt-version"] ?? null,
  config,
  parentSpanId: opt.parent ?? null,
  status: opt.status || "success",
  error: opt.error ?? null,
  latencyMs: num(opt.latency),
  tokensIn: num(opt["tokens-in"]),
  tokensOut: num(opt["tokens-out"]),
  costUsd: num(opt.cost),
  artifacts,
  metadata: meta,
});

const s = tracer.summary();
console.log(`logged ${opt.span} → ${s.files.join(", ")}`);
