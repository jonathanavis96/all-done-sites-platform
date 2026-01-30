#!/usr/bin/env bash
# filter_acli_errors.sh - Filter and contextualize acli stderr output
#
# Usage: command 2>&1 | bash filter_acli_errors.sh
#
# Adds context to known harmless errors and deduplicates repeated messages

set -euo pipefail

# Track last error and count for deduplication
LAST_ERROR=""
ERROR_COUNT=0
LAST_ERROR_TIME=0

# Check if DEBUG mode is enabled
DEBUG="${DEBUG:-0}"

flush_suppressed() {
  if [[ "$ERROR_COUNT" -gt 1 ]]; then
    echo "[acli] ($((ERROR_COUNT - 1)) similar errors suppressed. Set DEBUG=1 to see all)" >&2
  fi
  ERROR_COUNT=0
  LAST_ERROR=""
  LAST_ERROR_TIME=0
}

while IFS= read -r line; do
  CURRENT_TIME=$(date +%s)

  # Detect "Session termination failed: 404" error
  if [[ "$line" =~ "Session termination failed: 404" ]]; then
    # Add context to the error message
    CONTEXTUALIZED="[acli] Session termination failed: 404 for cleanup action (session already removed or invalid endpoint) - HARMLESS: agent continues normally"

    # In DEBUG mode, print every occurrence
    if [[ "$DEBUG" == "1" ]]; then
      echo "$CONTEXTUALIZED" >&2
      continue
    fi

    # In normal mode, completely suppress 404 errors (they are expected/harmless)
    # Just track them for potential summary, but don't print
    if [[ "$LAST_ERROR" == "session_404" ]] && [[ $((CURRENT_TIME - LAST_ERROR_TIME)) -lt 5 ]]; then
      ((ERROR_COUNT++)) || true
      LAST_ERROR_TIME=$CURRENT_TIME
    else
      # Start tracking a new sequence
      LAST_ERROR="session_404"
      ERROR_COUNT=1
      LAST_ERROR_TIME=$CURRENT_TIME
    fi
    continue # Suppress in normal mode
  else
    # Flush suppressed count when different output appears
    if [[ "$ERROR_COUNT" -gt 0 ]]; then
      flush_suppressed
    fi

    # Pass through all other lines unchanged
    echo "$line"
  fi
done

# Flush any remaining suppressed count at EOF
flush_suppressed
