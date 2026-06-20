# longevity-flagship — brand-carousel

- **Created:** 2026-06-19
- **Format:** brand-carousel  · see /formats/brand-carousel/
- **Count:** 30 posts
- **Status:** approved   # draft → generating → review → approved → scheduled → live (rendered; scheduling pending approval)
- **Channels:** main brand TikTok (+ youtube)   # the flagship account, NOT the alt accounts
- **Cadence:** TBD (scheduling needs explicit approval)

## Goal
Thirty premium brand-carousel decks (keys 100–129) of educational
**healthspan / longevity** content for the main Vibe Health TikTok. Each deck is
a UNIQUE angle, ends on the real app screenshots, and reads calm + classy (not
hypey). Format rules: **NO em dashes**, real-photo cover (top band) via
`cover_query`, no button.

## Audience
25–55, health-curious, aspirational, wants to live *better for longer* (stay
strong, sharp, capable). Trusts substance over hype.

## Format reminders (read /formats/brand-carousel/ before generating)
- 7 slides: cover + 5 content + cta. theme `brand`. eyebrow usually "Longevity".
- Cover ≤10 words (≤1 *highlight*), sub ≤2 sentences. Content: kicker ≤3 words,
  title ≤6 words (plain), body ≤25 words (≤1 *highlight*). CTA title ≤8 words,
  body ≤30 words naming the app, `screens` (1–2 of plan/score), `cta_text`, tag.
- `cover_query` = 2–4 word stock-photo search (concrete + photogenic).
- `bg` = "ai-bg/<KEY-NUMBER>-cover.png" (e.g. "ai-bg/100-cover.png").
- 10 hashtags, last `#vibehealthapp`. 3-paragraph caption ending "→ link in bio".
- Hedge all health claims ("is linked to", "may help", "can support"). NO em dashes.

## Items to generate (key · angle · cover_query · lever hints)
1. 100-muscle-for-aging · strength keeps you independent into your 80s (sarcopenia, glucose) · "older man lifting weights"
2. 101-grip-strength · grip strength is a startlingly strong predictor of lifespan · "hands carrying groceries"
3. 102-balance-fall-proof · balance training prevents the falls that end independence (one-leg test) · "person balancing yoga"
4. 103-mobility-sit-rise · everyday mobility (sit-to-rise) tracks how well you're aging · "person stretching floor"
5. 104-walking-longevity · the daily-step sweet spot for a longer life (~7–8k) · "people walking park"
6. 105-bone-density · resistance + impact build the bone that prevents late-life fractures · "woman lifting dumbbell"
7. 106-resting-heart-rate · resting heart rate & HRV are at-home longevity vitals · "fitness watch wrist"
8. 107-protein-with-age · you need MORE protein as you age to hold muscle · "salmon healthy plate"
9. 108-plant-forward · plant-forward eating (Blue Zones) and the fiber that feeds longevity · "colorful vegetables bowl"
10. 109-mediterranean · the Mediterranean pattern: olive oil, fish, legumes, greens · "mediterranean food olive oil"
11. 110-hydration-aging · staying well-hydrated is linked to slower biological aging · "glass of water"
12. 111-portions-overeating · eating to ~80% full (not stuffed) eases metabolic load · "balanced healthy plate"
13. 112-time-restricted-eating · a consistent eating window may support metabolic health (hedge autophagy) · "breakfast morning table"
14. 113-alcohol-longevity · rethinking alcohol: less is better for long-term health · "wine glass table"
15. 114-blood-sugar · steady blood sugar (fewer spikes) slows metabolic aging · "balanced meal vegetables"
16. 115-deep-sleep-brain · deep sleep clears brain waste (glymphatic) and protects memory · "person sleeping peacefully"
17. 116-sleep-consistency · a consistent sleep schedule matters as much as hours · "alarm clock bedside"
18. 117-connection-longevity · strong social connection rivals diet/exercise; loneliness is a real risk · "older friends laughing"
19. 118-sense-of-purpose · a sense of purpose is linked to living longer · "senior gardening hobby"
20. 119-stress-telomeres · chronic stress accelerates cellular aging (telomeres) · "person meditating calm"
21. 120-keep-learning · staying mentally active builds cognitive reserve against decline · "older person reading"
22. 121-optimism-longevity · optimism is linked to a longer, healthier life · "happy older person smiling"
23. 122-blood-pressure · blood pressure is the silent ager worth knowing · "blood pressure monitor"
24. 123-visceral-fat-waist · waist size beats BMI; visceral fat is the risk · "measuring tape waist"
25. 124-inflammation · lowering chronic inflammation ("inflammaging") with food + habits · "berries healthy food"
26. 125-hearing-health · protecting hearing protects your brain (dementia link) · "older person listening"
27. 126-oral-health · flossing & gum health are linked to heart and brain longevity · "toothbrush dental care"
28. 127-nature-green-time · time in nature/green space supports longevity and mood · "forest walk nature"
29. 128-ultra-processed · cutting ultra-processed food is one of the biggest levers · "fresh whole foods market"
30. 129-coffee-green-tea · coffee & green tea (in moderation) are linked to longevity · "cup of green tea"

## Constraints
- Pass /formats/brand-carousel/validation.md (a dedicated brand validator checks
  it). NO em dashes. Brand: "Vibe Health", @vibehealthapp.
- Each deck a distinct angle; no near-duplicate copy across the 30.
- Cover photos are real CC0 stock via `gen-bg-stock.js` (no API key, $0).

## Notes
First batch in the brand-carousel format. The eval/reflect harness
(run-evals.js) is health/looksmax-shaped and does not yet support theme `brand`,
so this batch is validated structurally (brand validator) + spot-checked, without
the LLM-judge harness.
