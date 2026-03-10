#!/usr/bin/env bash
# cortex/one-shot.sh - Cortex One-Shot Planning Session via Claude Code
#
# Legacy Rovo Dev version: cortex/rovodev/one-shot.sh

set -euo pipefail

# Resolve script directory (cortex/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Usage help
usage() {
  cat <<EOF
Usage: bash cortex/one-shot.sh [OPTIONS]

Cortex Manager - One-shot planning session via Claude Code.

Options:
  --help, -h           Show this help message
  --model MODEL        Override model (opus, sonnet, haiku)
  --dangerously-skip-permissions  Skip all permission prompts

Examples:
  bash cortex/one-shot.sh                    # One-shot planning session
  bash cortex/one-shot.sh --model sonnet     # Use Sonnet (less quota)

Description:
  Cortex reads the current repository state and provides strategic
  direction by creating Task Contracts for Ralph workers.

  For interactive chat, use: bash cortex/cortex-alldonesites.bash
  For legacy Rovo Dev runtime: bash cortex/rovodev/one-shot.sh

EOF
}

# Defaults
MODEL_ARG=""
SKIP_PERMISSIONS="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --model)
      MODEL_ARG="${2:-}"
      shift 2
      ;;
    --dangerously-skip-permissions)
      SKIP_PERMISSIONS="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

# Model resolution for Claude Code
CLAUDE_MODEL_FLAG=""
if [[ -n "$MODEL_ARG" ]]; then
  case "$MODEL_ARG" in
    opus | opus46 | opus-4-6)
      CLAUDE_MODEL_FLAG="--model claude-opus-4-6"
      ;;
    sonnet | sonnet46 | sonnet-4-6)
      CLAUDE_MODEL_FLAG="--model claude-sonnet-4-6"
      ;;
    haiku | haiku45 | haiku-4-5)
      CLAUDE_MODEL_FLAG="--model claude-haiku-4-5-20251001"
      ;;
    *)
      CLAUDE_MODEL_FLAG="--model $MODEL_ARG"
      ;;
  esac
fi

# Check required files exist
REQUIRED_FILES=(
  "cortex/CORTEX_SYSTEM_PROMPT.md"
  "cortex/snapshot.sh"
  "cortex/DECISIONS.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Required file missing: $file" >&2
    exit 1
  fi
done

echo "========================================"
echo "Cortex Manager - One-Shot Planning"
echo "   All Done Sites"
echo "========================================"
echo ""

# Run cleanup before generating context
if [[ -x "cortex/cleanup_cortex_plan.sh" ]]; then
  echo "Running plan cleanup..."
  if bash cortex/cleanup_cortex_plan.sh 2>/dev/null; then
    echo "Plan cleanup complete"
  else
    echo "Plan cleanup skipped (no completed tasks or error)"
  fi
  echo ""
fi

echo "Generating context snapshot..."
SNAPSHOT_OUTPUT=$(bash cortex/snapshot.sh 2>/dev/null || echo "Snapshot generation failed")
echo "Snapshot generated."
echo ""

# Build the system prompt
SYSTEM_PROMPT=$(cat <<EOF
$(cat cortex/CORTEX_SYSTEM_PROMPT.md)

---

# Current Repository State

${SNAPSHOT_OUTPUT}

---

# Architectural Decisions

$(cat cortex/DECISIONS.md)
EOF
)

# Build the one-shot planning message
PLANNING_MESSAGE=$(cat <<EOF
You are Cortex, starting a one-shot planning session for All Done Sites.

Review the current repository state, implementation plan progress, and pending gaps.
Then:

1. Assess what has been completed since last session
2. Identify any blockers or issues
3. Update workers/IMPLEMENTATION_PLAN.md with new task contracts if needed
4. Update cortex/THOUGHTS.md with current mission status
5. Summarize what Ralph should work on next

Be concise and actionable. Focus on the highest-priority work.
EOF
)

echo "========================================"
echo "Invoking Cortex via Claude Code..."
echo "========================================"
echo ""

# Write system prompt to temp file
PROMPT_FILE=$(mktemp /tmp/cortex_alldonesites_oneshot_XXXXXX.md)
echo "$SYSTEM_PROMPT" > "$PROMPT_FILE"

# Build Claude command
CLAUDE_CMD="claude"
if [[ -n "$CLAUDE_MODEL_FLAG" ]]; then
  CLAUDE_CMD="$CLAUDE_CMD $CLAUDE_MODEL_FLAG"
fi
if [[ "$SKIP_PERMISSIONS" == "true" ]]; then
  CLAUDE_CMD="$CLAUDE_CMD --dangerously-skip-permissions"
fi

# Run one-shot (non-interactive with -p flag)
$CLAUDE_CMD --system-prompt "$(cat "$PROMPT_FILE")" -p "$PLANNING_MESSAGE"
EXIT_CODE=$?

# Cleanup
rm -f "$PROMPT_FILE"

echo ""
echo "========================================"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "Cortex planning session complete."
else
  echo "Cortex session ended with code ${EXIT_CODE}"
fi
echo "========================================"

exit $EXIT_CODE
