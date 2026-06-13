# Validation — health carousel

Run every check before rendering. A deck that fails any **hard fail** must be
fixed, not rendered.

## Hard fails

- [ ] Schema: every field in `schema.yaml` present, slide count/order correct,
      word/highlight limits respected.
- [ ] Cover and CTA each declare a `bg` image and a matching `bg_prompts`
      entry exists. **A hook on a flat color card is an automatic fail.**
- [ ] Uniqueness — not the same as a previously-made carousel in this format.
      `formats/validate.js` checks every spec against the corpus of prior decks
      (`vibe-carousels/build.js` + every other campaign's `approved/` specs +
      this batch's siblings) and fails it if **(a)** the cover hook is reused,
      or **(b)** the deck's copy is a **near-duplicate** — ≥ 40% word-bigram
      overlap (`DUP_THRESHOLD`). A spec reusing its own key is an update, not a
      duplicate, and is exempt.
- [ ] No unsupported medical claims; outcome language is hedged ("may help",
      "can support", "designed to") — never "will cure / guarantees / melts fat".
- [ ] Numbers are defensible and conventional (e.g. protein 0.7–1g/lb,
      300–500 cal deficit, ~8k steps). No invented statistics.
- [ ] Brand: "Vibe Health" (never bare "Vibe" in slide copy), handle
      `@vibehealthapp`, button exactly "Download Vibe Health →".
- [ ] `*highlight*` syntax: each highlight wraps a short phrase (≤ 5 words);
      no nested or unclosed asterisks; pill phrases must not wrap weirdly
      (keep them short — they render `white-space:nowrap`).

## Quality bar (what makes it good)

- The cover would stop a scroll without the sub: specific, mildly contrarian,
  concrete payoff. Curiosity > cleverness.
- Slides 2–6 form a path a reader could actually follow this week; each slide
  is one idea, no slide is filler.
- Highlights land on the *most actionable* number or phrase, not random words.
- CTA names a real app behavior (snap meals, auto-count, trend line, daily
  score) — not a vague "download for more tips".
- Caption reads like a person, not a press release; no AI-cringe phrasing
  ("unlock", "elevate", "game-changer", "delve").

## Render-time checks (after build + render)

- [ ] Both ratios exist for every slide: `slide-NN.png` and `slide-NN-tt.png`.
- [ ] `ai-bg/<NN>-cover.png` and `ai-bg/<NN>-cta.png` exist; people in them
      look like real amateur-photo humans (no AI gloss, no warped anatomy).
- [ ] Text is legible over the photo background in both ratios (the gradient
      overlay does its job; nothing critical sits in the bottom fade).
- [ ] Highlight pills don't overflow the slide edge on the 9:16 render.

Bad-example reference: `examples/bad-001.md`.
