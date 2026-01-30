#!/usr/bin/env bash
# capture_gap.sh - Append a new gap entry to cortex/GAP_CAPTURE.md and mark it pending.
#
# This implements the cross-project gap capture marker protocol:
# - Write gap entry to ./cortex/GAP_CAPTURE.md
# - Touch ./cortex/.gap_pending
# Brain repo later runs: bash cortex/sync_gaps.sh
# which imports gaps into brain/skills/self-improvement/GAP_BACKLOG.md
#
# Usage:
#   bash workers/ralph/capture_gap.sh "Suggested Skill Name" \
#     --type "Pattern" \
#     --priority "P1" \
#     --why "1-2 lines" \
#     --trigger "what you were doing" \
#     --evidence "paths/notes"
#
# Notes:
# - Title is recorded as: "YYYY-MM-DD HH:MM — <Suggested Skill Name>"
# - Project name is inferred from the repo root folder name.

set -euo pipefail

LOG_PREFIX="[capture_gap]"

die() { echo "$LOG_PREFIX ERROR: $1" >&2; exit 1; }
info() { echo "$LOG_PREFIX $1"; }

if [[ $# -lt 1 ]]; then
  die "Missing required positional arg: <Suggested Skill Name>"
fi

SUGGESTED_NAME="$1"
shift

TYPE=""
PRIORITY=""
WHY=""
TRIGGER=""
EVIDENCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="${2:-}"; shift 2 ;;
    --priority) PRIORITY="${2:-}"; shift 2 ;;
    --why) WHY="${2:-}"; shift 2 ;;
    --trigger) TRIGGER="${2:-}"; shift 2 ;;
    --evidence) EVIDENCE="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '1,120p' "$0"
      exit 0
      ;;
    *)
      die "Unknown arg: $1"
      ;;
  esac
done

[[ -n "$TYPE" ]] || die "--type is required"
[[ -n "$PRIORITY" ]] || die "--priority is required"
[[ -n "$WHY" ]] || die "--why is required"
[[ -n "$TRIGGER" ]] || die "--trigger is required"
[[ -n "$EVIDENCE" ]] || die "--evidence is required"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_NAME="$(basename "$ROOT")"

CORTEX_DIR="$ROOT/cortex"
GAP_FILE="$CORTEX_DIR/GAP_CAPTURE.md"
MARKER="$CORTEX_DIR/.gap_pending"

mkdir -p "$CORTEX_DIR"

if [[ ! -f "$GAP_FILE" ]]; then
  cat >"$GAP_FILE" <<EOF
# Gap Capture - $PROJECT_NAME

Local gap capture for this project. Gaps are synced to brain's \`GAP_BACKLOG.md\` via marker file protocol.

## Captured Gaps

<!-- Add new gap entries below this line -->
EOF
fi

stamp="$(date '+%Y-%m-%d %H:%M')"

{
  echo ""
  echo "### $stamp — $SUGGESTED_NAME"
  echo "- **Type:** $TYPE"
  echo "- **Why useful:** $WHY"
  echo "- **When triggered:** $TRIGGER"
  echo "- **Evidence:** $EVIDENCE"
  echo "- **Priority:** $PRIORITY"
  echo "- **Project:** $PROJECT_NAME"
} >>"$GAP_FILE"

touch "$MARKER"

info "Appended gap to: $GAP_FILE"
info "Marked pending: $MARKER"
