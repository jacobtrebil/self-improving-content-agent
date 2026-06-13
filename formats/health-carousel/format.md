# Health carousel

A 7-slide black-and-white typographic carousel that teaches one practical
health topic (protein, sleep, steps, water, fat loss, labels…) in a no-BS,
plain-language coach voice, ending with a Vibe Health CTA.

Runs on: Instagram feed (4:5 PNGs), TikTok photo mode (9:16 PNGs **downscaled
to 1080×1920** — see TikTok rule below), and YouTube Shorts (9:16 PNGs stitched
into an MP4 by `build_shorts.sh`).
Reference live decks: `04-hit-your-protein` … `13-stop-falling-off`.

> ⚠️ **TikTok 1080p rule.** TikTok photo mode rejects images over 1080p — the
> 2× `-tt` master (2160×3840) fails with *"Video must be at least 720p, Picture
> must no exceed 1080p"*. Before scheduling to TikTok, run
> `bash make_tt1080.sh <deck>` and upload the `slide-NN-tt1080.png` (1080×1920)
> copies. IG (4:5) and YouTube (MP4) upload their normal files. Videos must be
> ≥720p (our 1080×1920 reels already comply). Canonical: `/config/platforms.yaml`.

## Anatomy (7 slides)

| # | Type | Job |
|---|------|-----|
| 1 | `cover` | The hook. Big headline with one `*highlight*`, short sub, **monochrome AI photo background** under a dark gradient. Never a flat color card. |
| 2–6 | `content` | One idea per slide: ghost index number, short kicker label, headline, one body line with one `*highlight*`. Solid black, typographic. |
| 7 | `cta` | Payoff + pitch: headline, body that ties the topic to Vibe Health tracking, white pill button, lowercase benefit `tag`, photo background. |

## Voice

- Practical, direct, slightly contrarian ("the scale lies", "without the BS").
- Plain language; no jargon, no AI-sounding filler.
- Health claims are hedged: "may help", "can support", "designed to" — never
  guaranteed outcomes (see `/AGENTS.md`).
- Brand is always **"Vibe Health"**, handle `@vibehealthapp`, button always
  **"Download Vibe Health →"**.

## How a deck becomes posts

A deck is authored as JSON (see `schema.yaml`), then wired into the pipeline:

1. JSON spec → entry in the `decks` object in `vibe-carousels/build.js`.
2. Cover/CTA backgrounds generated via Higgsfield into `vibe-carousels/ai-bg/`
   (`<NN>-cover.png`, `<NN>-cta.png`) — auto-attached by `build.js`.
3. `node build.js` + `FMT=tt node build.js` → HTML in `vibe-carousels/<NN>-<slug>/`.
4. `bash render.sh --stale-only` → PNGs (4:5 no suffix, 9:16 `-tt`).
5. `bash build_shorts.sh <key>` → `shorts/<key>.mp4` for YouTube.
6. Caption + hashtags appended to `vibe-carousels/CAPTIONS.md`.
7. Scheduling is a separate, explicitly human-approved step (`schedule_*.sh`).

Full pipeline reference: `vibe-carousels/FORMAT.md`. All rendered media is
gitignored — only code, config, and copy are committed.
