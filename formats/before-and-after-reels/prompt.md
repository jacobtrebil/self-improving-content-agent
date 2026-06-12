# Generation prompt — before & after reel

You are writing one before-and-after reel spec for Vibe Health
(vibehealthapp.com — an AI health coach that scores sleep, food, water &
steps into one daily Health Score).

**Inputs:** a persona angle (e.g. "male 25, desk job, no energy" or
"female 27, perfectionist who keeps restarting"), the campaign brief, and the
next free reel number `<NN>`.

**Output:** one JSON file matching `schema.yaml`, saved to
`campaigns/<campaign>/generated/reel-<NN>-<slug>.json`. Imitate
`examples/good-001.json` and `examples/good-002.json` closely.

## Steps

1. Read `/config/brand.yaml`, `/config/models.yaml`, the campaign `brief.md`,
   and this folder's `validation.md`. Check existing reels/captions so the
   hook is not a reuse.
2. Invent one specific, ordinary person and the one honest insight that made
   their habits stick. The insight — not the body — is the story.
3. Storyboard 5–7 segments (hook first, end_card last) totaling 12–22s.
   Every segment has a visual plan and ≤ 12 words of on-screen text.
4. Write the asset prompts (before / after / footage) in the house realism
   style below.
5. Write the caption, 10 hashtags, a YouTube title, and an audio note.
6. Self-check against `validation.md` before saving.

## Story formulas

**Hook (text + visual together do the work)** — curiosity or tension over a
real visual, ≤ 8 words:
- "He tried everything. Nothing stuck." (over the before photo)
- "Day 1 vs day 90. Same person." (over a split tease)
- "She stopped trying to be perfect." (over candid footage)
The hook visual is the before still, candid footage, or a device-UI mockup —
never a flat color card with text (quiz cards are the one exception).

**Arc** — before (empathy: "Day 1. No plan. No energy.") → turn ("Then he
started tracking *one score*.") → reveal (silent or 3–5 words: "90 days
later.") → after ("Same guy. New habits.") → app payoff (the score screen:
"It just shows you what to fix.") → end card.

**On-screen text** — fragments, not sentences. Present tense. No exclamation
marks. Numbers only when honest and modest (days, not pounds — avoid weight
numbers entirely unless the brief demands them).

## Asset prompt styles (must match `/config/models.yaml`)

**Before (`gpt_image_2`, 9:16, quality high):** start from —
> unedited amateur photo taken on a phone, slightly grainy, harsh overhead
> fluorescent lighting, realistic ordinary body, imperfect skin with natural
> texture, candid slightly awkward posture, no retouching, no studio
> lighting, muted colors, looks like a real photo posted on reddit
…then one sentence placing the persona (mirror selfie in a cluttered bedroom,
tired at a desk, kitchen at night).

**After (`nano_banana_2`, `--image <before>`):** start from —
> Keep the EXACT same person, face, and identity as the reference. Same
> location and framing, same amateur phone-photo quality. Believable result
> of 90 days of consistent training — NOT a fitness model; still has natural
> soft spots, just visibly leaner and healthier.
…then the specific visible changes (posture, energy, fit of clothes).
Remember: output is 2048×2048 — plan a center-crop to 9:16.

**Footage (`seedance_2_0`, `--start-image`, `--aspect_ratio 9:16
--resolution 1080p`):**
> static handheld phone video, subtle camera shake like someone filming
> casually, natural movement, no cuts, no zoom, realistic ordinary footage
…then the action (walking on a treadmill, closing the fridge, morning light).

## Caption, hashtags, audio

**Caption** — 3 short paragraphs: (1) the insight as a one-liner + 1–2 emoji,
(2) what actually changed (habits, not hacks) + save/comment nudge (🔖/👇),
(3) one-line Vibe pitch ending "→ link in bio". Results-vary energy, no
guarantees.

**Hashtags** — 10: transformation/habit tags (#transformation, #habits,
#beforeandafter, #healthjourney) + topic tags, `#vibehealthapp` last.

**YouTube title** — plain, benefit-led, title case ("90 Days of Tracking
Changed Everything").

**Audio** — name the vibe and source plan ("calm lo-fi build, drop at the
reveal; pick licensed/trending track at assembly"). Audio is muxed at
assembly, never baked into generated footage.
