#!/usr/bin/env bash
# Schedule a batch of carousel decks as YouTube Shorts to the MAIN brand YouTube
# (youtube_main). Uploads shorts/<dir>.mp4 with the deck's title + caption.
# Reads /tmp/posts2.json: [{dir,camp,date,title,content}]. Optional args = whitelist
# of deck dirs. Channel key overridable via YT_KEY env.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT"
source "$ROOT/channel_id.sh"
source "$ROOT/../observability/trace.sh"   # auto-traces postiz calls
YT=$(channel_id "${YT_KEY:-youtube_main}") || exit 1
POSTS="/tmp/posts2.json"; REPO="$(cd "$ROOT/.." && pwd)"

upload_path() { postiz upload "$1" 2>/dev/null | grep -o '"path"[ ]*:[ ]*"[^"]*"' | head -1 | sed -E 's/.*"path"[ ]*:[ ]*"([^"]+)".*/\1/'; }
new_id() { echo "$1" | grep -oE 'cm[a-z0-9]{20,}' | head -1; }

ONLY=" $* "
n=$(jq '.posts | length' "$POSTS")
for ((i=0;i<n;i++)); do
  dir=$(jq -r ".posts[$i].dir" "$POSTS"); camp=$(jq -r ".posts[$i].camp" "$POSTS")
  date=$(jq -r ".posts[$i].date" "$POSTS"); title=$(jq -r ".posts[$i].title" "$POSTS")
  content=$(jq -r ".posts[$i].content" "$POSTS")
  day="${date:0:10}"; log="$REPO/$camp/scheduled.tsv"
  [ "$#" -gt 0 ] && [[ "$ONLY" != *" $dir "* ]] && continue

  mp4="shorts/$dir.mp4"
  if [ ! -f "$mp4" ]; then echo "✗ $dir YT: missing $mp4"; continue; fi
  u=$(upload_path "$mp4")
  if [ -z "$u" ]; then echo "✗ $dir YT: video upload failed"; continue; fi
  yt_desc="${content}"$'\n\n#shorts'
  yt_set=$(jq -nc --arg t "$title" '{title:$t, type:"public", selfDeclaredMadeForKids:"no"}')
  out=$(postiz posts:create -c "$yt_desc" -m "$u" -s "$date" -i "$YT" --settings "$yt_set" 2>&1)
  id=$(new_id "$out")
  if [ -n "$id" ]; then echo "✓ $dir  $day ${date:11:5}  YT=$id  \"$title\""; printf '%s\t%s\tyoutube\t%s\n' "$dir" "$day" "$id" >> "$log";
  else echo "✗ $dir YT: create failed:"; echo "$out" | tail -2; fi
done
echo "done"
