#!/usr/bin/env bash
# Schedule the 4:5 carousels (decks 04-13) to Instagram, same dates as TikTok.
set -uo pipefail

source "$(dirname "$0")/channel_id.sh"
INTEGRATION=$(channel_id instagram) || exit 1   # Instagram - Vibe Health
SETTINGS='{"post_type":"post"}'
POSTS="/tmp/posts.json"                     # snapshot holding the captions

# deck-dir : schedule-date (12 PM CDT = 17:00Z)
ROWS=(
  "04-hit-your-protein|2026-06-10T17:00:00Z"
  "05-the-scale-lies|2026-06-11T17:00:00Z"
  "06-fat-loss-no-bs|2026-06-12T17:00:00Z"
  "07-case-for-steps|2026-06-13T17:00:00Z"
  "08-fix-your-sleep|2026-06-14T17:00:00Z"
  "09-stop-drinking-calories|2026-06-15T17:00:00Z"
  "10-read-a-label|2026-06-16T17:00:00Z"
  "11-high-protein-meals|2026-06-17T17:00:00Z"
  "12-drink-enough-water|2026-06-18T17:00:00Z"
  "13-stop-falling-off|2026-06-19T17:00:00Z"
)

upload_path() {
  postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'
}

for row in "${ROWS[@]}"; do
  IFS='|' read -r dir date <<< "$row"
  day="${date:0:10}"
  content=$(jq -r --arg d "$day" '.posts[] | select(.publishDate[0:10]==$d) | .content' "$POSTS")
  [ -n "$content" ] || { echo "✗ $dir: no caption for $day — skipping"; continue; }

  urls=""; ok=1
  for n in 01 02 03 04 05 06 07; do
    f="$dir/slide-${n}.png"
    [ -f "$f" ] || { echo "✗ $dir: missing $f"; ok=0; break; }
    u=$(upload_path "$f")
    [ -n "$u" ] || { echo "✗ $dir: upload failed for $f"; ok=0; break; }
    urls="${urls:+$urls,}$u"
  done
  [ "$ok" = 1 ] || { echo "✗ $dir: aborting"; continue; }

  out=$(postiz posts:create -c "$content" -m "$urls" -s "$date" -i "$INTEGRATION" --settings "$SETTINGS" 2>&1)
  newid=$(echo "$out" | grep -oE 'cm[a-z0-9]{20,}' | head -1)
  if [ -z "$newid" ]; then echo "✗ $dir: create failed. Output:"; echo "$out" | tail -3; continue; fi
  echo "✓ $dir  $day  IG post=$newid"
done
echo "done"
