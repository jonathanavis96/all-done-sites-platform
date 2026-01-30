#!/usr/bin/env bash
# update_thunk_from_plan.sh
#
# Purpose:
#   Append newly-completed tasks from workers/IMPLEMENTATION_PLAN.md into
#   workers/ralph/THUNK.md using a strict, schema-safe markdown table format.
#
# Why:
#   Prevent MD056 table column mismatch errors caused by ad-hoc THUNK edits.
#   This script is designed to run automatically between loop.sh iterations.
#
# Behavior:
#   - Append-only: never rewrites existing THUNK entries.
#   - Dedupe: will not add a THUNK entry if the task ID already exists in THUNK.
#   - Priority is OPTIONAL in the plan. If missing, defaults to "UNKNOWN".
#   - Escapes pipe characters in description to preserve table columns.
#
# Inputs:
#   - workers/IMPLEMENTATION_PLAN.md
#   - workers/ralph/THUNK.md
#
# Output:
#   - Appends 5-column rows to THUNK.md: | THUNK # | Original # | Priority | Description | Completed |
#
# Usage:
#   bash workers/ralph/update_thunk_from_plan.sh
#   bash workers/ralph/update_thunk_from_plan.sh --dry-run
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Repo root resolution (same approach as cleanup_plan.sh)
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  :
else
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

PLAN_FILE="${REPO_ROOT}/workers/IMPLEMENTATION_PLAN.md"
THUNK_FILE="${REPO_ROOT}/workers/ralph/THUNK.md"

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: Plan file not found: $PLAN_FILE" >&2
  exit 1
fi

if [[ ! -f "$THUNK_FILE" ]]; then
  echo "Error: THUNK file not found: $THUNK_FILE" >&2
  exit 1
fi

# Escape markdown table pipes so descriptions cannot break the schema
escape_pipes() {
  local s="$1"
  # Replace literal | with \|
  s=${s//|/\\|}
  echo "$s"
}

# Extract task priority from a plan line.
# Priority format in plan is typically: ... **[HIGH]** ...
# Returns: HIGH|MEDIUM|LOW|CRITICAL|auto-cleanup|UNKNOWN
extract_priority() {
  local line="$1"

  # Prefer bracketed priority marker
  if echo "$line" | grep -qE '\*\*\[[A-Z-]+\]\*\*'; then
    echo "$line" | sed -nE 's/.*\*\*\[([A-Z-]+)\]\*\*.*/\1/p' | head -1
    return 0
  fi

  # If the task id suggests a special category, map it
  if echo "$line" | grep -qE '\*\*WARN\.'; then
    echo "HIGH"
    return 0
  fi

  echo "UNKNOWN"
}

# Extract task ID from a plan line.
# Plan tasks use: - [x] **<ID>** ...
extract_task_id() {
  local line="$1"
  echo "$line" | sed -nE 's/^[[:space:]]*-[[:space:]]*\[[xX]\][[:space:]]*\*\*([^*]+)\*\*.*/\1/p'
}

# Get next THUNK number by scanning existing THUNK table rows.
get_next_thunk_number() {
  local max=0
  local n

  # Rows look like: | 123 | ...
  while IFS= read -r n; do
    [[ -z "$n" ]] && continue
    if [[ "$n" =~ ^[0-9]+$ ]] && ((n > max)); then
      max=$n
    fi
  done < <(grep -E '^\|[[:space:]]*[0-9]+[[:space:]]*\|' "$THUNK_FILE" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2}')

  echo $((max + 1))
}

# Build a set of existing Original IDs in THUNK (column 3 in the 5-col schema)
# to dedupe by task id.
get_existing_original_ids() {
  # Exclude header rows
  grep -E '^\\|[[:space:]]*[0-9]+[[:space:]]*\\|' "$THUNK_FILE" |
    awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3); print $3}' |
    sed '/^$/d' |
    sort -u
}

existing_original_ids="$(get_existing_original_ids || true)"

completed_date="$(date '+%Y-%m-%d')"
next_thunk="$(get_next_thunk_number)"

new_rows=()

# Scan plan for completed tasks
while IFS= read -r line; do
  if ! echo "$line" | grep -qE '^[[:space:]]*-[[:space:]]*\[[xX]\]'; then
    continue
  fi

  task_id="$(extract_task_id "$line")"
  if [[ -z "$task_id" ]]; then
    continue
  fi

  # Skip if already present in THUNK
  if echo "$existing_original_ids" | grep -qFx "$task_id"; then
    continue
  fi

  priority="$(extract_priority "$line")"
  desc="$(escape_pipes "$line")"

  # Build canonical 5-column row
  # | THUNK # | Original # | Priority | Description | Completed |
  new_rows+=("| $next_thunk | $task_id | $priority | $desc | $completed_date |")
  next_thunk=$((next_thunk + 1))
done <"$PLAN_FILE"

if [[ ${#new_rows[@]} -eq 0 ]]; then
  echo "No new completed tasks to append to THUNK."
  exit 0
fi

echo "Found ${#new_rows[@]} new completed task(s) to append to THUNK."

if [[ "$DRY_RUN" == "true" ]]; then
  printf '%s\n' "${new_rows[@]}"
  exit 0
fi

# Append rows at end of file.
# Assumption: THUNK.md is append-friendly and already contains appropriate era/table headers.
{
  for row in "${new_rows[@]}"; do
    echo "$row"
  done
} >>"$THUNK_FILE"

echo "Appended ${#new_rows[@]} row(s) to $THUNK_FILE"
