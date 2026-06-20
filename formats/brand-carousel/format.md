# Brand carousel

A premium, on-brand 7-slide carousel for the **main Vibe Health TikTok** (the
flagship brand account — not the alt accounts). Where the health/looksmax
carousels are stark black-and-white type, this format is **soft white/mint with
deep-green elegant serif headlines** — calm, classy, and obviously Vibe. It ends
not on a plain pill button but on **real product screenshots** (the app, the
Health Score card) so the payoff is "here's the actual thing."

Runs on: the main brand TikTok (9:16 photo carousel), and the same 9:16 PNGs
stitch into a YouTube Short via `build_shorts.sh`.

## When to use this format

- Flagship / brand-account posts where polish matters more than raw scroll-bait.
- Product-forward stories: what Vibe Health is, the Health Score, the AI coach,
  "stop juggling 5 apps" — anything that naturally lands on a screenshot.
- NOT for the edgy looksmax hooks or the no-BS health tips (those stay on the
  alt accounts in the monochrome formats).

## The look (what makes it distinct)

- **Palette:** off-white / mint backgrounds (`#f6fcf8`–`#ffffff`), deep-green ink
  (`#0e3b24` / `#06230f`), brand green accents (`#22c55e` / `#15803d`). The cover
  is a deep-green panel with the white logo; content is light; the close is light
  with phone screenshots. See `/config/brand.yaml`.
- **Type:** an elegant serif for headlines (Fraunces, falling back to Hoefler
  Text / Georgia), a clean sans for labels and body. This is the "classy" feel.
- **Logo:** the real wordmark image on the cover and close (never typed text).
- **Highlights:** `*phrase*` renders a soft mint-green pill, not a black one.

## Anatomy (7 slides)

| # | Type | Job |
|---|------|-----|
| 1 | `cover` | A **real royalty-free photo** in a top band fading into the green panel: white logo + classy serif headline + short sub. One optional `*highlight*`. Image on slide 1 ONLY. |
| 2–6 | `content` | One idea per slide on a light card: small green kicker, serif headline, one body line. No image. |
| 7 | `cta` | The payoff: 1–2 **real product screenshots** as phone mockups, a headline, the logo, and a short text CTA. No button. |

## Copy rules

- **No em dashes (—).** Ever. Use periods, commas, or colons. (The renderer also
  strips stray ones as a safety net.)
- **Topic = healthspan / longevity.** This format runs educational decks about
  living *better for longer* (the years you stay strong, sharp, capable). Each
  deck takes a **unique angle** and lands on the product as the way to track it.

## Voice

- Warm, confident, premium — never hypey or edgy. Plain language, a little
  aspirational. "Your health, in one calm number."
- Health claims hedged ("may help", "can support") — same rules as `/AGENTS.md`.
- Brand is always **"Vibe Health"**, handle `@vibehealthapp`.

## How a deck becomes posts

JSON spec (see `schema.yaml`) → cover photo pulled by
**`vibe-carousels/gen-bg-stock.js`** (real CC0 stock, no API key) → rendered by
**`vibe-carousels/build_brand.js`** (not `build.js`) into
`vibe-carousels/<NN>-<slug>/slide-NN-tt.html` → `render.sh` → PNGs →
`build_shorts.sh` → caption in the campaign. **$0 and no AI / no Higgsfield
credits**: the cover is a real royalty-free photo, content is brand design, and
the close is real app screenshots from `Vibe Health Assets/`. Scheduling is a
separate, explicitly approved step.
