# Validation — before & after reel

Two gates: spec checks before any generation, and render checks on the
finished MP4. A reel that fails any **hard fail** must be fixed, not
scheduled.

## Spec hard fails (before generating assets)

- [ ] Schema: every field in `schema.yaml` present; 5–7 segments; hook first,
      end_card last; before/transformation/after/app_payoff all present;
      durations sum to 12–22s.
- [ ] **Hook visual is a real visual** — before still, candid footage, or a
      recognizable UI mockup. A flat/plain color background with text is an
      automatic fail (black AND brand green/mint included). Quiz-card hooks
      are the one exception and must be flagged in `notes`.
- [ ] Hook is not a reuse of any existing reel or carousel hook.
- [ ] **Identity chain**: `after_prompt` declares `identity_ref: before` and
      keeps the same person/location/framing. A before/after of two different
      people (or a re-prompted lookalike) is an automatic fail.
- [ ] **Believability**: the after state is a modest, earned 90-day result —
      "visibly leaner and healthier, still has natural soft spots". Prompts
      containing fitness-model/shredded/six-pack language fail.
- [ ] Claims: honest timeframe in days/weeks of habit, no weight numbers
      unless the brief demands them, no guaranteed outcomes, no medical
      claims; app framed as "shows you what to fix", not as the cause.
- [ ] Tone: empathy for the before state, never pity or disgust; no
      body-shaming in text, caption, or hashtags.
- [ ] On-screen text ≤ 12 words per segment, no exclamation marks; brand is
      "Vibe Health"; end card uses the brand kit (mint gradient, broccoli
      icon, black wordmark, CTA pill).
- [ ] Asset prompts use the house realism blocks from `/config/models.yaml`
      (amateur phone photo / casual handheld) and the Seedance prompts note
      `--aspect_ratio 9:16 --resolution 1080p`.

## Render hard fails (on the finished MP4)

- [ ] Container: 1080×1920, 30fps, yuv420p, total length within ±2s of
      `duration_target_s`.
- [ ] No segment shows Seedance defaults (16:9 letterboxing, 720p softness);
      24fps footage was conformed to 30fps without judder.
- [ ] The after frame is recognizably the same person as the before frame —
      face, hair, setting. People look amateur-photo real: no AI gloss,
      warped hands, melted backgrounds, or impossible physiques.
- [ ] Nano Banana square output was center-cropped to 9:16 — no stretched or
      letterboxed after stills.
- [ ] Text is legible over every visual (scrim present), nothing critical in
      the bottom ~250px (platform UI overlap zone).
- [ ] Audio: muxed with `-shortest`, levels sane, the beat/drop lands on the
      reveal if the spec says it should.
- [ ] End card holds ≥ 2s and is the final frame.

## Quality bar (what makes it good)

- The hook works with sound off and creates a question only the reveal
  answers.
- The story is about the insight/habit, not the body — the body change is
  proof, the app is the mechanism.
- The reveal is earned: longest emotional beat, minimal text.
- Caption reads like a person; no AI-cringe phrasing ("unlock", "elevate",
  "game-changer", "delve").

## Pre-publish

- [ ] Run the Virality Predictor (`higgsfield ... brain_activity --video
      <final.mp4>`) and review hook strength / retention / distraction
      scores; iterate the hook if it scores weak.
- [ ] Caption + hashtags added to `vibe-carousels/CAPTIONS.md`.
- [ ] Scheduling only on explicit human approval (see `/config/posting.yaml`).

Bad-example reference: `examples/bad-001.md`.
