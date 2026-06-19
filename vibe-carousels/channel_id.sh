#!/usr/bin/env bash
# channel_id <key> — prints the Postiz integration id for a channel key
# (tiktok_main, tiktok_alt, youtube_main, youtube_alt). Instagram is retired.
# Real IDs live in config/posting.local.yaml (gitignored, flat `key: id`).
# Recreate that file via `postiz integrations:list` — see config/posting.yaml.
channel_id() {
  local cfg id
  cfg="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/config/posting.local.yaml"
  [ -f "$cfg" ] || { echo "channel_id: missing $cfg — recreate it via 'postiz integrations:list'" >&2; return 1; }
  id=$(awk -F': *' -v k="$1" '$1==k {print $2; exit}' "$cfg")
  [ -n "$id" ] || { echo "channel_id: no entry for '$1' in $cfg" >&2; return 1; }
  printf '%s\n' "$id"
}
