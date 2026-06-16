# Content Harness Instructions

This repo generates Vibe Health short-form content for TikTok, Instagram Reels, YouTube Shorts, and carousel posts.

# Core workflow 

For any generation task (e.g. "generate 10 posts in format X"):

1. **Create a campaign first.** Run
   `campaigns/new-campaign.sh <format> <slug> --count <N>` to scaffold
   `campaigns/<YYYY-MM-DD>-<slug>-batch-<NNN>/`. Never generate posts loose —
   every batch lives in its own campaign folder. See `/campaigns/README.md`.
2. Read the relevant format folder in `/formats/<format>` (`format.md`,
   `prompt.md`, `schema.yaml`, `validation.md`, `examples/`).
3. Fill in the campaign `brief.md` (goal, the N items, channels, cadence).
4. Generate one spec per item into the campaign's `generated/` folder.
5. Validate each against `validation.md`. Passing specs → `approved/`,
   failing specs → `rejected/`.
5b. **Run evals — every time, right after validation.**
   `node evals/run-evals.js campaigns/<camp>` runs code-based checks (slide
   count, hook, CTA, caption limit, schema, image prompts) **and** an
   LLM-as-judge on a *different* model (Sonnet via headless `claude`, since the
   generator is Opus) scoring hook strength, clarity, audience fit, novelty,
   brand fit, and predicted performance. Scores are traced and written to
   `campaigns/<camp>/evals/`. See `/evals/README.md`. Use `--no-judge` for a
   fast code-only pass. A code-eval FAIL is a render blocker; low judge scores
   are a quality signal to revise, not a hard block.
6. **Render automatically — do NOT ask for approval.** Generating AI
   backgrounds and rendering are always safe (they cost only Higgsfield credits
   and local time), so once specs are approved, run the whole pipeline without
   pausing:
   - Carousels: `node vibe-carousels/gen-bg-from-specs.js campaigns/<camp>`
     (cover/CTA backgrounds), then
     `node vibe-carousels/build.js && FMT=tt node vibe-carousels/build.js`
     (writes slide HTML — auto-picks up approved campaign specs), then
     `bash vibe-carousels/render.sh --stale-only` (PNGs, 4:5 + 9:16), then
     `bash vibe-carousels/build_shorts.sh <keys>` (YouTube MP4s).
   - Reels: `node vibe-carousels/build_transformations.js`.
   - Symlink the rendered deck folders into the campaign's `rendered/`.
7. **Scheduling is the ONLY step that needs explicit approval.** Never schedule,
   reschedule, or delete posts unless the user asks. When you do, log post IDs to
   `scheduled.tsv`; later record metrics in `results.tsv`.

# Source of truth 

- Brand rules: `/config/brand.yaml`
- Platform contraints: `/config/platforms.yaml`
- Format definitions: `/formats/<format>/format.md`
- Campaign-specific goals: `/campaigns/<campaign>/brief.md` (structure + lifecycle in `/campaigns/README.md`)

# Tracing & observability

Every important LLM/tool step is wrapped with a tracer so each campaign carries a
record of how its media was produced. See `/observability/` (`tracer.js`,
`traceTypes.js`, `traceViewer.js`) and `/traces/README.md`.

- The generation scripts (`gen-bg-from-specs.js`, `build_transformations.js`) are
  already instrumented — each Higgsfield/render step emits one JSONL span
  (`traceId`, `spanId`, `input`, `output`, `model`, `latencyMs`, `tokensIn`,
  `tokensOut`, `costUsd`, `status`, `metadata.{format,campaignId}`).
- Spans are tee-written to `traces/<traceId>.jsonl` (repo-wide stream) **and**
  `campaigns/<campaign>/traces/<traceId>.jsonl` when a campaign is in scope.
- Pass the campaign so reels get logged too:
  `node vibe-carousels/build_transformations.js --campaign <campaign-dir> <keys>`.
- Review a run: `node observability/traceViewer.js campaigns/<campaign>`. The
  viewer renders a parent/child tree with token/cost and eval scores; flags:
  `-v` (input/output preview, config, artifact links), `--errors` (error +
  stack), `--evals` (per-deck code/judge table), `--all` (all runs), `--json`
  (rollup), filters `--format/--model/--status/--span/--campaign`, scan every
  campaign with target `campaigns`, and `--compare <A> <B>` for two runs.
- Eval scores (from `evals/run-evals.js`) are traced as nested
  `eval.<key> → eval_code/eval_judge` spans and attached to each span's `evals`
  field with artifact links back to the spec + background images.
- Wrapping a new step: `const { Tracer } = require("../observability/tracer")`,
  then `await tracer.span("step_id", async (span) => { span.input=…; span.model=…;
  const r = await work(); span.output=…; return r })`. It records `status:"error"`
  and re-throws if the step throws.

# Media & IDs are never committed

- All media (PNG/MP4/MOV/WEBP) is gitignored. Bulk assets and finished renders
  live in `../slideshows-media/`, reached via gitignored symlinks
  (`Vibe Health Assets/`, `vibe-carousels/reels`, `vibe-carousels/shorts`).
  Render outputs next to deck HTML are local-only and regenerable.
- Postiz channel IDs live only in `config/posting.local.yaml` (gitignored).
  In scripts, resolve them with `vibe-carousels/channel_id.sh` — never hardcode
  an integration or post id in a tracked file.

## Rules

- Do not make unsupported medical claims.
- Keep hooks short and native to TikTok/IG.
- Favor curiosity, transformation, and concrete visual payoff.
- Never reuse the exact same hook twice in one campaign.
- Avoid cringe AI-sounding phrasing.
- Use plain language.
- For health content, use “may help,” “can support,” or “designed to,” not guaranteed outcomes.

# Before finishing 

Then summarize:
- Files changed
- Posts generated
- Any validation failures
- Next recommended action