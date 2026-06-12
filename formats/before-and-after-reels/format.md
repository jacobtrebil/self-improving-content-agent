# Before & after reel

A 12–22 second 9:16 video reel (1080×1920, 30fps MP4) telling one person's
believable transformation story: hook → before → reveal → after → app payoff →
branded end card. Unlike the carousel formats, the deliverable is a single
rendered video assembled from AI-generated stills/footage and HTML overlay
frames — there are no slides to swipe.

Runs on: Instagram Reels, TikTok (video), YouTube Shorts.
Reference finals: `vibe-carousels/reels/vibe-health-reel-01..10.mp4`
(11s transformation cuts also exist in `vibe-carousels/<NN>-transformation-*/`).

## The promise (and its limits)

The story is always *ordinary person + consistent habits + tracking = visible,
believable progress*. The transformation is modest and earned — "90 days of
showing up", not "shredded in 3 weeks". The app is the mechanism (one daily
score that shows what to fix), never a magic cause.

## Anatomy (segment timeline)

| Segment | Length | Job |
|---------|--------|-----|
| `hook` | 1.5–3s | Stop the scroll. Text over a **real visual** — the before photo, candid footage, or a recognizable UI mockup. **Never a flat color card** (quiz-card hooks are the one accepted exception). |
| `before` | 2–4s | The starting point, with empathy not pity ("Day 1. No plan. No energy."). Before still, optionally given subtle motion. |
| `transformation` | 2–4s | The reveal: hard cut or crossfade before → after of the **same person, same framing**. This is the payoff frame — earn it. |
| `after` | 2–4s | Life on the other side ("Day 90. Same guy. New habits."). After still or casual footage. |
| `app_payoff` | 2–4s | The mechanism: real app UI (Health Score screen, coach chat) tying the change to tracking sleep, food, water & steps. |
| `end_card` | 2–3s | Brand close: mint gradient (#f6fcf8→#cdeeda), broccoli icon, black wordmark, black CTA pill ("Download Vibe Health"). Always last. |

5–7 segments total; `hook` first, `end_card` last. On-screen text is short
(≤ 12 words per segment), high-contrast over a scrim.

## Asset generation (Higgsfield — routing lives in `/config/models.yaml`)

- **Before still** — `gpt_image_2`, 9:16: amateur phone-photo realism (grainy,
  ordinary body, candid posture). Never studio-lit or fitness-model glossy.
- **After still** — `nano_banana_2` with `--image <before>` so it is the EXACT
  same person, location, and framing. Believable 90-day result: visibly
  leaner/healthier, still has natural soft spots. Returns 2048×2048 — center-
  crop to 9:16.
- **Footage** — `seedance_2_0` with `--start-image`: casual handheld phone
  video. MUST pass `--aspect_ratio 9:16 --resolution 1080p` (defaults are
  16:9 720p). Output is 24fps; conform to 30fps.
- **App UI** — HTML mockups in the established kit: light iMessage chat with
  broccoli avatar, notification cards with `icon-rounded.png`, score screens.

## Assembly pipeline

1. Spec JSON (see `schema.yaml`) → `campaigns/<campaign>/generated/<key>.json`.
2. Generate assets into the private media folder
   (`../slideshows-media/reels/<key>/`); nothing binary is ever committed.
3. Overlay/text frames: HTML at 1080×1920 → headless Chrome screenshot
   (`--default-background-color=00000000` for transparent overlays).
4. ffmpeg per segment (30fps, libx264 crf 18, yuv420p) → concat via list.txt →
   mux the chosen audio track with `-shortest`.
   Gotchas (zoompan frame multiplication, sed `&`, zsh nomatch) are documented
   in `/config/models.yaml` under `rendering:`.
5. Final lands at `vibe-carousels/reels/<key>.mp4` (symlinked private media).
6. Pre-publish: run the Higgsfield Virality Predictor (`brain_activity`) on the
   finished MP4 and review hook/retention scores.
7. Caption + hashtags into `vibe-carousels/CAPTIONS.md`. Scheduling stays a
   separate, explicitly human-approved step.

## Voice

Plain, warm, second-person-adjacent storytelling ("He tried everything").
No hype words, no shame, no guarantees — outcomes are "may help / can
support / designed to" territory, and timeframes are honest. Brand is always
**"Vibe Health"**, handle `@vibehealthapp`.
