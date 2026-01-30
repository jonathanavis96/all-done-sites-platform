#!/usr/bin/env bash
# cleanup_cortex_plan.sh - Archive completed tasks from cortex/IMPLEMENTATION_PLAN.md
#
# Usage:
#   bash cleanup_cortex_plan.sh --dry-run    # Preview what would be archived
#   bash cleanup_cortex_plan.sh              # Archive completed tasks to PLAN_DONE.md
#
# This file is copied from Brain's cortex/ helper pack.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_FILE="${SCRIPT_DIR}/IMPLEMENTATION_PLAN.md"
ARCHIVE_FILE="${SCRIPT_DIR}/PLAN_DONE.md"

normalize_markdown_blank_lines() {
  local file="$1"
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

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      echo "Usage: bash cleanup_cortex_plan.sh [--dry-run]"
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

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: IMPLEMENTATION_PLAN.md not found at $PLAN_FILE"
  exit 1
fi

if [[ ! -f "$ARCHIVE_FILE" ]]; then
  echo "Error: PLAN_DONE.md not found at $ARCHIVE_FILE"
  echo "Create it first with a header section."
  exit 1
fi

echo "Cleaning up cortex/IMPLEMENTATION_PLAN.md..."

archived_tasks=()
current_date=$(date '+%Y-%m-%d')
current_time=$(date '+%H:%M:%S')

while IFS= read -r line; do
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

existing_task_ids=$(grep -o '|[[:space:]]*[^|]*[[:space:]]*|[[:space:]]*[^|]*[[:space:]]*|' "$ARCHIVE_FILE" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)

{
  echo ""
  echo "### Archived on $current_date $current_time"
  echo ""
  echo "| Date | Task ID | Description |"
  echo "|------|---------|-------------|"
  for task in "${archived_tasks[@]}"; do
    task_id=$(echo "$task" | awk -F'|' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if ! echo "$existing_task_ids" | grep -qFx "$task_id"; then
      echo "$task"
    fi
  done
} >>"$ARCHIVE_FILE"

normalize_markdown_blank_lines "$ARCHIVE_FILE"

echo "Archived ${#archived_tasks[@]} tasks to PLAN_DONE.md"

temp_file=$(mktemp)
skip_task_subitems=false

while IFS= read -r line; do
  if echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\['; then
    if echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\[[xX]\]'; then
      skip_task_subitems=true
    else
      skip_task_subitems=false
      echo "$line" >>"$temp_file"
    fi
    continue
  fi

  if [[ "$skip_task_subitems" == "true" ]]; then
    if echo "$line" | grep -qE '^[[:space:]]+'; then
      continue
    else
      skip_task_subitems=false
    fi
  fi

  echo "$line" >>"$temp_file"
done <"$PLAN_FILE"

mv "$temp_file" "$PLAN_FILE"

echo "Done"
