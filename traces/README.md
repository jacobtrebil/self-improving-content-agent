# Traces

Append-only logs of important LLM and tool steps, one **span** per line (JSONL).
Written by [`observability/tracer.js`](../observability/tracer.js); read with
[`observability/traceViewer.js`](../observability/traceViewer.js).

## What's here

- `traces/<traceId>.jsonl` — the repo-wide stream. **Every** traced run writes
  here, campaign or not.
- A run tied to a campaign is *also* tee-written to
  `campaigns/<campaign>/traces/<traceId>.jsonl`, so each campaign carries its own
  copy of how its media was produced.
- `example-run.jsonl` — a reference run (kept for shape; not a real run).

## Span shape

```json
{
  "traceId": "run_abc123",
  "spanId": "generate_bg.09-cover",
  "input": "...",
  "output": "...",
  "model": "gpt_image_2",
  "latencyMs": 18750,
  "tokensIn": null,
  "tokensOut": null,
  "costUsd": 0.04,
  "status": "success",
  "metadata": { "format": "health-carousel", "campaignId": "..." }
}
```

`tokensIn/tokensOut` are `null` for image/video tools (credit-based, no token
model); `costUsd` is filled from the model price table for token-priced models
or passed explicitly by the caller, else `null`.

## Reading a trace

```bash
node observability/traceViewer.js traces/run_abc123.jsonl
node observability/traceViewer.js campaigns/2026-06-15-foo-batch-001          # newest run
node observability/traceViewer.js campaigns/2026-06-15-foo-batch-001 --all    # every run merged
node observability/traceViewer.js traces/run_abc123.jsonl --json              # rollup for tooling
```

## Instrumenting a new step

```js
const { Tracer } = require("./observability/tracer");
const tracer = new Tracer({ campaignId, metadata: { format } });

await tracer.span("my_step", async (span) => {
  span.input = prompt;
  span.model = "gpt_image_2";
  const out = await doWork();
  span.output = out.url;
  return out;
});
// tracer.summary() → run totals (spans, latency, tokens, cost, files)
```
