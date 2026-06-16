# Memory (Reflexion)

Long-term, self-improving memory. After each generation+eval run the system
**reflects** on what the evals revealed, **distills** the lessons into reusable
strategy memories, and **recalls** the relevant ones before the next campaign —
so generation behavior adapts over time instead of repeating the same mistakes.

```
generate → eval ─▶ reflect.js ─▶ reflections/<campaign>__<traceId>.json   (episodic: one per run)
                        │
                        └▶ distill ─▶ strategies.json                       (semantic: deduped, reusable)
                                          │
   next campaign ◀── retrieve.js ◀────────┘   writes campaigns/<camp>/context.md (read before generating)
```

## Files

- **`reflections/`** — episodic memory. One JSON per run: the deterministic
  signals (per-dimension eval averages, weakest/strongest, hooks used, code
  failures) **plus** the LLM's synthesized summary, what worked / underperformed,
  and proposed strategies. Full audit trail of *why* a lesson was learned.
- **`strategies.json`** — semantic memory. The distilled, deduped strategies the
  generator actually consumes. Each has a stable `id`, `guidance`, `tag`,
  `support` (how many runs backed it), `confidence`, and `evidence[]`. Repeated
  lessons **merge** (support++ , confidence↑) rather than duplicating, so the
  store stays small and sharpens over time.

## Commands

```bash
# after evals — reflect + distill (LLM call; model = REFLECT_MODEL or "sonnet")
node memory/reflect.js campaigns/<campaign-dir>

# before generating — recall the relevant strategies into context.md
node memory/retrieve.js --campaign campaigns/<campaign-dir>
node memory/retrieve.js --format health-carousel --topics "sleep,caffeine" --top 6
node memory/retrieve.js --format health-carousel --json
```

## How retrieval ranks

`support × 1.0  +  confidence × 2.0  +  (topic-keyword overlap) × 1.5`, filtered
to the campaign's format (format-agnostic strategies always qualify). Top-N are
written as a markdown block to `campaigns/<camp>/context.md`.

## Observability

Both `reflect` and `recall` are traced under the run's `TRACE_ID` (reflection
spans carry real token/cost from the LLM call). View with
`node observability/traceViewer.js campaigns/<campaign> -v`.

`memory/` is **committed** — it is the system's accumulated learning, not
disposable run output.
