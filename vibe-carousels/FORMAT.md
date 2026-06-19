# Vibe Health carousel format

How the slide decks are defined, built, and published. Everything visual is
generated from code — there are no hand-edited image files.

## Pipeline at a glance

```
build.js  →  per-slide .html  →  render.sh (headless Chrome, 2×)  →  .png (9:16)
                                                                      ├─ Postiz → TikTok (9:16, downscaled to 1080×1920)
                                                                      └─ build_shorts.sh (ffmpeg) → .mp4 → YouTube Shorts
```

| File | Role |
|------|------|
| `build.js` | **Single source of truth.** Design system (CSS) + all deck copy. Writes one `.html` per slide. |
| `render.sh` | Screenshots each `.html` → `.png` via headless Chrome at 2× scale. |
| `build_shorts.sh` | Stitches a deck's 9:16 PNGs into a vertical MP4 with crossfades. |
| `reschedule_tt.sh` | Uploads 9:16 PNGs + schedules/refreshes the TikTok posts. |
| `schedule_ttyt.sh` | Uploads a carousel batch to TikTok + YouTube. |
| `schedule_youtube.sh` | Uploads MP4s + schedules the YouTube Shorts. |
| `CAPTIONS.md` | Per-deck captions + hashtags used when scheduling. |

## Dimensions & formats

Every deck renders 9:16 only. Chrome renders at 2× device scale, so the final
PNG is double the CSS pixel size.

| Format | Command | CSS size | Final PNG | File suffix | Used for |
|--------|---------|----------|-----------|-------------|----------|
| **9:16** | `node build.js` | 1080×1920 | 2160×3840 | `-tt` — `slide-01-tt.png` | TikTok + YouTube Shorts |

> **Why 9:16 only?** TikTok and YouTube Shorts are both vertical 9:16. Instagram
> (which wanted a 4:5 set) is retired, so the 4:5 ratio is no longer produced —
> `build.js` always emits the `-tt` 9:16 files and `render.sh` always shoots them
> at 1080×1920.

> ⚠️ **TikTok 1080p rule (must follow or the post fails).** TikTok photo mode
> **rejects images over 1080p** — the 2× master `slide-NN-tt.png` (2160×3840)
> fails with *"Video must be at least 720p, Picture must no exceed 1080p"*.
> Before scheduling to TikTok, downscale to **1080×1920**:
> `bash make_tt1080.sh <deck>` → uploads `slide-NN-tt1080.png`. YouTube (MP4) is
> unaffected; videos already ship ≥720p. See
> `config/platforms.yaml` → `platforms.tiktok.limits`.

## File / naming convention

```
vibe-carousels/
  build.js
  render.sh  build_shorts.sh  schedule_*.sh
  ai-bg/                      # AI-generated background images (768×1024)
    04-cover.png  04-cta.png  ...
  04-hit-your-protein/        # one folder per deck, keyed "<NN>-<slug>"
    slide-01-tt.html slide-01-tt.png   # 9:16 (TikTok / YouTube)
    ... slide-07 ...
  shorts/
    04-hit-your-protein.mp4   # 9:16 video built from the -tt PNGs
```

## The design system (`CSS` string in `build.js`)

Black-and-white, clean, casual. All visual tokens live in one CSS template:

| Class | What it is |
|-------|------------|
| `.slide` | The frame: `#0a0a0a` background, off-white text, 96px padding, flex column. |
| `.eyebrow` | Small uppercase label (currently unused in the header — header row was removed). |
| `.idx` | The giant ghost index number (240px, `#1c1c1c`) behind content slides. |
| `.h-cover` | Cover/CTA headline — 88px / 800 weight. |
| `.h-content` | Content-slide headline — 60px / 800. |
| `.sub` / `.body` | Supporting copy — 32px, muted grey. |
| `.hl` | The **white highlight pill** (white bg, black text) for emphasized words. |
| `.btn` | The white pill button ("Download Vibe Health →"). |
| `.kicker` | Small white label above a content headline ("Step 01", "Habit 03", …). |
| `.handle` | `@vibehealthapp`, bottom-left. |
| `.tag` | Bottom-right tagline on the CTA slide (per-deck benefit line). |
| `.slide.onimg` | Modifier for slides with an AI photo background — adds text shadows for legibility. |

## The three slide types (functions in `build.js`)

Each returns a complete HTML document for one slide.

- **`cover({ title, sub, bg })`** — slide 1, the hook. Big headline + optional
  sub + "Swipe →" and the handle. Optional photo background.
- **`content({ idx, kicker, title, body })`** — the value slides. Shows the ghost
  index number, a kicker label, a headline, and a body line.
- **`cta({ title, body, button, tag, bg })`** — last slide. Headline + body +
  pill button, with the handle (left) and the **per-deck `tag`** (right). Optional
  photo background.

### Two helpers

- **`hl("...")`** — wraps `*word*` in the highlight pill. Write copy like
  `"Aim for *30g* at breakfast"` and `30g` renders as a white pill.
- **`bgStyle(img)`** — returns the dark gradient + photo `background` CSS used by
  `.onimg` slides so text stays readable over an image.

## A deck is just data

The `decks` object maps a key (`"<NN>-<slug>"`) to `{ eyebrow, slides }`, where
`slides(E, T)` returns the array of slide-type calls:

```js
"04-hit-your-protein": {
  eyebrow: "Protein",
  slides: (E, T) => [
    cover({ title: "How to actually hit your *protein goal*.", sub: "..." }),
    content({ idx: 2, total: T, kicker: "Step 01", title: "Anchor every meal", body: "..." }),
    // ... steps 02–05 ...
    cta({ title: "Hit it *without the guesswork*.", body: "...",
          button: "Download Vibe Health →", tag: "hit your number, automatically" }),
  ],
},
```

### AI backgrounds (auto-attached)

The cover (first) and CTA (last) slides automatically get a photo background
**if** a matching file exists in `ai-bg/`:

- cover → `ai-bg/<NN>-cover.png`
- CTA   → `ai-bg/<NN>-cta.png`

Decks may also pass `bg:` explicitly inside `cover()`/`cta()` (decks 01–03 and
14–23 do this). No file, no background — the slide stays solid black.

## Copy conventions

- Brand name is always **"Vibe Health"** (never just "Vibe"). The handle stays
  `@vibehealthapp`.
- Button is always **"Download Vibe Health →"**.
- The CTA **`tag`** is a short, lowercase, benefit-focused line tied to the deck
  topic (e.g. protein → `hit your number, automatically`).
- Emphasize key words with `*asterisks*` → renders as the highlight pill.
- Keep body copy to ~30–40 words per slide.

## Rebuild commands

```bash
# 1. Generate HTML (9:16 — TikTok / YouTube)
node build.js

# 2. Render only the slides whose HTML changed
bash render.sh --stale-only      # or: bash render.sh  (re-render everything)

# 3. Rebuild the YouTube Shorts (optional; pass deck names, or omit for 04–13)
bash build_shorts.sh 04-hit-your-protein 05-the-scale-lies ...
```

> Re-rendering only updates the local PNG/MP4 files. Posts already scheduled in
> Postiz keep pointing at the media uploaded at schedule time — to push a copy
> change into the live queue you must re-upload + recreate those posts (see the
> `schedule_*.sh` / `reschedule_*.sh` scripts).

## Adding a new deck

1. Add a `"<NN>-<slug>": { eyebrow, slides }` entry to the `decks` object in
   `build.js` (7 slides is the standard: 1 cover, 5 content, 1 CTA).
2. (Optional) Drop `ai-bg/<NN>-cover.png` and `ai-bg/<NN>-cta.png` for photo
   backgrounds.
3. Add the deck's caption + hashtags to `CAPTIONS.md`.
4. Run the rebuild commands above, then schedule with the relevant
   `schedule_*.sh` script.
