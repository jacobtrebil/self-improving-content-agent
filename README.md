# Vibe Health Content Harness

An agent-driven content pipeline that generates short-form marketing content for
[Vibe Health](https://vibehealthapp.com) — an AI health coach app — across
TikTok, Instagram Reels, YouTube Shorts, and carousel posts.

Everything visual is generated from code and config: slide decks are built from
a single design-system script, reels are assembled from HTML-rendered frames and
AI-generated footage, and publishing is scheduled through Postiz.

## How it works

```
config/ (brand, platforms, models, posting rules)
   │
   ▼
generate ──► HTML frames ──► headless Chrome ──► PNG slides / video segments
   │              │
   │              └─► ffmpeg ──► 9:16 reels & shorts (30fps, 1080×1920)
   │
   └─► Higgsfield (GPT Image 2 / Nano Banana / Seedance) for photoreal
       people, before/after pairs, and image-to-video footage
   │
   ▼
validate ──► render ──► (only when explicitly asked) schedule via Postiz
```

The harness is designed to be driven by a coding agent: `AGENTS.md` is the
canonical instruction set, `CLAUDE.md` points Claude Code at it, and every
format/campaign carries its own local instructions.

## Repo layout

| Path | What it is |
|------|------------|
| `AGENTS.md` | Canonical agent instructions — core workflow and content rules |
| `CLAUDE.md` | Claude Code entry point (defers to `AGENTS.md`) |
| `config/brand.yaml` | Brand assets, colors, voice, and visual rules (hooks, realism) |
| `config/platforms.yaml` | Per-platform specs: ratios, dimensions, codecs, settings |
| `config/models.yaml` | AI model routing, prompt styles, and render-pipeline gotchas |
| `config/posting.yaml` | Scheduling policy, channels, cadence, caption rules |
| `formats/` | Format definitions (`format.md`, `schema.yaml`, `validation.md`) |
| `Vibe Health Assets/` | Symlink into the private media folder (brand assets) — see below |
| `vibe-carousels/` | Carousel deck sources (HTML/JS) and the build/schedule scripts |

## Private files (not in this repo)

No media and no account IDs are committed. Two things live outside git:

- **`../slideshows-media/`** — a sibling folder holding all media: source brand
  assets (`assets/`), finished reels and shorts, and archives. The repo reaches
  it through gitignored symlinks (`Vibe Health Assets`, `vibe-carousels/reels`,
  `vibe-carousels/shorts`, …), so scripts use the same paths as before.
  Per-deck slide PNGs and `ai-bg/` backgrounds are render outputs — they stay
  next to their HTML sources locally but are gitignored, and can be regenerated
  with `render.sh` / `gen-bg.sh`.
- **`config/posting.local.yaml`** — real Postiz channel IDs, flat `key: id`.
  Tracked scripts look IDs up by key via `vibe-carousels/channel_id.sh`.
  Recreate the file from `postiz integrations:list` (keys documented in
  `config/posting.yaml`).

On a fresh clone: restore `../slideshows-media/`, recreate the symlinks, and
write `config/posting.local.yaml` — everything else regenerates.

## Key conventions

- **Hooks are sacred.** The opening frame must be a real visual — candid photo,
  footage, or a recognizable UI mockup. Never a flat color card with text.
- **People look real.** Generated people use an amateur-phone-photo aesthetic
  with believable bodies and believable progress — never AI-glossy.
- **Dual-ratio carousels.** Every deck renders 4:5 for Instagram and 9:16 for
  TikTok/YouTube; the wrong ratio never crosses platforms.
- **Publishing is a human call.** Agents generate, validate, and render freely,
  but never schedule a post unless explicitly asked.

## Requirements

- Node.js, ffmpeg, Google Chrome (headless rendering)
- [Higgsfield CLI](https://higgsfield.ai) — AI image/video generation
- [Postiz CLI](https://postiz.com) — post scheduling
