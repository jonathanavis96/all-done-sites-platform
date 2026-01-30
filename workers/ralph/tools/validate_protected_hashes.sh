#!/usr/bin/env bash
# Pre-commit hook: Validate SHA256 hash integrity for protected files
#
# Copied from Brain's tools/validate_protected_hashes.sh so newly scaffolded
# repos don't fail pre-commit when the validate-protected-hashes hook is enabled.
#
# Protected files:
#   - workers/ralph/loop.sh
#   - workers/ralph/verifier.sh
#   - workers/ralph/PROMPT.md
#   - workers/ralph/AGENTS.md
#   - rules/AC.rules

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_FAILED=0
VALIDATION_WARNINGS=0

# Get repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Protected File Hash Validation ==="
echo ""

check_protected_file() {
  local file="$1"
  local hash_file="$2"

  # Check if file exists
  if [[ ! -f "$file" ]]; then
    # If the file is protected and tracked, missing usually means it was deleted
    # (possibly staged for deletion). Treat that as a failure.
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
      echo -e "${RED}[FAIL]${NC} $file (protected file missing; tracked by git)" >&2
      VALIDATION_FAILED=1
      return 1
    fi

    # Also fail if the file is staged for deletion
    if git diff --name-only --cached --diff-filter=D | grep -qx "$file"; then
      echo -e "${RED}[FAIL]${NC} $file (protected file staged for deletion)" >&2
      VALIDATION_FAILED=1
      return 1
    fi

    echo -e "${YELLOW}[SKIP]${NC} $file (file not found)"
    return 0
  fi

  # Check if hash file exists
  if [[ ! -f "$hash_file" ]]; then
    echo -e "${RED}[FAIL]${NC} $file (hash file missing: $hash_file)"
    VALIDATION_FAILED=1
    return 1
  fi

  # Get baseline hash (first field only, sha256sum format: "hash  filename")
  local baseline_hash
  baseline_hash="$(head -n 1 "$hash_file" 2>/dev/null | awk '{print $1}')"

  if [[ -z "$baseline_hash" ]]; then
    echo -e "${RED}[FAIL]${NC} $file (hash file empty: $hash_file)"
    VALIDATION_FAILED=1
    return 1
  fi

  # Calculate current hash
  local current_hash
  current_hash="$(sha256sum "$file" | cut -d' ' -f1)"

  # Compare hashes
  if [[ "$current_hash" == "$baseline_hash" ]]; then
    echo -e "${GREEN}[PASS]${NC} $file"
    return 0
  else
    # Check if file is staged for commit
    if git diff --cached --name-only | grep -q "^${file}$"; then
      echo -e "${RED}[FAIL]${NC} $file (staged with hash mismatch)"
      echo "  Expected: $baseline_hash"
      echo "  Current:  $current_hash"
      echo "  Action:   Update $hash_file or unstage file"
      VALIDATION_FAILED=1
      return 1
    else
      # File modified but not staged - warning only
      echo -e "${YELLOW}[WARN]${NC} $file (modified but not staged)"
      echo "  Expected: $baseline_hash"
      echo "  Current:  $current_hash"
      VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
      return 0
    fi
  fi
}

echo "Checking workers/ralph/ protected files..."
check_protected_file "workers/ralph/loop.sh" "workers/ralph/.verify/loop.sha256"
check_protected_file "workers/ralph/verifier.sh" "workers/ralph/.verify/verifier.sha256"
check_protected_file "workers/ralph/PROMPT.md" "workers/ralph/.verify/prompt.sha256"
check_protected_file "workers/ralph/AGENTS.md" "workers/ralph/.verify/agents.sha256"

echo ""
echo "Checking root-level protected files..."
check_protected_file "rules/AC.rules" ".verify/ac.sha256"

# Also check root-level copies of loop.sh, verifier.sh, etc. if they exist
if [[ -f "loop.sh" ]]; then
  check_protected_file "loop.sh" ".verify/loop.sha256"
fi
if [[ -f "verifier.sh" ]]; then
  check_protected_file "verifier.sh" ".verify/verifier.sha256"
fi
if [[ -f "PROMPT.md" ]]; then
  check_protected_file "PROMPT.md" ".verify/prompt.sha256"
fi
if [[ -f "AGENTS.md" ]]; then
  check_protected_file "AGENTS.md" ".verify/agents.sha256"
fi

echo ""
echo "=== Validation Summary ==="
if [[ $VALIDATION_FAILED -gt 0 ]]; then
  echo -e "${RED}FAILED${NC}: Cannot commit - protected files have hash mismatches"
  echo ""
  echo "To fix:"
  echo "  1. If changes are intentional, regenerate hash (hash-only):"
  echo "     sha256sum <file> | cut -d' ' -f1 > <hash_file>"
  echo "  2. If changes are accidental, revert the file:"
  echo "     git checkout <file>"
  echo "  3. To bypass (DANGER - only for emergency fixes):"
  echo "     git commit --no-verify"
  exit 1
elif [[ $VALIDATION_WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}WARNINGS${NC}: $VALIDATION_WARNINGS file(s) modified but not staged"
  echo "These warnings are informational - commit will proceed"
  exit 0
else
  echo -e "${GREEN}PASSED${NC}: All protected files have valid hashes"
  exit 0
fi
