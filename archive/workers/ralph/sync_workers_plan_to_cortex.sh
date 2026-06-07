#!/usr/bin/env bash
# sync_workers_plan_to_cortex.sh - Copy workers plan to cortex for review
#
# Purpose: Copy `workers/IMPLEMENTATION_PLAN.md` to `cortex/IMPLEMENTATION_PLAN.md`
#          so Cortex can review what changed during execution.
#
# Direction: workers/ → cortex/ (one-way copy)
# Called by: loop.sh (one-time at start)
#
# Usage:   bash sync_workers_plan_to_cortex.sh [--dry-run] [--verbose]

set -euo pipefail

LOG_PREFIX="[sync_workers_plan_to_cortex]"
DRY_RUN="false"
VERBOSE="false"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="true" ;;
    --verbose) VERBOSE="true" ;;
    *)
      echo "$LOG_PREFIX ERROR: Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

log_info() { echo "$LOG_PREFIX $1"; }
log_verbose() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo "$LOG_PREFIX $1"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  :
else
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

WORKERS_PLAN="${REPO_ROOT}/workers/IMPLEMENTATION_PLAN.md"
CORTEX_PLAN="${REPO_ROOT}/cortex/IMPLEMENTATION_PLAN.md"

if [[ ! -f "$WORKERS_PLAN" ]]; then
  echo "$LOG_PREFIX ERROR: Workers plan not found: $WORKERS_PLAN" >&2
  exit 1
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[DRY RUN] Would copy $WORKERS_PLAN → $CORTEX_PLAN"
else
  cp "$WORKERS_PLAN" "$CORTEX_PLAN"
  log_info "Copied workers plan to cortex for review"
fi

log_verbose "Source: $WORKERS_PLAN"
log_verbose "Target: $CORTEX_PLAN"

exit 0
