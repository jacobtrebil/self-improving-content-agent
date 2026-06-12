#!/usr/bin/env bash
# Generates monochrome cinematic beauty-portrait backgrounds for decks 14-23
# (cover + cta each) via Higgsfield GPT Image 2, into this ai-bg/ folder.
# Matches the look of 01-03: black & white, dramatic low-key light, dewy skin,
# dark moody background so the slide's gradient overlay + text stay legible.
set -uo pipefail
cd "$(dirname "$0")"

MODEL="gpt_image_2"
STYLE="Black-and-white cinematic editorial beauty portrait. Dramatic low-key Rembrandt lighting, deep shadows, dark charcoal background. Glowing dewy skin with fine realistic texture, shallow depth of field, 85mm lens look. Single subject, calm confident mood. No text, no logos, no props. Vertical composition with the subject toward the upper half so the lower third falls into darkness."

# name|prompt-subject
SHOTS=(
"14-cover|A man with a sharp, strong, well-defined jawline and chiseled chin, three-quarter profile, jaw catching a rim of light."
"14-cta|Close detail of a sculpted male jawline and cheekbone, lean and defined, hard side light."
"15-cover|A woman with flawless clear glowing skin, smooth complexion, soft beauty light on the face."
"15-cta|Close-up of radiant clear dewy skin on a woman's cheek and jaw, luminous and healthy."
"16-cover|A person with bright, rested, awake eyes, smooth under-eye area, gentle catchlight in the eyes."
"16-cta|Serene refreshed face with clear bright eyes, well-rested calm expression."
"17-cover|A person with thick, healthy, glossy flowing hair, hair catching soft light, strands in focus."
"17-cta|Close detail of shiny healthy hair texture, lush and full, soft sheen."
"18-cover|A person with a lean sculpted face, sharp cheekbones and hollow under the cheek, defined features."
"18-cta|Lean defined facial structure, sharp cheekbones and jaw, low body fat look."
"19-cover|A person standing tall with shoulders back, upright confident posture, strong upper body and neck, chin level."
"19-cta|Confident upright stance, open chest and squared shoulders, poised silhouette."
"20-cover|A serene face at rest with eyes gently closed, peaceful expression, soft moonlit beauty light, beauty sleep."
"20-cta|A refreshed glowing morning face, calm and rested, soft luminous skin."
"21-cover|A sharply sculpted de-puffed face, tight defined contours, sharp cheekbones and jaw, no bloat."
"21-cta|A lean sharp facial profile, crisp jaw and cheekbone definition."
"22-cover|A face with radiant luminous dewy skin, lit-from-within glow, soft highlights on the cheekbones."
"22-cta|Luminous glowing skin close-up, healthy sheen, soft beauty highlights."
"23-cover|A strikingly symmetrical attractive face, balanced features, confident model gaze."
"23-cta|A confident attractive face with balanced symmetrical features, self-assured expression."
)

fail=0
for entry in "${SHOTS[@]}"; do
  name="${entry%%|*}"
  subject="${entry#*|}"
  out="${name}.png"
  if [[ -f "$out" ]]; then echo "skip $out (exists)"; continue; fi
  echo "→ generating $out"
  url=$(higgsfield generate create "$MODEL" \
        --prompt "$subject $STYLE" \
        --aspect_ratio 3:4 --resolution 2k --quality high --wait --json 2>/dev/null \
        | jq -r '.[0].result_url // empty' 2>/dev/null)
  if [[ -z "$url" ]]; then
    echo "  ✗ no url for $out (out of credits or error)"; fail=$((fail+1)); continue
  fi
  curl -fsSL "$url" -o "$out" && echo "  ✓ saved $out" || { echo "  ✗ download failed $out"; fail=$((fail+1)); }
done
echo "done (failures: $fail)"
