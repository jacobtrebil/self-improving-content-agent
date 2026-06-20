#!/usr/bin/env bash
# Schedule a batch of carousel decks to the MAIN brand TikTok only (tiktok_main =
# @vibehealthapp). TikTok photo carousel from the 9:16 -tt slides, downscaled to
# 1080x1920 (TikTok rejects >1080p). Reads /tmp/posts2.json: [{dir,camp,date,title,content}].
# Optional args = whitelist of deck dirs. Channel key overridable via TT_KEY env.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT"
source "$ROOT/channel_id.sh"
source "$ROOT/../observability/trace.sh"   # auto-traces postiz calls
TT=$(channel_id "${TT_KEY:-tiktok_main}") || exit 1
TT_SET='{"privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,"autoAddMusic":"yes","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}'
POSTS="/tmp/posts2.json"; REPO="$(cd "$ROOT/.." && pwd)"

upload_path() { postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'; }
new_id() { echo "$1" | grep -oE 'cm[a-z0-9]{20,}' | head -1; }

ONLY=" $* "
n=$(jq '.posts | length' "$POSTS")
for ((i=0;i<n;i++)); do
  dir=$(jq -r ".posts[$i].dir" "$POSTS"); camp=$(jq -r ".posts[$i].camp" "$POSTS")
  date=$(jq -r ".posts[$i].date" "$POSTS"); content=$(jq -r ".posts[$i].content" "$POSTS")
  day="${date:0:10}"; log="$REPO/$camp/scheduled.tsv"
  [ "$#" -gt 0 ] && [[ "$ONLY" != *" $dir "* ]] && continue

  tt_urls=""; ok=1
  for s in 01 02 03 04 05 06 07; do
    f="$dir/slide-${s}-tt.png"; [ -f "$f" ] || { echo "✗ $dir TT: missing $f"; ok=0; break; }
    f1080="$dir/slide-${s}-tt1080.png"
    sips -z 1920 1080 "$f" --out "$f1080" >/dev/null 2>&1 || { echo "✗ $dir TT: resize $f"; ok=0; break; }
    u=$(upload_path "$f1080"); [ -n "$u" ] || { echo "✗ $dir TT: upload $f1080"; ok=0; break; }
    tt_urls="${tt_urls:+$tt_urls,}$u"
  done
  [ "$ok" = 1 ] || continue
  out=$(postiz posts:create -c "$content" -m "$tt_urls" -s "$date" -i "$TT" --settings "$TT_SET" 2>&1)
  id=$(new_id "$out")
  if [ -n "$id" ]; then echo "✓ $dir  $day ${date:11:5}  TT=$id"; printf '%s\t%s\ttiktok\t%s\n' "$dir" "$day" "$id" >> "$log";
  else echo "✗ $dir TT: create failed:"; echo "$out" | tail -2; fi
done
echo "done"
