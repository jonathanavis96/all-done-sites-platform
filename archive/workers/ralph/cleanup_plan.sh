#!/usr/bin/env bash
# cleanup_plan.sh - Archive completed tasks from IMPLEMENTATION_PLAN.md
#
# Usage:
#   bash cleanup_plan.sh --dry-run    # Preview what would be archived
#   bash cleanup_plan.sh              # Archive completed tasks to PLAN_DONE.md
#
# Features:
#   - Moves completed [x] tasks to PLAN_DONE.md with date stamp
#   - Removes empty phase sections from IMPLEMENTATION_PLAN.md
#   - Preserves pending [ ] tasks and phase headers with pending work

set -euo pipefail

# Resolve repository root reliably
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Try git rev-parse first (most reliable in git repos)
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  : # Success - REPO_ROOT is set
else
  # Fallback: deterministic path traversal from script location
  # Script is in workers/ralph/, so repo root is two levels up
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

# Use explicit paths from repo root
PLAN_FILE="${REPO_ROOT}/IMPLEMENTATION_PLAN.md"
ARCHIVE_FILE="${REPO_ROOT}/workers/PLAN_DONE.md"

normalize_markdown_blank_lines() {
  local file="$1"
  # Enforce markdown whitespace invariant: at most one blank line between blocks.
  # (i.e., collapse any run of 3+ newlines down to exactly 2 newlines).
  python3 - "$file" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
text = re.sub(r"\n{3,}", "\n\n", text)
path.write_text(text, encoding="utf-8")
PY
}

# Default flags
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      echo "Usage: bash cleanup_plan.sh [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Preview what would be archived (no modifications)"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate files exist
if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: IMPLEMENTATION_PLAN.md not found at $PLAN_FILE"
  exit 1
fi

if [[ ! -f "$ARCHIVE_FILE" ]]; then
  echo "Error: PLAN_DONE.md not found at $ARCHIVE_FILE"
  echo "Create it first with a header section."
  exit 1
fi

echo "Cleaning up IMPLEMENTATION_PLAN.md..."

# Warn about orphaned task entries (sub-items without a parent task)
# These occur when cleanup removes "- [x] **X.Y**" but leaves indented sub-items behind
# Detect: indented "- **Goal:**" or "- **Completed:**" lines that appear after a blank line
# (legitimate sub-items follow their parent task directly, orphans follow blank lines or headers)

# Build list of potentially orphaned entries by checking context
orphaned_entries=""
prev_line=""
line_num=0
while IFS= read -r line; do
  line_num=$((line_num + 1))
  # Check for indented sub-item pattern
  if echo "$line" | grep -qE '^[[:space:]]+-[[:space:]]+\*\*(Goal|AC|Completed):\*\*'; then
    # If previous line is blank or a header, this is orphaned
    if [[ -z "$prev_line" ]] || echo "$prev_line" | grep -qE '^###'; then
      orphaned_entries="${orphaned_entries}${line_num}: ${line}\n"
    fi
  fi
  prev_line="$line"
done <"$PLAN_FILE"

if [[ -n "$orphaned_entries" ]]; then
  echo ""
  echo "⚠️  WARNING: Found orphaned sub-items (no parent task - will never be cleaned up):"
  echo -e "$orphaned_entries" | head -10
  echo ""
  echo "Fix: Remove these lines or add a parent task '- [x] **X.Y.Z** Description' above them"
  echo ""
fi

# Collect completed tasks for archiving
archived_tasks=()
current_date=$(date '+%Y-%m-%d')
current_time=$(date '+%H:%M:%S')
current_phase=""

while IFS= read -r line; do
  # Track current phase
  if echo "$line" | grep -qE '^##[[:space:]]+Phase'; then
    current_phase=$(echo "$line" | sed -E 's/^##[[:space:]]+//')
  fi

  # Collect completed tasks
  if echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\[[xX]\]'; then
    task_id=$(echo "$line" | sed -E 's/^[[:space:]]*-[[:space:]]*\[[xX]\][[:space:]]*\*\*([^*]+)\*\*.*/\1/' || echo "unknown")
    archived_tasks+=("| $current_date | $task_id | $line |")
  fi
done <"$PLAN_FILE"

if [[ ${#archived_tasks[@]} -eq 0 ]]; then
  echo "No completed tasks to archive."
  exit 0
fi

echo "Found ${#archived_tasks[@]} completed tasks to archive."

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "Would archive:"
  for task in "${archived_tasks[@]}"; do
    echo "  $task"
  done
  echo ""
  echo "Run without --dry-run to apply changes."
  exit 0
fi

# Archive tasks to PLAN_DONE.md (with deduplication)
# Read existing task IDs into memory before writing
existing_task_ids=$(grep -o '|[[:space:]]*[^|]*[[:space:]]*|[[:space:]]*[^|]*[[:space:]]*|' "$ARCHIVE_FILE" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)

{
  echo ""
  echo "### Archived on $current_date $current_time"
  echo ""
  echo "| Date | Task ID | Description |"
  echo "|------|---------|-------------|"
  for task in "${archived_tasks[@]}"; do
    # Extract task ID from the task string (format: | date | task_id | description |)
    task_id=$(echo "$task" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Check if task_id already exists in the pre-read list
    if ! echo "$existing_task_ids" | grep -qFx "$task_id"; then
      echo "$task"
    fi
  done
} >>"$ARCHIVE_FILE"

normalize_markdown_blank_lines "$ARCHIVE_FILE"

echo "Archived ${#archived_tasks[@]} tasks to PLAN_DONE.md"

# Now remove completed tasks and empty phases from IMPLEMENTATION_PLAN.md
temp_file=$(mktemp)
removed_count=0
removed_phases=0

# First pass: identify phases with pending tasks
declare -A phase_has_pending
current_phase=""

while IFS= read -r line; do
  if echo "$line" | grep -qE '^##[[:space:]]+Phase'; then
    current_phase=$(echo "$line" | sed -E 's/^##[[:space:]]+//')
    phase_has_pending["$current_phase"]=false
  fi

  if [[ -n "$current_phase" ]] && echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\[[[:space:]]\]'; then
    phase_has_pending["$current_phase"]=true
  fi
done <"$PLAN_FILE"

# Second pass: write output
current_phase=""
skip_phase=false
skip_task_subitems=false

while IFS= read -r line; do
  # Detect phase headers
  if echo "$line" | grep -qE '^##[[:space:]]+Phase'; then
    current_phase=$(echo "$line" | sed -E 's/^##[[:space:]]+//')
    skip_task_subitems=false # Reset on new phase

    if [[ "${phase_has_pending[$current_phase]:-false}" == "true" ]]; then
      skip_phase=false
      echo "$line" >>"$temp_file"
    else
      skip_phase=true
      removed_phases=$((removed_phases + 1))
    fi
    continue
  fi

  # Skip content in empty phases
  if [[ "$skip_phase" == "true" ]]; then
    continue
  fi

  # Detect new task (pending or completed) - resets sub-item skipping
  if echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\['; then
    # Check if this is a completed task
    if echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\[[xX]\]'; then
      removed_count=$((removed_count + 1))
      skip_task_subitems=true # Skip following indented sub-items
    else
      skip_task_subitems=false # Pending task - keep its sub-items
      echo "$line" >>"$temp_file"
    fi
    continue
  fi

  # Skip indented sub-items of completed tasks
  # Sub-items are indented lines starting with "- **" (e.g., "  - **Goal:**")
  if [[ "$skip_task_subitems" == "true" ]]; then
    if echo "$line" | grep -qE '^[[:space:]]+'; then
      # Indented line - skip it (belongs to completed task)
      continue
    else
      # Non-indented line - stop skipping (new section or blank line between tasks)
      skip_task_subitems=false
    fi
  fi

  # Keep everything else
  echo "$line" >>"$temp_file"
done <"$PLAN_FILE"

# Apply changes
mv "$temp_file" "$PLAN_FILE"

echo ""
echo "Summary:"
echo "  Completed tasks removed: $removed_count"
echo "  Empty phases removed: $removed_phases"
echo "Changes applied to $PLAN_FILE"
echo ""
echo "Done"
