#!/usr/bin/env bash
# Upload each deck's Short and schedule it to YouTube, same dates as TikTok.
set -uo pipefail

source "$(dirname "$0")/channel_id.sh"
source "$(dirname "$0")/../observability/trace.sh"   # auto-traces postiz calls
INTEGRATION=$(channel_id youtube_alt) || exit 1   # YouTube - Vibe Health App
POSTS="/tmp/posts.json"

# deck-dir | date | YouTube title
ROWS=(
  "04-hit-your-protein|2026-06-10T17:00:00Z|How to Actually Hit Your Protein Goal"
  "05-the-scale-lies|2026-06-11T17:00:00Z|Why the Scale Lies to You"
  "06-fat-loss-no-bs|2026-06-12T17:00:00Z|Fat Loss, Without the BS"
  "07-case-for-steps|2026-06-13T17:00:00Z|The Case for 8,000 Steps a Day"
  "08-fix-your-sleep|2026-06-14T17:00:00Z|Fix Your Sleep, Fix Everything"
  "09-stop-drinking-calories|2026-06-15T17:00:00Z|Stop Drinking Your Calories"
  "10-read-a-label|2026-06-16T17:00:00Z|Read a Nutrition Label in 10 Seconds"
  "11-high-protein-meals|2026-06-17T17:00:00Z|5 High-Protein Meals Under 500 Calories"
  "12-drink-enough-water|2026-06-18T17:00:00Z|Are You Actually Drinking Enough Water?"
  "13-stop-falling-off|2026-06-19T17:00:00Z|Why You Keep Falling Off (and How to Stop)"
)

upload_path() {
  postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'
}

for row in "${ROWS[@]}"; do
  IFS='|' read -r dir date title <<< "$row"
  day="${date:0:10}"
  mp4="$dir.mp4"; mp4="shorts/$mp4"
  [ -f "$mp4" ] || { echo "✗ $dir: missing $mp4"; continue; }

  caption=$(jq -r --arg d "$day" '.posts[] | select(.publishDate[0:10]==$d) | .content' "$POSTS")
  desc="${caption}"$'\n\n#shorts'

  url=$(upload_path "$mp4")
  [ -n "$url" ] || { echo "✗ $dir: video upload failed"; continue; }

  settings=$(jq -nc --arg t "$title" '{title:$t, type:"public", selfDeclaredMadeForKids:"no"}')

  out=$(postiz posts:create -c "$desc" -m "$url" -s "$date" -i "$INTEGRATION" --settings "$settings" 2>&1)
  newid=$(echo "$out" | grep -oE 'cm[a-z0-9]{20,}' | head -1)
  if [ -z "$newid" ]; then echo "✗ $dir: create failed. Output:"; echo "$out" | tail -3; continue; fi
  echo "✓ $dir  $day  YT=$newid  \"$title\""
done
echo "done"
