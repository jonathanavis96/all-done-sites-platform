#!/usr/bin/env bash
# cortex/one-shot.sh - One-shot planning session with Cortex for {{PROJECT_NAME}}

set -euo pipefail

# Resolve script directory
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Colors
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🧠 Cortex One-Shot Planning${NC}"
echo -e "${CYAN}   {{PROJECT_NAME}}${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

usage() {
  echo "Usage: bash cortex/one-shot.sh [OPTIONS] [MESSAGE]"
  echo ""
  echo "Cortex One-Shot - Planning session with automatic task updates."
  echo ""
  echo "Options:"
  echo "  --help, -h           Show this help"
  echo "  --model MODEL        Override model (gpt52, codex, opus, sonnet, auto)"
  echo ""

  echo "Examples:"
  echo "  bash cortex/one-shot.sh                           # Default planning"
  echo "  bash cortex/one-shot.sh 'Review phase 1 tasks'    # With specific request"
  echo "  bash cortex/one-shot.sh --model sonnet            # Use different model"
  echo ""
  echo "For interactive chat: bash cortex/cortex-{{PROJECT_SLUG}}.bash"
  echo "To run Ralph: bash loop.sh"
}

MODEL_ARG="gpt52" # Default to GPT-5.2 for Cortex
MESSAGE=""

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
    *)
      MESSAGE="$1"
      shift
      ;;
  esac
done

RESOLVED_MODEL=""
case "$MODEL_ARG" in
  opus) RESOLVED_MODEL="anthropic.claude-opus-4-5-20251101-v1:0" ;;
  gpt52 | gpt-5.2 | gpt5.2) RESOLVED_MODEL="gpt-5.2" ;;
  codex | gpt-5.2-codex) RESOLVED_MODEL="gpt-5.2-codex" ;;
  sonnet) RESOLVED_MODEL="anthropic.claude-sonnet-4-5-20250929-v1:0" ;;
  auto) RESOLVED_MODEL="auto" ;;
  *) RESOLVED_MODEL="$MODEL_ARG" ;;
esac

echo -e "${YELLOW}Generating context snapshot...${NC}"
SNAPSHOT_OUTPUT=$(bash "${SCRIPT_DIR}/snapshot.sh")
echo -e "${GREEN}✓ Snapshot ready${NC}"
echo ""

# Build system prompt
CORTEX_SYSTEM_PROMPT=$(
  cat <<EOF
$(cat "${SCRIPT_DIR}/AGENTS.md")

---

$(cat "${PROJECT_ROOT}/NEURONS.md")

---

$(cat "${SCRIPT_DIR}/CORTEX_SYSTEM_PROMPT.md")

---

$(cat "${SCRIPT_DIR}/THOUGHTS.md")

---

# Current Repository State

${SNAPSHOT_OUTPUT}

---

$(cat "${SCRIPT_DIR}/DECISIONS.md")

---

# One-Shot Planning Mode

You are in **one-shot planning mode**. Review the current state and:

1. Check IMPLEMENTATION_PLAN.md for next tasks
2. Review any blockers or dependencies
3. Update cortex/THOUGHTS.md if needed
4. Provide recommendations for next steps

If the user provides a specific request, focus on that.

**To run Ralph (execution):** User runs \`bash loop.sh\` from project root
EOF
)

# Default message if none provided
if [[ -z "$MESSAGE" ]]; then
  MESSAGE="Review current project state and recommend next actions. Check implementation plan progress and identify any blockers."
fi

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Starting Cortex Planning Session...${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Create config file
CONFIG_FILE="/tmp/cortex_oneshot_$$_$(date +%s).yml"

cat >"$CONFIG_FILE" <<EOF
version: 1
agent:
  modelId: ${RESOLVED_MODEL}
  additionalSystemPrompt: |
$(while IFS= read -r line; do
  echo "    $line"
done <<<"$CORTEX_SYSTEM_PROMPT")
  streaming: true
  temperature: 0.3
EOF

# Run with message
acli rovodev run --config-file "$CONFIG_FILE" --yolo "$MESSAGE"
EXIT_CODE=$?

rm -f "$CONFIG_FILE"

echo ""
echo -e "${CYAN}========================================${NC}"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ Planning session complete${NC}"
else
  echo -e "${YELLOW}⚠ Session ended with code ${EXIT_CODE}${NC}"
fi
echo -e "${CYAN}========================================${NC}"

exit $EXIT_CODE
