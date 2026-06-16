// Trace data model shared by the tracer and the viewer.
//
// One *run* = one logical pipeline invocation (e.g. "generate backgrounds for
// campaign X"). A run is a stream of *spans*, one per important LLM or tool
// step. Each completed span is written as a single JSON line (JSONL) so logs
// append cheaply and stream-read without parsing the whole file.
//
// Span shape (mirrors the structure we standardized on):
//   {
//     traceId, spanId, parentSpanId?,
//     input, output,
//     model, temperature?, promptVersion?, config?,   // run config (feature 7)
//     latencyMs, tokensIn, tokensOut, costUsd,
//     status, error?, stack?,                          // error + stack trace (feature 2)
//     artifacts?: [{ label, path|url }],               // links to outputs (feature 6)
//     evals?: { code?, judge?, score? },               // eval scores on the output (feature 5)
//     startedAt, endedAt,
//     metadata: { format?, campaignId?, ... }
//   }

const crypto = require("crypto");

/** Span lifecycle status. */
const STATUS = Object.freeze({
  SUCCESS: "success",
  ERROR: "error",
  SKIPPED: "skipped",
});

// Rough cost reference, USD. LLM prices are per 1M tokens (in/out). Image/video
// tools are credit-based — we can't price them per token, so callers pass an
// explicit costUsd when they know it; otherwise cost is left null. Numbers here
// are deliberately overridable and used only as a fallback estimate.
const MODEL_COSTS = Object.freeze({
  // Claude (per 1M tokens)
  "claude-opus-4-8": { inPerM: 5, outPerM: 25 },
  "claude-sonnet-4-6": { inPerM: 3, outPerM: 15 },
  "claude-haiku-4-5": { inPerM: 1, outPerM: 5 },
  "claude-3-5-sonnet": { inPerM: 3, outPerM: 15 },
  // Tool steps with no token model — cost reported explicitly by the caller.
  gpt_image_2: null,
  seedance_2_0: null,
  ffmpeg: null,
  chrome: null,
});

/** `run_` + short random hex. Stable enough for grouping a single pipeline run. */
function newTraceId(prefix = "run") {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

/**
 * Estimate USD cost from a token-priced model. Returns null when the model is
 * unknown or unpriced (image/video tools) — callers should pass costUsd then.
 */
function estimateCostUsd(model, tokensIn = 0, tokensOut = 0) {
  const c = MODEL_COSTS[model];
  if (!c) return null;
  const cost = (tokensIn / 1e6) * c.inPerM + (tokensOut / 1e6) * c.outPerM;
  // round to 6 decimals to keep tiny per-call costs readable
  return Math.round(cost * 1e6) / 1e6;
}

/**
 * Coerce a raw span object into the canonical shape with sane defaults.
 * Unknown/empty numeric fields become null (not 0) so the viewer can tell
 * "0 tokens" apart from "not measured".
 */
function normalizeSpan(s) {
  return {
    traceId: s.traceId,
    spanId: s.spanId,
    parentSpanId: s.parentSpanId || null,
    input: scrub(s.input ?? null),
    output: scrub(s.output ?? null),
    model: s.model ?? null,
    temperature: s.temperature ?? null,
    promptVersion: s.promptVersion ?? null,
    config: scrub(s.config ?? null),
    latencyMs: s.latencyMs ?? null,
    tokensIn: s.tokensIn ?? null,
    tokensOut: s.tokensOut ?? null,
    costUsd: s.costUsd ?? null,
    status: s.status || STATUS.SUCCESS,
    error: scrub(s.error ?? null),
    stack: scrub(s.stack ?? null),
    artifacts: scrub(s.artifacts || []),
    evals: s.evals ?? null,
    startedAt: s.startedAt ?? null,
    endedAt: s.endedAt ?? null,
    metadata: scrub(s.metadata || {}),
  };
}

// Redaction — this is a PUBLIC repo and traces commit with their campaign, so
// scrub account identifiers and any secret-shaped strings before they're ever
// written. Applied at normalizeSpan (the single write choke point), so every
// span — live or logged — is clean on disk.
const REDACTIONS = [
  [/user_[A-Za-z0-9]{20,}/g, "user_REDACTED"], // Higgsfield account token in asset URLs
  [/lsv2_(pt|sk)_[A-Za-z0-9]{6,}/g, "lsv2_REDACTED"], // LangSmith key
  [/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-REDACTED"], // Anthropic key
  [/sk-[A-Za-z0-9]{20,}/g, "sk-REDACTED"], // generic OpenAI-style key
  [/AKIA[0-9A-Z]{16}/g, "AKIA-REDACTED"], // AWS access key id
];
function scrub(v) {
  if (typeof v === "string") { let s = v; for (const [re, rep] of REDACTIONS) s = s.replace(re, rep); return s; }
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = scrub(v[k]); return o; }
  return v;
}

/** One-line preview of a possibly-long value for the viewer (feature 1). */
function preview(v, max = 80) {
  if (v == null) return "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

module.exports = { STATUS, MODEL_COSTS, newTraceId, estimateCostUsd, normalizeSpan, preview, scrub };
