# Validation — brand carousel

Run every check before rendering. A deck that fails any **hard fail** must be
fixed, not rendered.

## Hard fails

- [ ] Schema: every field in `schema.yaml` present, slide count/order correct
      (cover → content… → cta), word limits respected.
- [ ] `theme` is `brand` (routes to `build_brand.js`, not the monochrome
      `build.js`).
- [ ] **No em dashes (—) anywhere** in any slide copy, caption, or `cta_text`.
      This is a hard rule for the format — use periods, commas, or colons.
- [ ] The CTA slide declares `screens` with 1–2 valid keys (`plan` and/or
      `score`) and a `cta_text`. **No button** — the screenshots are the CTA.
- [ ] The COVER (slide 1 only) declares a `bg` (`ai-bg/<NN>-cover.png`) and a
      `cover_query` (the stock-photo search). NO `bg_prompts` (this format pulls a
      real CC0 photo, not an AI image). Content and CTA slides have NO image.
- [ ] Uniqueness — the cover hook is not a reuse of a prior brand deck.
- [ ] No unsupported medical claims; outcome language is hedged ("may help",
      "can support", "designed to").
- [ ] Brand: "Vibe Health" (never bare "Vibe" in slide copy), handle
      `@vibehealthapp`. The logo is the real wordmark image (rendered by
      `build_brand.js`), never typed text.
- [ ] `*highlight*` syntax: at most one per cover/content/cta line, each wrapping
      a short phrase (≤ 5 words); no nested or unclosed asterisks.

## Quality bar (what makes it good)

- The cover feels premium and calm — aspirational, not clickbait. It reads like a
  brand, not a hot take.
- Content builds toward the product: each slide is one clean idea, and the close
  lands naturally on a screenshot the reader now wants to see.
- The CTA shows the real product (Today's Plan / Health Score), not a generic
  button — the screenshot is the proof.
- Highlights (mint-green pills) land on the operative phrase, used sparingly —
  often zero on a slide is more elegant here than one.
- Caption reads like a person; no AI-cringe ("unlock", "elevate", "game-changer").

## Render-time checks (after build_brand.js + render)

- [ ] `slide-NN-tt.png` exists for every slide (9:16, 1080×1920).
- [ ] Cover: white logo legible on the green panel; serif headline crisp.
- [ ] Content: deep-green serif on light card, comfortable margins, nothing
      clipped.
- [ ] CTA: the product screenshot(s) render in their phone frames, logo present,
      `cta_text` legible.
- [ ] Highlight pills don't overflow the slide edge.

Bad-example reference: `examples/bad-001.md`.
