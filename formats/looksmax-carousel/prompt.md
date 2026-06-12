# Generation prompt — looksmax carousel

You are writing one looksmax-carousel deck for Vibe Health
(vibehealthapp.com — an AI health coach that scores sleep, food, water &
steps into one daily Health Score).

**Inputs:** an appearance goal (e.g. "jawline", "clear skin", "debloat"),
the campaign brief, and the next free deck number `<NN>`.

**Output:** one JSON file matching `schema.yaml`, saved to
`campaigns/<campaign>/generated/<NN>-<slug>.json`. Imitate
`examples/good-001.json` and `examples/good-002.json` closely.

## Steps

1. Read `/config/brand.yaml`, the campaign `brief.md`, and this folder's
   `validation.md`. Check existing decks/captions so the hook is not a reuse.
2. Find the reframe: what about this aesthetic goal is actually downstream of
   sleep/food/water/movement? That reframe IS the hook.
3. Pick 5 levers, ordered strongest-first, each honestly sized.
4. Write the 7 slides, caption, hashtags, YouTube title, and the two
   beauty-portrait background prompts.
5. Self-check against `validation.md` before saving.

## Copy formulas

**Cover (the hook)** — aesthetic payoff + contrarian reframe, ≤ 9 words,
exactly one `*highlight*`. Patterns that work:
- "Sharpen your jawline — *no surgery needed*."
- "Clear skin starts *in your kitchen*."
- "Kill your *under-eye bags*."
Sub = 1–2 sentences naming the misconception ("Most of a 'weak' jaw is bloat
and body fat hiding it.").

**Content slides 2–6** — one lever each:
- `kicker`: ≤ 3 words, an action label ("Lean out", "Debloat", "Posture",
  "Build it", "Overnight") — not numbered steps.
- `title`: ≤ 6 words, the lever stated plainly ("Body fat hides the jaw").
- `body`: ≤ 25 words, one `*highlight*` on the operative phrase. Size claims
  honestly — small effects get called small ("Real — if minor.").

**CTA slide** — `title` restates the transformation in 3–5 punchy words
("Lean, debloated, *defined*."); `body` ties the exact levers to Vibe Health
tracking ("Vibe Health tracks the sleep, food & water that actually reveal
your jaw — in one score."); `tag` is lowercase, "a sharper jaw, tracked" /
"clearer skin, from within"; `button` is always "Download Vibe Health →".

**Caption** — 3 short paragraphs: (1) the reframe + 1–2 emoji, (2) lever
recap + save/comment nudge (🔖 or 👇), (3) one-line Vibe pitch ending
"→ link in bio". Then 10 hashtags mixing looksmax tags (#looksmaxing,
#glowup, goal-specific tags) with health tags, `#vibehealthapp` last.

**YouTube title** — plain, benefit-led, title case ("Sharpen Your Jawline —
No Surgery Needed").

## Background prompts (`bg_prompts`)

Two Higgsfield (GPT Image 2) prompts — `cover` and `cta` — in the house
beauty-portrait style (this is the working style block from
`vibe-carousels/ai-bg/gen-bg.sh`; keep verbatim as the prefix):

> Black-and-white cinematic editorial beauty portrait. Dramatic low-key
> Rembrandt lighting, deep shadows, dark charcoal background. Glowing dewy
> skin with fine realistic texture, shallow depth of field, 85mm lens look.
> Single subject, calm confident mood. No text, no logos, no props. Vertical
> composition with the subject toward the upper half so the lower third falls
> into darkness.

Then one sentence putting the goal on screen: cover = a person embodying the
outcome ("A man with a sharp, well-defined jawline, three-quarter profile,
jaw catching a rim of light."); cta = a close detail of the same outcome.
Subjects look like attainable, real-photo humans — aspirational but never
AI-glossy or uncanny (see `/config/brand.yaml`).
