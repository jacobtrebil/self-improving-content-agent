#!/usr/bin/env bash
# Schedule a batch of carousel decks to TikTok + YouTube only (Instagram excluded
# — IG is blocking carousels). Mirrors schedule_looksmax.sh minus the IG block.
# Reads /tmp/posts2.json: [{ dir, camp, date, title, content }] where `camp` is the
# campaign dir (repo-relative) used to route created post ids into its scheduled.tsv.
# Evening slots = 7 PM CDT = next-day 00:00Z. Optional args = whitelist of deck dirs.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

source "$ROOT/channel_id.sh"
source "$ROOT/../observability/trace.sh"   # auto-traces postiz calls
# Channel keys default to the alt accounts; override via TT_KEY / YT_KEY env vars
# (e.g. YT_KEY=youtube_main to post to the "Vibe" channel instead of "Vibe Health App").
TT=$(channel_id "${TT_KEY:-tiktok_alt}")  || exit 1
YT=$(channel_id "${YT_KEY:-youtube_alt}") || exit 1
# Which platforms to post to (space-separated). Default both; set PLATFORMS="tt"
# or PLATFORMS="yt" to schedule a single channel on its own timeline.
PLATFORMS="${PLATFORMS:-tt yt}"
TT_SET='{"privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,"autoAddMusic":"yes","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}'
POSTS="/tmp/posts2.json"
REPO="$(cd "$ROOT/.." && pwd)"

upload_path() { postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'; }
new_id() { echo "$1" | grep -oE 'cm[a-z0-9]{20,}' | head -1; }

ONLY=" $* "
n=$(jq '.posts | length' "$POSTS")
for ((i=0;i<n;i++)); do
  dir=$(jq -r ".posts[$i].dir"    "$POSTS")
  camp=$(jq -r ".posts[$i].camp"  "$POSTS")
  date=$(jq -r ".posts[$i].date"  "$POSTS")
  title=$(jq -r ".posts[$i].title" "$POSTS")
  content=$(jq -r ".posts[$i].content" "$POSTS")
  day="${date:0:10}"
  log="$REPO/$camp/scheduled.tsv"
  [ "$#" -gt 0 ] && [[ "$ONLY" != *" $dir "* ]] && continue

  # ---- TikTok: 9:16 carousel (-tt, downscaled to 1080x1920) ----
  # TikTok rejects photos >1080p; never upload the 2x -tt master (2160x3840).
  if [[ " $PLATFORMS " == *" tt "* ]]; then
  tt_urls=""; ok=1
  for s in 01 02 03 04 05 06 07; do
    f="$dir/slide-${s}-tt.png"; [ -f "$f" ] || { echo "✗ $dir TT: missing $f"; ok=0; break; }
    f1080="$dir/slide-${s}-tt1080.png"
    sips -z 1920 1080 "$f" --out "$f1080" >/dev/null 2>&1 || { echo "✗ $dir TT: resize failed $f"; ok=0; break; }
    u=$(upload_path "$f1080"); [ -n "$u" ] || { echo "✗ $dir TT: upload failed $f1080"; ok=0; break; }
    tt_urls="${tt_urls:+$tt_urls,}$u"
  done
  if [ "$ok" = 1 ]; then
    out=$(postiz posts:create -c "$content" -m "$tt_urls" -s "$date" -i "$TT" --settings "$TT_SET" 2>&1)
    id=$(new_id "$out")
    if [ -n "$id" ]; then echo "✓ $dir  $day  TT=$id"; printf '%s\t%s\ttiktok\t%s\n' "$dir" "$day" "$id" >> "$log";
    else echo "✗ $dir TT: create failed:"; echo "$out" | tail -2; fi
  fi
  fi  # end PLATFORMS tt

  # ---- YouTube: Short (mp4) ----
  if [[ " $PLATFORMS " == *" yt "* ]]; then
  mp4="shorts/$dir.mp4"
  if [ -f "$mp4" ]; then
    u=$(upload_path "$mp4")
    if [ -n "$u" ]; then
      yt_desc="${content}"$'\n\n#shorts'
      yt_set=$(jq -nc --arg t "$title" '{title:$t, type:"public", selfDeclaredMadeForKids:"no"}')
      out=$(postiz posts:create -c "$yt_desc" -m "$u" -s "$date" -i "$YT" --settings "$yt_set" 2>&1)
      id=$(new_id "$out")
      if [ -n "$id" ]; then echo "✓ $dir  $day  YT=$id  \"$title\""; printf '%s\t%s\tyoutube\t%s\n' "$dir" "$day" "$id" >> "$log";
      else echo "✗ $dir YT: create failed:"; echo "$out" | tail -2; fi
    else echo "✗ $dir YT: video upload failed"; fi
  else echo "✗ $dir YT: missing $mp4"; fi
  fi  # end PLATFORMS yt
done
echo "done"
