# Generation prompt — brand carousel

You are writing one brand-carousel deck for the **main Vibe Health TikTok**
(vibehealthapp.com — an AI health coach that scores sleep, food, water & steps
into one daily Health Score). This is the flagship, premium, product-forward
format: white/mint, deep-green serif, ending on real app screenshots.

**Inputs:** a brand/product angle (e.g. "what is Vibe Health", "your Health
Score", "meet the AI coach", "one app instead of five"), the campaign brief, and
the next free deck number `<NN>` (brand decks use 70+).

**Output:** one JSON file matching `schema.yaml`, saved to
`campaigns/<campaign>/generated/<NN>-<slug>.json`. Imitate
`examples/good-001.json` and `examples/good-002.json` closely.

## Steps

1. Read `/config/brand.yaml`, the campaign `brief.md`, and this folder's
   `validation.md`. Pick a product-forward angle that naturally ends on a
   screenshot (the Today's Plan home, or the Health Score "wrapped" card).
2. Write a calm, classy cover headline — aspirational, not hypey.
3. Write 5 content beats that build toward the product payoff.
4. Write the close: which screenshot(s) to show + a short text CTA.
5. Write caption, 10 hashtags, YouTube title. Self-check against `validation.md`.

## Copy formulas

**Cover** — a premium promise, ≤ 10 words, at most one `*highlight*`. Warm and
calm, not clickbait. Patterns: "Your whole health, in *one calm number*." /
"Meet the coach that *never logs off*." Sub = 1–2 sentences that set up the idea.

**Content slides 2–6** — one idea each:
- `kicker`: ≤ 3 words — a soft label ("The problem", "The idea", "Why it works",
  "In practice", "The payoff"), not "Mistake 03".
- `title`: ≤ 6 words, calm and declarative ("One score, not five apps").
- `body`: ≤ 25 words, at most one `*highlight*` on the operative phrase. Hedge
  health claims ("can support", "may help").

**CTA slide** — `title` restates the payoff (≤ 8 words); `body` ties it to the
product in plain language ("Vibe Health turns your day into one score — and a
plan for tomorrow."); `screens` is 1–2 of `["plan","score"]` (the real
screenshots to show); `cta_text` is a short action ("search ‘Vibe Health’ —
free on the App Store"); optional lowercase `tag`. There is **no button** — the
screenshots are the call to action.

**Caption** — 3 short paragraphs: (1) the promise + 1–2 emoji, (2) value recap +
save/share nudge (🔖 or 👇), (3) one-line Vibe pitch ending "→ link in bio".
Then 10 hashtags (brand + wellness tags), `#vibehealthapp` last.

**YouTube title** — plain, benefit-led, title case.

## Hard rules

- **No em dashes (—)** in any copy. Use periods, commas, or colons.
- **Topic is healthspan / longevity** — educational content about living better
  for longer. Each deck is a **unique angle** (e.g. healthspan vs lifespan, VO2
  max, muscle as the longevity organ, sleep, stress, social connection, protein
  timing, sitting). Hedge claims ("can support", "is linked to", "may help").

## Visuals

- **Cover (slide 1 only) gets ONE image: a REAL royalty-free photo.** Write a
  short `cover_query` (2-4 words, e.g. "man running", "senior woman walking").
  `node vibe-carousels/gen-bg-stock.js` pulls a CC0 / public-domain photo (no API
  key, no attribution, $0) from Openverse into `ai-bg/<NN>-cover.png`, and the
  renderer shows it in the cover's top photo band fading into the green panel.
  Set the cover `bg` to `ai-bg/<NN>-cover.png`. No AI generation. Content slides
  have no image. Prefer concrete, photogenic queries so a good stock match exists.
- **Close (slide 7)** uses **real product screenshots** from `Vibe Health
  Assets/` via the `screens` field (`plan` = Today's Plan home, `score` = Health
  Wrapped card). No button, no AI background on the CTA.
