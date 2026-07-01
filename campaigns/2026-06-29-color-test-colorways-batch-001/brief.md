# color-test-colorways — health-carousel

- **Created:** 2026-06-29
- **Format:** health-carousel  · see /formats/health-carousel/
- **Count:** 30 posts
- **Status:** generating   # draft → generating → review → approved → scheduled → live
- **Channels:** tiktok_alt, youtube_alt   # ids via vibe-carousels/channel_id.sh (Instagram retired)
- **Cadence:** TBD — scheduling is a separate, explicitly-approved step (not this batch)

## Goal
A/B test which **palette** wins on the feed. Same format (black/white health
carousel), 30 distinct decks, split **6 per colorway** so each palette gets a
fair, varied sample. Color is the experimental variable; topics are interleaved
across colorways so no palette gets all-one-category.

### Colorways (defined in vibe-carousels/build.js PALETTES)
1. **mono** — black `#0a0a0a` / white ink (control)
2. **mint** — soft white `#f6fcf8` / deep-green ink, green pills
3. **deep-green** — deep-green `#0e3b24` panel / light ink
4. **cream** — warm cream `#f4ecd8` / near-black green ink
5. **charcoal** — charcoal `#1c1c1c` / off-white ink, amber accent

## Audience
Broad health/self-improvement viewers (not just fitness). Each deck reframes its
mechanism through energy, cognition, longevity, mood, or sleep.

## Items to generate
# key → topic (named mechanism) → colorway
1.  300 — Food order / meal sequencing (GLP-1, gastric emptying) — mono
2.  301 — Vinegar before carbs (acetic acid blunts glucose) — mint
3.  302 — Resistant starch, cooled rice/potato (butyrate) — deep-green
4.  303 — Dietary nitrates, beets/arugula (nitric oxide) — cream
5.  304 — Creatine for the brain (phosphocreatine, mental fatigue) — charcoal
6.  305 — Tart cherry for sleep (natural melatonin) — mono
7.  306 — Glycine before bed (deeper sleep, lower core temp) — mint
8.  307 — L-theanine + caffeine (calm focus, no jitters) — deep-green
9.  308 — Protein leverage (why you overeat when protein's low) — cream
10. 309 — Autophagy / spermidine (cellular cleanup, longevity) — charcoal
11. 310 — VO2 max (strongest mortality predictor) — mono
12. 311 — Muscle as a glucose sink (GLUT4, insulin sensitivity) — mint
13. 312 — Slow eating / 20-min satiety (ghrelin, leptin delay) — deep-green
14. 313 — Low ferritin & unexplained fatigue (iron) — cream
15. 314 — B12 for energy & nerves (plant-based risk) — charcoal
16. 315 — Vitamin K2 directs calcium (bones not arteries, MK-7) — mono
17. 316 — Collagen + vitamin C (skin elasticity, joints) — mint
18. 317 — Cocoa flavanols (brain blood flow, focus) — deep-green
19. 318 — Chewing more (digestive enzymes, absorption, bloat) — cream
20. 319 — Electrolytes for energy (potassium/sodium, not just water) — charcoal
21. 320 — Capsaicin (thermogenesis + appetite, TRPV1) — mono
22. 321 — Taurine & longevity (recent science) — mint
23. 322 — Zinc (immune, skin, recovery) — deep-green
24. 323 — Oats / beta-glucan (LDL cholesterol, heart) — cream
25. 324 — Brisk walking pace / cadence (mortality signal, METs) — charcoal
26. 325 — Deload & nervous-system recovery (overtraining) — mono
27. 326 — EPOC / the afterburn truth (mildly contrarian) — mint
28. 327 — Sun on skin → nitric oxide → BP (NOT vitamin D) — deep-green
29. 328 — Berries / anthocyanins (memory) — cream
30. 329 — Olive oil oleocanthal ("liquid ibuprofen", anti-inflammatory) — charcoal

## Constraints
- Pass /formats/health-carousel/validation.md — hard fails block rendering.
- Brand: /config/brand.yaml. No medical claims; hedge outcomes ("may help").
- No hook reuse vs other campaigns or vibe-carousels/build.js.
- Each spec carries top-level `"colorway"` per the map above.
- Keys 300–329 (3-digit; toolchain updated to support full numeric prefix).

## Notes
- New: colorway palette system added to vibe-carousels/build.js; validate.js +
  gen-bg-from-specs.js NN extraction fixed for 3-digit keys.
- Scheduling intentionally excluded from this batch.
