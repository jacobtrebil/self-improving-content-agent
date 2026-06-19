#!/usr/bin/env bash
# Refresh all scheduled posts in /tmp/refresh_manifest.tsv with updated media.
# Per post: upload new media -> create new post (same caption/date/settings) -> delete old.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CUR="/tmp/posts_current.json"
MAN="${1:-/tmp/refresh_manifest.tsv}"

source "$ROOT/channel_id.sh"
TT_INT=$(channel_id tiktok_alt)  || exit 1
YT_INT=$(channel_id youtube_alt) || exit 1
TT_SET='{"privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,"autoAddMusic":"yes","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}'

yt_title() {
  case "$1" in
    04) echo "How to Actually Hit Your Protein Goal";;
    05) echo "Why the Scale Lies to You";;
    06) echo "Fat Loss, Without the BS";;
    07) echo "The Case for 8,000 Steps a Day";;
    08) echo "Fix Your Sleep, Fix Everything";;
    09) echo "Stop Drinking Your Calories";;
    10) echo "Read a Nutrition Label in 10 Seconds";;
    11) echo "5 High-Protein Meals Under 500 Calories";;
    12) echo "Are You Actually Drinking Enough Water?";;
    13) echo "Why You Keep Falling Off (and How to Stop)";;
    14) echo "Sharpen Your Jawline — No Surgery Needed";;
    15) echo "Clear Skin Starts in Your Kitchen";;
    16) echo "Kill Your Under-Eye Bags";;
    17) echo "Looksmax Your Hair";;
    18) echo "How to Get a Leaner Face";;
    19) echo "Stand Taller — The Instant Looksmax";;
    20) echo "Beauty Sleep Is Actually Real";;
    21) echo "Debloat Your Face in 3 Days";;
    22) echo "Real Glow Comes From Within";;
    23) echo "The Looksmaxing Tier List";;
  esac
}

upload_path() {
  postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'
}

ok=0; fail=0
while IFS=$'\t' read -r id plat date folder deck; do
  [ -n "${id:-}" ] || continue
  sdate="${date/.000Z/Z}"
  content=$(jq -r --arg i "$id" '.posts[] | select(.id==$i) | .content' "$CUR")
  [ -n "$content" ] || { echo "✗ $folder/$plat: no content for $id"; fail=$((fail+1)); continue; }

  case "$plat" in
    tiktok)               INT="$TT_INT"; SET="$TT_SET";              KIND=img; SUF="-tt";;
    youtube)              INT="$YT_INT"; KIND=vid;
                          SET=$(jq -nc --arg t "$(yt_title "$deck")" '{title:$t,type:"public",selfDeclaredMadeForKids:"no"}');;
    *) echo "✗ unknown platform $plat"; fail=$((fail+1)); continue;;
  esac

  # build media list
  urls=""; bad=0
  if [ "$KIND" = vid ]; then
    f="$ROOT/shorts/$folder.mp4"; [ -f "$f" ] || { echo "✗ $folder/$plat: missing $f"; fail=$((fail+1)); continue; }
    urls=$(upload_path "$f"); [ -n "$urls" ] || { echo "✗ $folder/$plat: video upload failed"; fail=$((fail+1)); continue; }
  else
    for n in 01 02 03 04 05 06 07; do
      f="$ROOT/$folder/slide-${n}${SUF}.png"
      [ -f "$f" ] || { echo "✗ $folder/$plat: missing $f"; bad=1; break; }
      u=$(upload_path "$f"); [ -n "$u" ] || { echo "✗ $folder/$plat: upload failed $f"; bad=1; break; }
      urls="${urls:+$urls,}$u"
    done
    [ "$bad" = 0 ] || { fail=$((fail+1)); continue; }
  fi

  out=$(postiz posts:create -c "$content" -m "$urls" -s "$sdate" -i "$INT" --settings "$SET" 2>&1)
  newid=$(echo "$out" | grep -oE 'cm[a-z0-9]{20,}' | head -1)
  if [ -z "$newid" ] || [ "$newid" = "$id" ]; then
    echo "✗ $folder/$plat: create failed (old kept). $(echo "$out" | tail -1)"; fail=$((fail+1)); continue
  fi
  postiz posts:delete "$id" >/dev/null 2>&1
  echo "✓ $folder  $plat  ${sdate:0:10}  new=$newid"
  ok=$((ok+1))
done < "$MAN"
echo "Refreshed $ok. Failed: $fail."
