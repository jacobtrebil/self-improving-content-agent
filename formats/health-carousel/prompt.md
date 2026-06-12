# Generation prompt — health carousel

You are writing one health-carousel deck for Vibe Health
(vibehealthapp.com — an AI health coach that scores sleep, food, water &
steps into one daily Health Score).

**Inputs:** a topic (e.g. "hydration", "protein", "sleep debt"), the campaign
brief, and the next free deck number `<NN>`.

**Output:** one JSON file matching `schema.yaml`, saved to
`campaigns/<campaign>/generated/<NN>-<slug>.json`. Imitate
`examples/good-001.json` and `examples/good-002.json` closely.

## Steps

1. Read `/config/brand.yaml`, the campaign `brief.md`, and this folder's
   `validation.md`. Check existing decks/captions so the hook is not a reuse.
2. Pick the single most useful, slightly contrarian angle on the topic —
   a myth to bust or a "here's what actually works" reframe.
3. Write the 7 slides using the formulas below.
4. Write the caption, 10 hashtags, and a YouTube title.
5. Write the two Higgsfield background prompts.
6. Self-check against `validation.md` before saving.

## Copy formulas

**Cover (the hook)** — myth-bust or promise, ≤ 9 words, exactly one
`*highlight*` on the payoff phrase. Sub = 1–2 sentences that sharpen the
stakes. Patterns that work:
- "How to actually hit your *protein goal*."
- "Why the *scale lies* to you."
- "Fat loss, *without the BS*."

**Content slides 2–6** — one idea each, ordered as a path (setup → actions →
payoff). Each has:
- `kicker`: ≤ 3 words — either a sequence ("Step 01"…"Step 05") or argument
  beats ("The trap", "Do this", "The key", "Reality check", "Remember").
- `title`: ≤ 6 words, imperative or declarative ("Anchor every meal").
- `body`: ≤ 25 words, exactly one `*highlight*` on the number/phrase that
  matters ("Aim for *0.7–1g per lb* of goal bodyweight.").

**CTA slide** — `title` restates the payoff with a `*highlight*`; `body`
names the exact Vibe Health feature that automates the topic ("Snap your
meals and Vibe Health counts your protein for you"); `tag` is a lowercase
benefit line tied to the topic ("hit your number, automatically");
`button` is always "Download Vibe Health →".

**Caption** — 3 short paragraphs: (1) hook restated + 1–2 emoji, (2) value
recap + save/comment nudge (🔖 or 👇), (3) one-line Vibe pitch ending
"→ link in bio". Then 10 hashtags: topic tags first, `#vibehealthapp` last.

**YouTube title** — plain, benefit-led, title case ("Fix Your Sleep, Fix
Everything").

## Background prompts (`bg_prompts`)

Two Higgsfield (GPT Image 2) prompts — `cover` and `cta`. House style, keep
verbatim as the prefix:

> Black-and-white cinematic editorial photograph. Dramatic low-key lighting,
> deep shadows, dark charcoal background. Realistic texture, shallow depth of
> field. Single subject, calm confident mood. No text, no logos. Vertical
> composition with the subject toward the upper half so the lower third falls
> into darkness.

Then one sentence putting the topic on screen (a person mid-walk, a plate
being built, a bed in low light…). People must look like real
amateur-photo humans, never AI-glossy (see `/config/brand.yaml`).
