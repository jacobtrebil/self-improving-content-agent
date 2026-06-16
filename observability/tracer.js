// Tracer — wraps important LLM/tool steps and appends one JSONL line per step.
//
// A run's spans are tee-written to two places so we get both a global stream
// and a per-campaign record:
//   1. traces/<traceId>.jsonl                          (always — the repo-wide log)
//   2. campaigns/<campaign>/traces/<traceId>.jsonl      (when metadata.campaignId
//                                                         resolves to a campaign)
//
// Usage:
//   const { Tracer } = require("../observability/tracer");
//   const tracer = new Tracer({ campaignId: "2026-06-15-foo-batch-001",
//                               metadata: { format: "health-carousel" } });
//
//   const url = await tracer.span("generate_bg", async (span) => {
//     span.input = prompt;
//     span.model = "gpt_image_2";
//     const out = await callHiggsfield(prompt);   // do the work
//     span.output = out.url;
//     span.costUsd = out.costUsd;                  // optional, when known
//     return out.url;                              // returned to the caller
//   }, { metadata: { which: "cover" } });
//
// The callback receives a mutable `span` it fills in (input/output/model/
// tokens/cost). The tracer stamps timing + status and writes the line whether
// the callback resolves or throws (status "error" on throw, then re-throws).

const fs = require("fs");
const path = require("path");
const {
  STATUS,
  newTraceId,
  estimateCostUsd,
  normalizeSpan,
} = require("./traceTypes");

const REPO = path.join(__dirname, "..");
const TRACES_DIR = path.join(REPO, "traces");
const CAMPAIGNS_DIR = path.join(REPO, "campaigns");

// Resolve a campaignId (folder name or path) to its traces/ dir, or null if it
// isn't an existing campaign. Accepts "campaigns/<name>" or just "<name>".
function campaignTracesDir(campaignId) {
  if (!campaignId) return null;
  const name = path.basename(campaignId);
  const dir = path.join(CAMPAIGNS_DIR, name);
  if (!fs.existsSync(dir)) return null;
  return path.join(dir, "traces");
}

function appendLine(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + "\n");
}

class Tracer {
  /**
   * @param {object} opts
   * @param {string} [opts.traceId]    reuse an id to group spans across files
   * @param {string} [opts.campaignId] campaign folder name — enables per-campaign log
   * @param {object} [opts.metadata]   merged into every span's metadata (e.g. { format })
   * @param {boolean}[opts.quiet]      suppress the per-span console line
   */
  constructor({ traceId, campaignId, metadata = {}, quiet = false } = {}) {
    // TRACE_ID env lets several scripts in one pipeline share a single run id.
    this.traceId = traceId || process.env.TRACE_ID || newTraceId();
    this.campaignId = campaignId || metadata.campaignId || null;
    this.baseMeta = { ...metadata };
    if (this.campaignId) this.baseMeta.campaignId = path.basename(this.campaignId);
    this.quiet = quiet;
    this.spans = [];

    this.targets = [path.join(TRACES_DIR, `${this.traceId}.jsonl`)];
    const campDir = campaignTracesDir(this.campaignId);
    if (campDir) this.targets.push(path.join(campDir, `${this.traceId}.jsonl`));
  }

  /**
   * Run `fn` as a traced span. `fn` receives `(rec, child)`:
   *   - `rec`   a mutable record to fill in (input/output/model/tokens/cost/…)
   *   - `child` a function `(id, fn, opts) => Promise` that opens a nested span
   *             whose parentSpanId is this span. Use it for parent/child nesting
   *             (feature 4) — it's explicit, so it stays correct even when many
   *             spans run concurrently (a shared "current span" stack would not).
   * Returns whatever `fn` returns.
   * @param {string} spanId
   * @param {(rec: object, child: Function) => any} fn
   * @param {object} [opts] { metadata, parentSpanId }
   */
  async span(spanId, fn, opts = {}) {
    const startedAt = new Date().toISOString();
    const t0 = process.hrtime.bigint();
    const rec = {
      traceId: this.traceId,
      spanId,
      parentSpanId: opts.parentSpanId || null,
      metadata: { ...this.baseMeta, ...(opts.metadata || {}) },
    };
    const child = (id, cfn, copts = {}) => this.span(id, cfn, { ...copts, parentSpanId: spanId });
    try {
      const result = await fn(rec, child);
      rec.status = rec.status || STATUS.SUCCESS;
      return result;
    } catch (err) {
      rec.status = STATUS.ERROR;
      rec.error = (err && err.message) || String(err);
      rec.stack = (err && err.stack) || null; // full stack trace (feature 2)
      throw err;
    } finally {
      rec.startedAt = startedAt;
      rec.endedAt = new Date().toISOString();
      rec.latencyMs = Number((process.hrtime.bigint() - t0) / 1000000n);
      // Fill cost from the token model if the caller didn't set it explicitly.
      if (rec.costUsd == null && rec.model) {
        rec.costUsd = estimateCostUsd(rec.model, rec.tokensIn || 0, rec.tokensOut || 0);
      }
      this._write(normalizeSpan(rec));
    }
  }

  /** Log an already-completed step (sync work, or when span() doesn't fit). */
  record(span) {
    const rec = normalizeSpan({
      traceId: this.traceId,
      startedAt: span.startedAt || new Date().toISOString(),
      endedAt: span.endedAt || new Date().toISOString(),
      ...span,
      metadata: { ...this.baseMeta, ...(span.metadata || {}) },
    });
    if (rec.costUsd == null && rec.model) {
      rec.costUsd = estimateCostUsd(rec.model, rec.tokensIn || 0, rec.tokensOut || 0);
    }
    this._write(rec);
  }

  _write(rec) {
    this.spans.push(rec);
    for (const file of this.targets) appendLine(file, rec);
    if (!this.quiet) {
      const mark = rec.status === STATUS.SUCCESS ? "•" : rec.status === STATUS.ERROR ? "✗" : "–";
      const cost = rec.costUsd != null ? ` $${rec.costUsd}` : "";
      console.log(`[trace ${this.traceId}] ${mark} ${rec.spanId} ${rec.latencyMs}ms${cost}`);
    }
  }

  /** Aggregate totals for the run so far. */
  summary() {
    const sum = (k) => this.spans.reduce((a, s) => a + (s[k] || 0), 0);
    return {
      traceId: this.traceId,
      campaignId: this.campaignId,
      spans: this.spans.length,
      ok: this.spans.filter((s) => s.status === STATUS.SUCCESS).length,
      failed: this.spans.filter((s) => s.status === STATUS.ERROR).length,
      latencyMs: sum("latencyMs"),
      tokensIn: sum("tokensIn"),
      tokensOut: sum("tokensOut"),
      costUsd: Math.round(sum("costUsd") * 1e6) / 1e6,
      files: this.targets,
    };
  }
}

module.exports = { Tracer };
