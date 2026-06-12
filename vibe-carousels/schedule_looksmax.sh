#!/usr/bin/env bash
# Schedule the 10 looksmaxing decks (14-23) to IG + TikTok + YouTube.
# Evening slots (7 PM CDT = next-day 00:00Z), one deck per evening Jun 10-19.
# Captions/dates/titles come from /tmp/posts2.json (built by build_posts2.js).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

source "$ROOT/channel_id.sh"
IG=$(channel_id instagram)   || exit 1
TT=$(channel_id tiktok_alt)  || exit 1
YT=$(channel_id youtube_alt) || exit 1
IG_SET='{"post_type":"post"}'
TT_SET='{"privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,"autoAddMusic":"yes","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}'
POSTS="/tmp/posts2.json"
LOG="$ROOT/scheduled_looksmax.tsv"   # record of created post ids (for rollback if needed)

upload_path() { postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'; }
new_id() { echo "$1" | grep -oE 'cm[a-z0-9]{20,}' | head -1; }

# Optional args = whitelist of deck-dirs to process (default: all).
ONLY=" $* "
n=$(jq '.posts | length' "$POSTS")
for ((i=0;i<n;i++)); do
  dir=$(jq -r ".posts[$i].dir"   "$POSTS")
  date=$(jq -r ".posts[$i].date"  "$POSTS")
  title=$(jq -r ".posts[$i].title" "$POSTS")
  content=$(jq -r ".posts[$i].content" "$POSTS")
  day="${date:0:10}"
  [ "$#" -gt 0 ] && [[ "$ONLY" != *" $dir "* ]] && continue

  # ---- Instagram: 4:5 carousel ----
  ig_urls=""; ok=1
  for s in 01 02 03 04 05 06 07; do
    f="$dir/slide-${s}.png"; [ -f "$f" ] || { echo "✗ $dir IG: missing $f"; ok=0; break; }
    u=$(upload_path "$f"); [ -n "$u" ] || { echo "✗ $dir IG: upload failed $f"; ok=0; break; }
    ig_urls="${ig_urls:+$ig_urls,}$u"
  done
  if [ "$ok" = 1 ]; then
    out=$(postiz posts:create -c "$content" -m "$ig_urls" -s "$date" -i "$IG" --settings "$IG_SET" 2>&1)
    id=$(new_id "$out")
    if [ -n "$id" ]; then echo "✓ $dir  $day  IG=$id"; printf '%s\t%s\tinstagram\t%s\n' "$dir" "$day" "$id" >> "$LOG";
    else echo "✗ $dir IG: create failed:"; echo "$out" | tail -2; fi
  fi

  # ---- TikTok: 9:16 carousel (-tt) ----
  tt_urls=""; ok=1
  for s in 01 02 03 04 05 06 07; do
    f="$dir/slide-${s}-tt.png"; [ -f "$f" ] || { echo "✗ $dir TT: missing $f"; ok=0; break; }
    u=$(upload_path "$f"); [ -n "$u" ] || { echo "✗ $dir TT: upload failed $f"; ok=0; break; }
    tt_urls="${tt_urls:+$tt_urls,}$u"
  done
  if [ "$ok" = 1 ]; then
    out=$(postiz posts:create -c "$content" -m "$tt_urls" -s "$date" -i "$TT" --settings "$TT_SET" 2>&1)
    id=$(new_id "$out")
    if [ -n "$id" ]; then echo "✓ $dir  $day  TT=$id"; printf '%s\t%s\ttiktok\t%s\n' "$dir" "$day" "$id" >> "$LOG";
    else echo "✗ $dir TT: create failed:"; echo "$out" | tail -2; fi
  fi

  # ---- YouTube: Short (mp4) ----
  mp4="shorts/$dir.mp4"
  if [ -f "$mp4" ]; then
    u=$(upload_path "$mp4")
    if [ -n "$u" ]; then
      yt_desc="${content}"$'\n\n#shorts'
      yt_set=$(jq -nc --arg t "$title" '{title:$t, type:"public", selfDeclaredMadeForKids:"no"}')
      out=$(postiz posts:create -c "$yt_desc" -m "$u" -s "$date" -i "$YT" --settings "$yt_set" 2>&1)
      id=$(new_id "$out")
      if [ -n "$id" ]; then echo "✓ $dir  $day  YT=$id  \"$title\""; printf '%s\t%s\tyoutube\t%s\n' "$dir" "$day" "$id" >> "$LOG";
      else echo "✗ $dir YT: create failed:"; echo "$out" | tail -2; fi
    else echo "✗ $dir YT: video upload failed"; fi
  else echo "✗ $dir YT: missing $mp4"; fi
done
echo "done"
