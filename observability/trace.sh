#!/usr/bin/env bash
# Best-effort tracing for bash pipeline steps. Source this, and:
#   - every `postiz` call (posts:create / upload / posts:delete) is auto-traced
#     via a transparent function wrapper — no call-site changes needed.
#   - use `trace_span <id> <start_ms> <status> <output> [meta k=v]...` to trace
#     other steps (render, ffmpeg) manually; pair with `trace_now`.
#
# Tracing is fire-and-forget: it NEVER changes a command's stdout, exit code, or
# breaks the script if logging fails. No live IDs are written to spans.
#
# Honor TRACE_ID (group with a run) and TRACE_CAMPAIGN (also write to a campaign).

__TRACE_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# millisecond epoch (macOS `date` has no %N, so use perl which ships with macOS)
trace_now() { perl -MTime::HiRes=time -e 'printf "%d", time()*1000' 2>/dev/null || echo 0; }

# trace_span <span_id> <start_ms> <success|error> <output> [meta k=v]...
trace_span() {
  local span="$1" start="$2" status="$3" output="$4"; shift 4
  local now ms metas=() model=()
  now="$(trace_now)"; ms=$(( now - start )); [ "$ms" -lt 0 ] && ms=0
  while [ "$#" -gt 0 ]; do
    case "$1" in model=*) model=(--model "${1#model=}");; esac  # promote model= to a real field
    metas+=(--meta "$1"); shift
  done
  node "$__TRACE_REPO/observability/log-span.js" \
    --span "$span" --status "$status" --latency "$ms" --output "$output" \
    "${model[@]}" "${metas[@]}" \
    ${TRACE_ID:+--trace "$TRACE_ID"} ${TRACE_CAMPAIGN:+--campaign "$TRACE_CAMPAIGN"} \
    >/dev/null 2>&1 || true
}

# Transparent wrapper: shadows the `postiz` binary. Traced verbs are timed and
# logged; everything else passes straight through. `command postiz` calls the
# real CLI. Span output is just "<verb> exit=<n>" — never content or IDs.
postiz() {
  case "${1:-}" in
    posts:create|upload|posts:delete)
      local verb="$1" start out status
      start="$(trace_now)"
      out="$(command postiz "$@" 2>&1)"; status=$?
      printf '%s\n' "$out"   # pass output through to the caller's $(...)/pipe
      trace_span "postiz.$verb" "$start" \
        "$([ "$status" -eq 0 ] && echo success || echo error)" \
        "$verb exit=$status" tool=postiz-cli model=postiz
      return $status ;;
    *)
      command postiz "$@" ;;
  esac
}
