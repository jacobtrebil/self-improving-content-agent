#!/usr/bin/env bash
# Build 9:16 YouTube Shorts (mp4) from each deck's -tt slides.
# Each slide held ~4s with a 0.5s crossfade. Output: shorts/<deck>.mp4
set -uo pipefail

D=4; T=0.5; FPS=30
ROOT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$ROOT/shorts"

DECKS=("$@")
if [ ${#DECKS[@]} -eq 0 ]; then
  DECKS=(04-hit-your-protein 05-the-scale-lies 06-fat-loss-no-bs 07-case-for-steps \
         08-fix-your-sleep 09-stop-drinking-calories 10-read-a-label \
         11-high-protein-meals 12-drink-enough-water 13-stop-falling-off)
fi

count=0; failed=0
for dir in "${DECKS[@]}"; do
  imgs=(); for f in "$ROOT/$dir"/slide-*-tt.png; do [ -f "$f" ] && imgs+=("$f"); done
  n=${#imgs[@]}
  if [ "$n" -lt 2 ]; then echo "✗ $dir: need >=2 slides (found $n)"; failed=$((failed+1)); continue; fi

  inputs=(); filt=""
  for ((i=0;i<n;i++)); do
    inputs+=(-loop 1 -t "$D" -i "${imgs[$i]}")
    filt+="[$i:v]fps=$FPS,scale=1080:1920,setsar=1,format=yuv420p[p$i];"
  done
  prev="[p0]"
  for ((k=1;k<n;k++)); do
    off=$(awk "BEGIN{printf \"%.2f\", $k*($D-$T)}")
    if (( k==n-1 )); then out="[v]"; else out="[x$k]"; fi
    filt+="${prev}[p$k]xfade=transition=fade:duration=$T:offset=$off$out;"
    prev="[x$k]"
  done
  filt="${filt%;}"

  if ffmpeg -y "${inputs[@]}" -filter_complex "$filt" -map "[v]" -r "$FPS" \
       -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart \
       "$ROOT/shorts/$dir.mp4" </dev/null >/dev/null 2>&1; then
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ROOT/shorts/$dir.mp4" 2>/dev/null)
    echo "✓ $dir.mp4  (${dur}s, $n slides)"; count=$((count+1))
  else
    echo "✗ $dir: ffmpeg failed"; failed=$((failed+1))
  fi
done
echo "Built $count. Failed: $failed."
