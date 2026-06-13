# Validation — looksmax carousel

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
- [ ] The reframe is health-first: every lever is sleep / food / water /
      movement / posture. No surgery, fillers, supplements-as-fix, pharma, or
      product recommendations.
- [ ] Tone is empowering, not shaming: no "you look bad", no hopelessness, no
      mocking features people can't change, nothing engineered to wound
      ("it's over"-style framing is banned).
- [ ] Claims are honest and hedged: "may help / can support"; small effects
      are labeled small; no guaranteed timelines or invented statistics.
      Tongue-posture/"mewing"-type levers may appear only as minor and
      cosmetic-adjacent, never as bone-restructuring.
- [ ] Brand: "Vibe Health" (never bare "Vibe" in slide copy), handle
      `@vibehealthapp`, button exactly "Download Vibe Health →".
- [ ] `*highlight*` syntax: each highlight wraps a short phrase (≤ 5 words);
      no nested or unclosed asterisks (pills render `white-space:nowrap`).

## Quality bar (what makes it good)

- The cover promises the aesthetic outcome AND subverts the expected advice
  ("no surgery needed", "starts in your kitchen") — that tension is the hook.
- Levers ordered strongest-first; each is something the reader could start
  this week; no slide is filler.
- Highlights land on the operative phrase ("*get leaner*", "*sodium and
  booze*"), not random words.
- CTA connects the exact levers to a real app behavior (tracks sleep/food/
  water into one score) — not a vague "download for more tips".
- Caption reads like a person; no AI-cringe phrasing ("unlock", "elevate",
  "game-changer", "delve").

## Render-time checks (after build + render)

- [ ] Both ratios exist for every slide: `slide-NN.png` and `slide-NN-tt.png`.
- [ ] `ai-bg/<NN>-cover.png` / `ai-bg/<NN>-cta.png` exist and match the
      gen-bg.sh beauty-portrait style: monochrome, low-key, dark lower third.
- [ ] Faces look attainably real — no AI gloss, warped anatomy, or uncanny
      perfection that undercuts the "this is just health" message.
- [ ] Text is legible over the portrait in both ratios; nothing critical sits
      on the subject's face or in the bottom fade.
- [ ] Highlight pills don't overflow the slide edge on the 9:16 render.

Bad-example reference: `examples/bad-001.md`.
