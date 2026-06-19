# Vibe Health Content Harness

**An agentic content system with the parts most agent demos skip: tracing, evals, and a memory that learns from them.**

A coding agent runs the whole loop — recall what worked before, generate short-form
content for [Vibe Health](https://vibehealthapp.com) (an AI health coach app),
score it, render it, and reflect on the results so the next batch is better.
Every visual is produced from code and config; nothing is hand-designed.

What makes it more than a generation script is the instrumentation wrapped around it:

- **Observability** — every LLM/tool step is traced to JSONL with latency, tokens, cost, inputs/outputs, and parent/child structure: generation, evals, reflection, AI image gen, HTML/PNG/video rendering, **and** the Postiz scheduling + analytics calls (bash steps included, via a transparent `postiz()` wrapper).
- **Evals** — each output is graded by deterministic code checks *and* an LLM-as-judge running on a **different model than the generator** (Opus writes, Sonnet grades).
- **Reflexion memory** — after every run the system reflects on its eval scores, distills reusable strategies, and recalls them before the next campaign. The loop closes.

It runs on the headless Claude Code CLI — **no API key, no separate inference service** — and treats cost, reproducibility, and guardrails as first-class.

## Demo

<!-- ───────────────────────────────────────────────────────────────────────────
  GitHub plays video from an UPLOADED-ASSET url, not from a committed file path.
  To make the player below work:
    1. On GitHub, open a new Issue (or draft a Release) in this repo.
    2. Drag  vibe-health-harness-demo-wide.mp4  into the comment box; wait for upload.
    3. Copy the resulting  https://github.com/user-attachments/assets/<id>  url.
    4. Replace BOTH placeholders below with that url. (You can discard the issue.)
  No need to commit the mp4 — this keeps the repo lean (it stays gitignored).
──────────────────────────────────────────────────────────────────────────── -->

https://github.com/user-attachments/assets/REPLACE_WITH_UPLOADED_VIDEO_URL

<sub>▶︎ 34-second walkthrough — generate a batch, eval it, inspect the trace, reflect into memory. <em>(If you don't see a player yet, the upload URL above hasn't been filled in — see the comment in the source.)</em></sub>

---

## The loop

```
            ┌──────────────────────────  memory/strategies.json  ◄───────────────┐
   recall   │  distilled, deduped strategies (support↑ as a lesson recurs)        │  distill
            ▼                                                                      │
 ① create → ② brief → ③ RECALL → ④ generate → ⑤ validate → ⑥ EVAL → ⑦ REFLECT → ⑧ render → ⑨ schedule → ⑩ measure
                       context.md   Opus agent   schema     code +     LLM synth   Chrome +    Postiz       Postiz
                       (learned     writes specs hard-fails  Sonnet     → strategy  ffmpeg      (human-      analytics
                        strategies)                          judge      memory                  gated)
            └──────────────────  every step streamed to a JSONL trace (observability/)  ──────────────────┘
```

Steps ③ **recall**, ⑥ **eval**, and ⑦ **reflect** run on *every* campaign — that's
what turns a one-shot generator into a system that adapts. `AGENTS.md` is the
canonical instruction set the agent follows; `CLAUDE.md` points Claude Code at it.

---

## 1. Observability (`observability/`)

Every LLM call and tool step is wrapped in a tracer that appends one **span** per
step as JSONL — tee-written to a repo-wide stream *and* the campaign that produced
it, so each campaign ships with a full record of how it was made.

```ts
{ traceId, spanId, parentSpanId,           // structure
  input, output, model, temperature,        // what ran
  tokensIn, tokensOut, costUsd, latencyMs,   // economics
  status, error, stack,                      // failures
  artifacts: [{label, path|url}],            // links to outputs
  evals: { code, judge },                    // scores attached to the span
  promptVersion, config, metadata }
```

The viewer renders the run as a tree and supports preview, error+stack, eval
scores, artifact links, config, filtering, and **A/B run comparison**:

```bash
node observability/traceViewer.js campaigns/<campaign>            # tree + token/cost + eval column
node observability/traceViewer.js campaigns/<campaign> -v          # input/output preview, config, artifacts
node observability/traceViewer.js campaigns/<campaign> --evals      # per-deck code + judge scores
node observability/traceViewer.js campaigns/<campaign> --errors     # error message + stack trace
node observability/traceViewer.js campaigns --status error --all    # filter across every campaign
node observability/traceViewer.js --compare <campA> <campB>         # side-by-side rollup with deltas
```

The JSONL trace is the source of truth and works offline with zero dependencies.
A **LangSmith** exporter ships the same spans to the hosted UI when you want it —
local-first by design, the network service is never on the generation path:

```bash
cp .env.example .env   # add LANGSMITH_API_KEY (gitignored; auto-loaded)
node observability/export-to-langsmith.js campaigns/<campaign>   # → LangSmith project (idempotent)
```

```
span                           st model              ms       in      out     usd       eval
generate_spec.34-morning-light • claude-opus-4-8     ·        ·       ·       ·
generate_bg.34-cover           • gpt_image_2         130723   ·       ·       ·
eval.34-morning-light          • ·                   11204    ·       ·       ·         J 4.33/5
  eval_code.34-morning-light   • ·                   0        ·       ·       ·         C 6/6
  eval_judge.34-morning-light  • claude-sonnet-4-6   11201    25932   295     0.0649    J 4.33/5
reflect.<campaign>             • claude-sonnet-4-6   29231    26014   1293    0.0805
─ 31 spans: 31 ok · $0.33 · code 100% pass · judge 4.3/5
```

## 2. Evals (`evals/`) — run on every batch

**Code-based** (deterministic, free, a FAIL blocks render): slide count, real
hook, exact CTA button, caption length, JSON-schema conformance, required image
prompts.

**LLM-as-judge** (subjective quality): hook strength, clarity, audience fit,
novelty, brand fit, predicted performance — scored 1–5 with rationales. The judge
runs on **a different model than the generator** so nothing grades its own work,
and that's *enforced* — a guard hard-fails if the judge model family matches the
generator's:

```
✗ judge model "opus" is the same family as the generator "claude-opus-4-8".
  The LLM-as-judge must be a DIFFERENT model than the one that wrote the specs.
```

Because it goes through the Claude Code CLI's JSON envelope, judge spans carry
**real token usage and cost** — no API key, no estimation.

```bash
node evals/run-evals.js campaigns/<campaign>              # code + judge, traced, scores written to evals/
node evals/run-evals.js campaigns/<campaign> --no-judge   # fast code-only pass
```

## 3. Reflexion memory (`memory/`) — learns across campaigns

```
generate → eval ─▶ reflect.js ─▶ reflections/<run>.json        (episodic: one per run)
                       └▶ distill ─▶ strategies.json            (semantic: deduped, reusable)
                                         └▶ retrieve.js ─▶ campaigns/<next>/context.md  (recalled before generating)
```

After evals, `reflect.js` computes the weak/strong dimensions, hands the judge's
rationales to an LLM, and distills the lessons into `strategies.json`. Repeated
lessons **merge by stable id** — `support` and `confidence` rise rather than
duplicating — so the store stays small and sharpens over time. `retrieve.js` ranks
by `support × confidence × topic-overlap` and writes the next campaign's `context.md`.

A real strategy the system learned (its judge kept scoring novelty 3/5):

> **[novelty] Pick the second-order mechanism, not the mainstream angle** — not
> "electrolytes hydrate you" but "your kidneys dump sodium when cortisol spikes,
> which is why stress dehydrates faster than heat." *(support 1, confidence 0.92)*

---

## The content pipeline

The substance underneath the instrumentation. Everything visual is built from code:

```
config/ (brand, platforms, models, posting)
   │
   ▼
generate specs ─► HTML frames ─► headless Chrome ─► PNG slides (9:16)
   │                  └─► ffmpeg ─► 9:16 reels & shorts (30fps, 1080×1920)
   └─► Higgsfield (GPT Image 2 / Nano Banana / Seedance) ─► photoreal people,
       before/after pairs, image-to-video footage
```

- **Hooks are sacred** — the opening frame is always a real visual (photo, footage, UI mockup), never a flat color card.
- **People look real** — amateur-phone-photo aesthetic, believable bodies and progress, never AI-glossy.
- **Vertical-native** — every deck renders 9:16 for TikTok and YouTube Shorts (Instagram is retired, so the old 4:5 set is no longer produced).
- **Publishing is a human call** — the agent generates, evals, and renders freely, but never schedules a post unless explicitly asked.

## Repo layout

| Path | What it is |
|------|------------|
| `AGENTS.md` / `CLAUDE.md` | Canonical agent instructions; Claude Code entry point |
| `config/` | `brand.yaml`, `platforms.yaml`, `models.yaml`, `posting.yaml` — single source of truth |
| `formats/` | Per-format `schema.yaml` + `validation.md` + examples; `validate.js` (uniqueness/dedup against the whole corpus) |
| `campaigns/` | The unit of work: brief → specs → approved → **evals/** → **traces/** → rendered |
| **`observability/`** | `tracer.js`, `traceTypes.js`, `traceViewer.js`, `log-span.js` |
| **`evals/`** | `code-evals.js`, `llm-judge.js`, `run-evals.js` |
| **`memory/`** | `reflect.js`, `retrieve.js`, `strategies.json`, `reflections/` |
| `traces/` | Repo-wide JSONL trace stream |
| `vibe-carousels/` | Deck sources (HTML/JS) + build/render/schedule scripts |
| `dashboard/` | Pulls Postiz analytics, segments performance by format & account |

## Engineering decisions a reviewer might ask about

- **Determinism where it counts.** Code evals, schema validation, and rendering
  are deterministic and free; LLM calls are reserved for the genuinely subjective
  (judging, reflection) and are isolated, traced, and priced.
- **Self-grading bias is designed out.** Generator and judge are different models,
  enforced in code, not convention.
- **Reproducible & inspectable.** A single `TRACE_ID` threads one campaign across
  every script; the trace and eval reports commit *with* the campaign, so any run
  is auditable after the fact.
- **Cost is a feature, not an afterthought.** Real per-call cost is captured from
  the CLI envelope and rolled up per run and per campaign.
- **No secrets, no media in git.** Account IDs and all media live outside the repo
  (see below); everything tracked is regenerable.
- **Plain Node, no framework.** The observability + evals + memory layer is
  ~1,400 lines of dependency-free CommonJS (Node built-ins only) — easy to read,
  port, or graft onto another agent.

## Honest limitations

- The **generator is the interactive agent itself** (Claude Code), so its
  spec-writing spans are logged but *not* token-metered — only the metered LLM
  calls (judge, reflection) carry real token counts. Image generation is
  credit-based, so its `costUsd` is null by design.
- Memory is **local files**, not a vector store; retrieval is keyword + support
  ranking. Fine at this scale, intentionally swappable.
- LLM evals and reflection depend on the headless `claude` CLI being authenticated.

## Private files (not in this repo)

No media and no account IDs are committed.

- **`../slideshows-media/`** — sibling folder with all media (brand assets,
  finished reels/shorts, archives), reached via gitignored symlinks. Per-deck PNGs
  and `ai-bg/` backgrounds are render outputs — local-only and regenerable.
- **`config/posting.local.yaml`** — real Postiz channel IDs. Scripts resolve them
  by key via `vibe-carousels/channel_id.sh`; recreate from `postiz integrations:list`.

On a fresh clone: restore `../slideshows-media/`, recreate the symlinks, and write
`config/posting.local.yaml` — everything else regenerates.

## Requirements

- Node.js, ffmpeg, Google Chrome (headless rendering)
- Headless [Claude Code CLI](https://claude.com/claude-code) — drives generation, judging, and reflection (no API key needed)
- [Higgsfield CLI](https://higgsfield.ai) — AI image/video generation
- [Postiz CLI](https://postiz.com) — post scheduling

---

*Built solo as a working system, not a demo — the observability, evals, and memory
exist because they're what make an agent pipeline trustworthy in production.*
