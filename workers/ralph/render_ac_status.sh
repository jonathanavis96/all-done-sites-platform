#!/usr/bin/env bash
# render_ac_status.sh - Generate AC status dashboard from verifier output
# Reads .verify/latest.txt and outputs a markdown status table
#
# Usage: ./render_ac_status.sh [--inline]
#   --inline: Update IMPLEMENTATION_PLAN.md in place (between markers)
#   (default): Output to stdout

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LATEST_FILE="${SCRIPT_DIR}/.verify/latest.txt"
PLAN_FILE="${SCRIPT_DIR}/IMPLEMENTATION_PLAN.md"

# Markers for inline update
START_MARKER="<!-- AC_STATUS_START -->"
END_MARKER="<!-- AC_STATUS_END -->"

generate_dashboard() {
  if [[ ! -f "$LATEST_FILE" ]]; then
    echo "❌ No verification report found. Run ./verifier.sh first."
    return 1
  fi

  local timestamp
  timestamp=$(grep "^Time:" "$LATEST_FILE" | cut -d' ' -f2-)
  local git_ref
  git_ref=$(grep "^Git:" "$LATEST_FILE" | cut -d' ' -f2-)

  # Extract summary stats
  local pass
  pass=$(grep "PASS:" "$LATEST_FILE" | tail -1 | grep -oE '[0-9]+')
  local fail
  fail=$(grep "FAIL:" "$LATEST_FILE" | tail -1 | grep -oE '[0-9]+')
  local warn
  warn=$(grep "WARN:" "$LATEST_FILE" | tail -1 | grep -oE '[0-9]+')
  local hash_status
  hash_status=$(grep "Hash guard:" "$LATEST_FILE" | cut -d' ' -f3)

  cat <<EOF
## Acceptance Criteria Status

> **Auto-generated from verifier** — Last run: ${timestamp:-unknown} (${git_ref:-unknown})

| Metric | Value |
|--------|-------|
| ✅ PASS | ${pass:-0} |
| ❌ FAIL | ${fail:-0} |
| ⚠️ WARN | ${warn:-0} |
| 🔒 Hash Guard | ${hash_status:-unknown} |

### Check Details

| ID | Status | Description |
|----|--------|-------------|
EOF

  # Parse individual checks from latest.txt
  local current_id=""
  local current_status=""
  local current_desc=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^\\[(PASS|FAIL|WARN|SKIP)\\]\ ([A-Za-z0-9_.]+) ]]; then
      # Output previous row if exists
      if [[ -n "$current_id" ]]; then
        echo "| \`$current_id\` | $current_status | $current_desc |"
      fi
      current_status="${BASH_REMATCH[1]}"
      current_id="${BASH_REMATCH[2]}"
      current_desc=""
      # Map status to emoji
      case "$current_status" in
        PASS) current_status="✅" ;;
        FAIL) current_status="❌" ;;
        WARN) current_status="⚠️" ;;
        SKIP) current_status="⏭️" ;;
      esac
    elif [[ "$line" =~ ^[[:space:]]+desc:[[:space:]]*(.*) ]]; then
      current_desc="${BASH_REMATCH[1]}"
    fi
  done <"$LATEST_FILE"

  # Output last row
  if [[ -n "$current_id" ]]; then
    echo "| \`$current_id\` | $current_status | $current_desc |"
  fi

  echo ""
  echo "_Run \`./verifier.sh\` to refresh. Do not edit this section manually._"
}

update_inline() {
  if [[ ! -f "$PLAN_FILE" ]]; then
    echo "❌ IMPLEMENTATION_PLAN.md not found"
    return 1
  fi

  # Check if markers exist
  if ! grep -q "$START_MARKER" "$PLAN_FILE"; then
    echo "⚠️  Start marker not found in IMPLEMENTATION_PLAN.md"
    echo "Add these markers where you want the dashboard:"
    echo "  $START_MARKER"
    echo "  $END_MARKER"
    return 1
  fi

  if ! grep -q "$END_MARKER" "$PLAN_FILE"; then
    echo "⚠️  End marker not found in IMPLEMENTATION_PLAN.md"
    echo "The start marker exists but end marker is missing."
    echo "Add the end marker to complete the block:"
    echo "  $END_MARKER"
    return 1
  fi

  # Generate new content
  local dashboard
  dashboard=$(generate_dashboard)

  # Create temp file with updated content
  local tmp_file
  tmp_file=$(mktemp)
  awk -v start="$START_MARKER" -v end="$END_MARKER" -v content="$dashboard" '
        BEGIN { in_block = 0 }
        $0 ~ start { print; print content; in_block = 1; next }
        $0 ~ end { in_block = 0 }
        !in_block { print }
    ' "$PLAN_FILE" >"$tmp_file"

  mv "$tmp_file" "$PLAN_FILE"
  echo "✅ Updated IMPLEMENTATION_PLAN.md with AC status dashboard"
}

# Main
case "${1:-}" in
  --inline)
    update_inline
    ;;
  --help | -h)
    echo "Usage: $0 [--inline]"
    echo "  --inline: Update IMPLEMENTATION_PLAN.md in place"
    echo "  (default): Output dashboard to stdout"
    ;;
  *)
    generate_dashboard
    ;;
esac
