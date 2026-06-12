#!/usr/bin/env bash
# Re-create the 10 scheduled TikTok carousels (decks 04-13) using the 9:16 (-tt)
# slides, then delete the old 4:5 posts. Captions/dates/settings preserved.
set -uo pipefail

source "$(dirname "$0")/channel_id.sh"
INTEGRATION=$(channel_id tiktok_alt) || exit 1
SETTINGS='{"privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,"autoAddMusic":"yes","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}'
POSTS="/tmp/posts.json"

# Rows live in a gitignored local file (they contain live post ids):
# deck-dir <TAB> schedule-date <TAB> old-post-id
ROWS_FILE="$(dirname "$0")/reschedule_rows.local.tsv"
[ -f "$ROWS_FILE" ] || { echo "missing $ROWS_FILE (deck<TAB>date<TAB>old-post-id per line)"; exit 1; }
ROWS=()
while IFS=$'\t' read -r d t o; do [ -n "$d" ] && ROWS+=("$d|$t|$o"); done < "$ROWS_FILE"

upload_path() { # $1=file -> prints Postiz URL
  postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'
}

for row in "${ROWS[@]}"; do
  IFS='|' read -r dir date oldid <<< "$row"
  day="${date:0:10}"
  content=$(jq -r --arg d "$day" '.posts[] | select(.publishDate[0:10]==$d) | .content' "$POSTS")
  if [ -z "$content" ]; then echo "✗ $dir: no content for $day — skipping"; continue; fi

  # upload all 7 -tt slides
  urls=""
  ok=1
  for n in 01 02 03 04 05 06 07; do
    f="$dir/slide-${n}-tt.png"
    [ -f "$f" ] || { echo "✗ $dir: missing $f"; ok=0; break; }
    u=$(upload_path "$f")
    [ -n "$u" ] || { echo "✗ $dir: upload failed for $f"; ok=0; break; }
    urls="${urls:+$urls,}$u"
  done
  [ "$ok" = 1 ] || { echo "✗ $dir: aborting, old post kept"; continue; }

  # create new post
  out=$(postiz posts:create -c "$content" -m "$urls" -s "$date" -i "$INTEGRATION" --settings "$SETTINGS" 2>&1)
  newid=$(echo "$out" | grep -oE 'cm[a-z0-9]{20,}' | head -1)
  if [ -z "$newid" ] || [ "$newid" = "$oldid" ]; then
    echo "✗ $dir: create did not return a new id — OLD POST KEPT. Output:"; echo "$out" | tail -3
    continue
  fi

  # delete old post only after new one exists
  postiz posts:delete "$oldid" >/dev/null 2>&1
  echo "✓ $dir  $day  new=$newid  (old $oldid deleted)"
done
echo "done"
