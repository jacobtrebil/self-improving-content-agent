# Evals

Quality gates that run on a campaign's specs **every time, right after
validation** (see `AGENTS.md` step 5b). Two kinds:

## 1. Code-based evals — `code-evals.js`

Deterministic, fast, no network. Each returns `{ name, pass, score, detail }`:

| check | passes when |
|---|---|
| `slide_count` | deck has 7 slides (or 9 for a list deck) |
| `has_hook` | first slide is a `cover` with a `*highlighted*` title + a sub |
| `has_cta` | last slide is a `cta` with the exact `Download Vibe Health →` button |
| `caption_under_limit` | caption is 3 paragraphs and ≤ 2200 chars |
| `follows_json_schema` | key/theme/eyebrow/hashtags(10, `#vibehealthapp` last)/youtube_title/bg_prompts + slide order |
| `has_image_prompts` | `bg_prompts.cover` + `.cta` present, in the house monochrome style |

A code-eval **FAIL is a render blocker**.

## 2. LLM-as-judge — `llm-judge.js`

Subjective scores from a **different model than the generator** (generator is
Opus via the agent; judge defaults to **Sonnet**) so a model never grades its
own work. Runs through the headless Claude Code CLI
(`claude -p … --model sonnet --output-format json`) — no API key needed, and the
JSON envelope returns real token usage + `total_cost_usd`, so judge spans carry
true cost data. Scores 1–5 on:

`hook_strength` · `clarity` · `audience_fit` · `novelty` · `brand_fit` · `predicted_performance`

Low judge scores are a **quality signal to revise**, not a hard block.

## Running

```bash
node evals/run-evals.js campaigns/<campaign-dir>                 # code + judge
node evals/run-evals.js campaigns/<campaign-dir> --no-judge      # fast, code only
node evals/run-evals.js campaigns/<campaign-dir> --judge-model haiku --audience "…"
```

## Output

- `campaigns/<campaign>/evals/<key>.json` — full per-deck report (every check,
  judge scores + rationales, artifact links).
- `campaigns/<campaign>/evals/summary.tsv` — one row per deck.
- Traced as nested `eval.<key> → eval_code.<key> / eval_judge.<key>` spans
  (shared `TRACE_ID` with the rest of the run). View with:

```bash
node observability/traceViewer.js campaigns/<campaign> --evals
```
