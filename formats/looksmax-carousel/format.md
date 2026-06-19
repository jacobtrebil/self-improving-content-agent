# Looksmax carousel

A 7-slide black-and-white typographic carousel that takes one appearance goal
(jawline, clear skin, under-eyes, hair, leaner face, posture, debloating,
glow) and reframes it as a health outcome — "the real fix is sleep, food,
water, steps" — ending with a Vibe Health CTA.

Runs on: TikTok photo mode (9:16 PNGs **downscaled to 1080×1920** — see TikTok
rule below) and YouTube Shorts (9:16 PNGs stitched into an MP4 by
`build_shorts.sh`). Instagram is retired — no 4:5 set is produced.
Reference live decks: `01-glowup-is-health`, `02-looksmaxing-mistakes`,
`14-sharpen-jawline` … `23-looksmax-tier-list`.

> ⚠️ **TikTok 1080p rule.** TikTok photo mode rejects images over 1080p — the
> 2× `-tt` master (2160×3840) fails with *"Video must be at least 720p, Picture
> must no exceed 1080p"*. Before scheduling to TikTok, run
> `bash make_tt1080.sh <deck>` and upload the `slide-NN-tt1080.png` (1080×1920)
> copies. YouTube (MP4) uploads its normal file. Videos must be ≥720p (our
> 1080×1920 reels already comply). Canonical: `/config/platforms.yaml`.

## The angle (what makes this format distinct)

Looksmaxing content earns attention with the aesthetic goal, then delivers
honest health levers. The promise is always "your habits are hiding/revealing
this", never cosmetic procedures, products, or genetics cope. The CTA works
because Vibe Health tracks exactly those levers.

## Anatomy (7 slides)

| # | Type | Job |
|---|------|-----|
| 1 | `cover` | The hook: aesthetic payoff + a contrarian reframe, with one `*highlight*`. **Monochrome beauty-portrait background** under a dark gradient. Never a flat color card. |
| 2–6 | `content` | One lever per slide: ghost index number, action-label kicker ("Lean out", "Debloat", "Overnight"), headline, one body line with one `*highlight*`. Solid black. |
| 7 | `cta` | Restated payoff + the Vibe Health features that track the levers, white pill button, lowercase benefit `tag`, beauty-portrait background. |

## Voice & guardrails

- Confident, direct, a little edgy ("Kill your *under-eye bags*") — but never
  shaming, never hopeless-without-the-app, never targeting insecurity for its
  own sake. The emotional arc is *this is more in your control than you think*.
- Honest about effect sizes: real-but-minor levers are labeled as such
  ("Real — if minor"). No "facial restructuring" promises, no surgery or
  pharma advice, no guaranteed outcomes — hedge with "may help / can support".
- Plain language. Community terms ("looksmaxing", "glow-up", "mewing") are
  fine as hooks; deeper community jargon is not.
- Brand is always **"Vibe Health"**, handle `@vibehealthapp`, button always
  **"Download Vibe Health →"**.

## How a deck becomes posts

Identical pipeline to the health carousel — JSON spec (see `schema.yaml`) →
`decks` entry in `vibe-carousels/build.js` → Higgsfield backgrounds in
`ai-bg/` (`<NN>-cover.png` / `<NN>-cta.png`, generated in the style of
`vibe-carousels/ai-bg/gen-bg.sh`) → `node build.js` (9:16)
→ `render.sh` → `build_shorts.sh` → caption in `CAPTIONS.md`. Scheduling is a
separate, explicitly human-approved step. Full reference:
`vibe-carousels/FORMAT.md`. All rendered media is gitignored.
