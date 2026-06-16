#!/usr/bin/env bash
# Scaffold a new campaign folder with the standard structure.
#
# Usage:
#   campaigns/new-campaign.sh <format> <slug> [--count N] [--date YYYY-MM-DD]
#
# Example:
#   campaigns/new-campaign.sh looksmax-carousel looksmax-transformation --count 10
#   → campaigns/2026-06-13-looksmax-transformation-batch-001/
#       brief.md  generated/  approved/  rendered/  rejected/  scheduled.tsv  results.tsv
#
# <format> must be one of the folders in /formats. The slug is a short kebab
# name for the batch. Batch number auto-increments for the same date+slug.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORMATS_DIR="$ROOT/formats"

err() { echo "✗ $1" >&2; exit 1; }

[ $# -ge 2 ] || err "usage: new-campaign.sh <format> <slug> [--count N] [--date YYYY-MM-DD]"
FORMAT="$1"; SLUG_RAW="$2"; shift 2
COUNT=10
DATE="$(date +%F)"
while [ $# -gt 0 ]; do
  case "$1" in
    --count) COUNT="$2"; shift 2;;
    --date)  DATE="$2";  shift 2;;
    *) err "unknown arg: $1";;
  esac
done

[ -d "$FORMATS_DIR/$FORMAT" ] || err "unknown format '$FORMAT'. Options: $(ls "$FORMATS_DIR" | tr '\n' ' ')"
# normalize slug → lowercase kebab
SLUG="$(echo "$SLUG_RAW" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-' | sed 's/-\{2,\}/-/g;s/^-//;s/-$//')"
[ -n "$SLUG" ] || err "slug is empty after normalizing"

# next batch number for this date+slug
n=1
while [ -d "$ROOT/campaigns/${DATE}-${SLUG}-batch-$(printf '%03d' "$n")" ]; do n=$((n+1)); done
BATCH="$(printf '%03d' "$n")"
NAME="${DATE}-${SLUG}-batch-${BATCH}"
DIR="$ROOT/campaigns/$NAME"

mkdir -p "$DIR"/{generated,approved,rendered,rejected,traces,evals}
for d in generated approved rendered rejected traces evals; do touch "$DIR/$d/.gitkeep"; done

printf 'key\tdate\tplatform\tpost_id\n' > "$DIR/scheduled.tsv"
printf 'key\tformat\taccount\tdate\tviews\tlikes\treach\tpulled_at\n' > "$DIR/results.tsv"

# brief.md template — prefill the numbered item list
{
  cat <<EOF
# ${SLUG} — ${FORMAT}

- **Created:** ${DATE}
- **Format:** ${FORMAT}  · see /formats/${FORMAT}/
- **Count:** ${COUNT} posts
- **Status:** draft   # draft → generating → review → approved → scheduled → live
- **Channels:** instagram, tiktok_alt, youtube_alt   # edit; ids via vibe-carousels/channel_id.sh
- **Cadence:** 1 post/day at 17:00Z   # edit

## Goal
<one or two lines: what this batch is for and the angle>

## Audience
<who this targets>

## Items to generate
# One line per post — a topic (carousels) or persona/hook seed (reels).
# The generator turns each into a spec in generated/ per
# /formats/${FORMAT}/schema.yaml and /formats/${FORMAT}/prompt.md.
EOF
  for i in $(seq 1 "$COUNT"); do echo "${i}. "; done
  cat <<EOF

## Constraints
- Pass /formats/${FORMAT}/validation.md — hard fails block rendering.
- Brand: /config/brand.yaml. No medical claims; hedge outcomes ("may help").
- No hook reuse vs other campaigns or vibe-carousels/build.js.

## Notes
EOF
} > "$DIR/brief.md"

echo "✓ created campaigns/$NAME"
echo "    brief.md  generated/  approved/  rendered/  rejected/  scheduled.tsv  results.tsv"
echo "  Next: fill in brief.md (goal + the ${COUNT} items), then generate into generated/."
