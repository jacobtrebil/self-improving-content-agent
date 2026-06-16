# energy-basics — health-carousel

- **Created:** 2026-06-15
- **Format:** health-carousel  · see /formats/health-carousel/
- **Count:** 5 posts
- **Status:** generating   # draft → generating → review → approved → scheduled → live
- **Channels:** instagram, tiktok_alt, youtube_alt   # ids via vibe-carousels/channel_id.sh
- **Cadence:** 1 post/day at 17:00Z

## Goal
Five "daily energy" decks that bust a common myth and give one this-week fix.
Angle: small inputs (light, caffeine timing, a walk, electrolytes, hidden
sugar) move energy more than people think — each ties to a Vibe Health feature.

## Audience
20–35, busy, tired-by-3pm, already health-curious but overwhelmed by advice.

## Items to generate
1. morning sunlight → fixing energy/circadian rhythm (key 34-morning-light)
2. caffeine timing → the afternoon-cutoff that protects sleep (key 35-caffeine-cutoff)
3. walking after meals → steadier energy, fewer crashes (key 36-walk-after-meals)
4. electrolytes → why plain water isn't enough (key 37-more-than-water)
5. hidden sugar → "healthy" foods that spike then crash you (key 38-hidden-sugar)

## Constraints
- Pass /formats/health-carousel/validation.md — hard fails block rendering.
- Brand: /config/brand.yaml. No medical claims; hedge outcomes ("may help").
- No hook reuse vs other campaigns or vibe-carousels/build.js. Keys 34–38 are free.

## Notes
Trace this run under a single TRACE_ID so the LLM spec-writing spans and the
Higgsfield background spans group together.
