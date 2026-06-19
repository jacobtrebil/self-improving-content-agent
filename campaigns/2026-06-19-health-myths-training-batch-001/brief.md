# health-myths-training — health-carousel

- **Created:** 2026-06-19
- **Format:** health-carousel  · see /formats/health-carousel/
- **Count:** 5 posts
- **Status:** approved   # draft → generating → review → approved → scheduled → live (rendered; scheduling pending human approval)
- **Channels:** instagram, tiktok_alt, youtube_alt   # ids via vibe-carousels/channel_id.sh
- **Cadence:** 1 post/day at 17:00Z

## Goal
Five health decks that bust a popular fitness/nutrition myth and replace it with
the second-order mechanism most creators skip. Theme: training & metabolism
truths. Each lands one this-week fix tied to a Vibe Health feature. Distinct from
the live decks (protein, scale, fat loss, steps, sleep, liquid calories, labels,
water, fiber, hunger, snacking, meal prep, eating out, cardio-vs-lifting, stress,
energy basics).

## Audience
20–35, trains a bit but plateaued, drowning in conflicting fitness advice,
suspicious of supplement hype. Wants the mechanism, not another rule.

## Items to generate
1. alcohol & your goals → it's not the calories, it's stalled fat-burn + wrecked REM (key 44-alcohol-truth)
2. "slow metabolism" myth → your NEAT collapsed, not your metabolism (key 45-metabolism-myth)
3. zone-2 cardio → easy pace builds the fat-burning engine; going hard burns sugar (key 46-zone-2-cardio)
4. progressive overload → workouts stop working when the stimulus stops changing (key 47-progressive-overload)
5. "you can't outrun your fork" → exercise burns less than you think; the deficit is food (key 48-outrun-your-fork)

## Constraints
- Pass /formats/health-carousel/validation.md — hard fails block rendering.
- Brand: /config/brand.yaml. No medical claims; hedge outcomes ("may help");
  numbers must be defensible/conventional.
- No hook reuse or near-duplicate copy vs other campaigns or vibe-carousels/build.js.
  Keys 44–48 are free.

## Notes
Applying strategy memory (context.md): hooks are declarative, not hedged; the sub
teases rather than naming the fix; pick the second-order mechanism, not the
mainstream angle; avoid the five mainstream energy pillars as primary angles.
Trace under a single TRACE_ID so spec + background spans group together.
