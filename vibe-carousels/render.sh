#!/usr/bin/env bash
# Screenshot every slide-*.html to a same-named PNG using headless Chrome.
# 2x device scale => crisp 2160x2700 (4:5) images, perfect for IG & TikTok.
# Resilient: retries a slide if Chrome is killed; one failure never aborts the batch.
# Pass --stale-only to re-render just slides whose HTML is newer than their PNG.
set -uo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")" && pwd)"
STALE_ONLY="${1:-}"

shoot() {
  # $3 = window size "WxH"; defaults to 4:5 if unset.
  local wsize="${3:-1080,1350}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
    --force-device-scale-factor=2 --window-size="$wsize" \
    --default-background-color=00000000 \
    --screenshot="$2" "file://$1" >/dev/null 2>&1
}

count=0; failed=0
for html in "$ROOT"/*/slide-*.html; do
  png="${html%.html}.png"
  if [ "$STALE_ONLY" = "--stale-only" ] && [ -f "$png" ] && [ ! "$html" -nt "$png" ]; then
    continue
  fi
  case "$html" in *-tt.html) wsize="1080,1920";; *) wsize="1080,1350";; esac
  ok=0
  for attempt in 1 2 3; do
    shoot "$html" "$png" "$wsize"
    if [ -s "$png" ] && [ ! "$html" -nt "$png" ]; then ok=1; break; fi
    sleep 1
  done
  label="$(basename "$(dirname "$html")")/$(basename "$png")"
  if [ "$ok" = 1 ]; then count=$((count+1)); echo "✓ $label"; else failed=$((failed+1)); echo "✗ $label (failed after 3 tries)"; fi
done
echo "Rendered $count slides. Failed: $failed."
