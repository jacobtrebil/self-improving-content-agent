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
    input: s.input ?? null,
    output: s.output ?? null,
    model: s.model ?? null,
    temperature: s.temperature ?? null,
    promptVersion: s.promptVersion ?? null,
    config: s.config ?? null,
    latencyMs: s.latencyMs ?? null,
    tokensIn: s.tokensIn ?? null,
    tokensOut: s.tokensOut ?? null,
    costUsd: s.costUsd ?? null,
    status: s.status || STATUS.SUCCESS,
    error: s.error ?? null,
    stack: s.stack ?? null,
    artifacts: s.artifacts || [],
    evals: s.evals ?? null,
    startedAt: s.startedAt ?? null,
    endedAt: s.endedAt ?? null,
    metadata: s.metadata || {},
  };
}

/** One-line preview of a possibly-long value for the viewer (feature 1). */
function preview(v, max = 80) {
  if (v == null) return "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

module.exports = { STATUS, MODEL_COSTS, newTraceId, estimateCostUsd, normalizeSpan, preview };
