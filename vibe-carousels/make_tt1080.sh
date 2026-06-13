#!/usr/bin/env bash
# make_tt1080.sh — produce TikTok-compliant carousel images.
#
# WHY: the 9:16 master slides render at 2160x3840 (2x retina). TikTok's photo
# mode REJECTS anything over 1080p with:
#   "An error occurred while posting on tiktok: Video must be at least 720p,
#    Picture must no exceed 1080p"
# So every TikTok photo carousel must upload a downscaled 1080x1920 copy.
#
# This script writes slide-NN-tt1080.png next to each slide-NN-tt.png.
# TikTok scheduling uploads the -tt1080 files; IG (4:5) and YouTube (mp4) are
# unaffected. Videos already ship at 1080x1920 (>=720p), so they need no change.
#
# Usage:
#   bash make_tt1080.sh <deck-dir> [<deck-dir> ...]   # specific decks
#   bash make_tt1080.sh --all                          # every deck with -tt slides
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

decks=("$@")
if [ "${1:-}" = "--all" ] || [ "$#" -eq 0 ]; then
  decks=()
  for d in */; do [ -e "${d}slide-01-tt.png" ] && decks+=("${d%/}"); done
fi

made=0
for deck in "${decks[@]}"; do
  deck="${deck%/}"
  for src in "$deck"/slide-[0-9][0-9]-tt.png; do
    [ -f "$src" ] || continue
    out="${src%-tt.png}-tt1080.png"
    # sips -z HEIGHT WIDTH  -> 1920 tall, 1080 wide (exact, preserves 9:16)
    if sips -z 1920 1080 "$src" --out "$out" >/dev/null 2>&1; then
      made=$((made+1))
    else
      echo "✗ resize failed: $src" >&2
    fi
  done
  echo "✓ $deck"
done
echo "done — wrote $made slide-NN-tt1080.png file(s)"
