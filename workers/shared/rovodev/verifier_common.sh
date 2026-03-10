#!/usr/bin/env bash
# verifier_common.sh - Shared verification utilities for Ralph and Cerebras workers
#
# This file contains common verification functions used by both workers/ralph/verifier.sh
# and workers/cerebras/verifier.sh (when implemented).
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/../shared/verifier_common.sh"

# Timestamp helper
# Returns: ISO 8601 timestamp string
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

# Get short git commit hash
# Returns: Short git hash or "no-git" if not in a git repo
git_head() {
  git rev-parse --short HEAD 2>/dev/null || echo "no-git"
}

# Trim trailing whitespace and carriage returns
# Args:
#   $1 - String to trim
# Returns: Trimmed string
trim_ws() {
  printf "%s" "$1" | tr -d '\r' | sed 's/[[:space:]]*$//'
}

# Read approval status from MANUAL_APPROVALS.rules
# Args:
#   $1 - Rule ID to check (e.g., "Protected.1")
#   $2 - Approvals file path (optional, uses caller's $APPROVALS_FILE if not provided)
# Returns: 0 if approved, 1 if not approved
read_approval() {
  local id="$1"
  local approvals_file="${2:-${APPROVALS_FILE:-}}"
  [[ -f "$approvals_file" ]] || return 1
  grep -F "${id}=" "$approvals_file" >/dev/null 2>&1
}

# Check if verifier baselines are initialized
# Fails fast with clear error message if missing baseline files
# Returns: 0 if all baselines exist, 1 if any are missing
check_init_required() {
  local verify_dir="${1:-$VERIFY_DIR}"
  local ac_hash_file="${2:-$AC_HASH_FILE}"

  local missing=()

  [[ ! -f "$ac_hash_file" ]] && missing+=("ac.sha256")
  [[ ! -f "${verify_dir}/loop.sha256" ]] && missing+=("loop.sha256")
  [[ ! -f "${verify_dir}/verifier.sha256" ]] && missing+=("verifier.sha256")
  [[ ! -f "${verify_dir}/prompt.sha256" ]] && missing+=("prompt.sha256")
  [[ ! -f "${verify_dir}/agents.sha256" ]] && missing+=("agents.sha256")

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo ""
    echo "❌ ERROR: Verifier baselines not initialized!"
    echo ""
    echo "Missing baseline files:"
    for f in "${missing[@]}"; do
      echo "  - .verify/$f"
    done
    echo ""
    echo "Fix: Run the init script first:"
    echo "  bash init_verifier_baselines.sh"
    echo ""
    return 1
  fi
  return 0
}

# Check if changes to a protected file are lint-only (safe to auto-approve)
# Args:
#   $1 - File path to check
#   $2 - Hash file path containing baseline hash
# Returns: 0 if lint-only changes, 1 if contains non-lint changes
is_lint_only_change() {
  local file="$1"
  local hash_file="$2"

  # Get the baseline hash
  local baseline_hash
  baseline_hash="$(head -n 1 "$hash_file" 2>/dev/null)"
  [[ -z "$baseline_hash" ]] && return 1

  # Get diff of the file (staged or unstaged)
  local diff_output
  diff_output="$(git diff HEAD -- "$file" 2>/dev/null || git diff -- "$file" 2>/dev/null || echo "")"

  # If no diff, check if it's a committed change
  if [[ -z "$diff_output" ]]; then
    # File matches HEAD, but hash doesn't match baseline
    # This means someone committed a change - check last commit diff
    diff_output="$(git diff HEAD~1 HEAD -- "$file" 2>/dev/null || echo "")"
  fi

  [[ -z "$diff_output" ]] && return 1

  # Define safe lint-fix patterns (additions/removals that are lint-only)
  # These patterns match common shellcheck fixes
  local safe_patterns=(
    # SC2162: read without -r
    '^[+-][[:space:]]*read -r'
    '^[+-][[:space:]]*while IFS=[^ ]* read -r'
    # SC2086: unquoted variable - adding quotes
    '^[+-][[:space:]]*"$'
    # SC2155: declare and assign separately
    '^[+-][[:space:]]*local [a-zA-Z_][a-zA-Z0-9_]*$'
    # Whitespace-only changes (shfmt)
    '^[+-][[:space:]]*$'
    # SC2002: useless cat - cat file | -> < file
    '^[+-][[:space:]]*<[[:space:]]'
    # SC2129: consolidating redirects with braces
    '^[+-][[:space:]]*{$'
    '^[+-][[:space:]]*}[[:space:]]*>>'
  )

  # Extract only the +/- lines (actual changes, not context)
  local change_lines
  change_lines="$(echo "$diff_output" | grep -E '^[+-]' | grep -v '^[+-]{3}' || echo "")"

  [[ -z "$change_lines" ]] && return 1

  # Check each change line against safe patterns
  local line safe all_safe=1
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    safe=0
    for pattern in "${safe_patterns[@]}"; do
      if echo "$line" | grep -Eq "$pattern"; then
        safe=1
        break
      fi
    done
    # Also check if it's just adding -r to an existing read
    if [[ $safe -eq 0 ]] && echo "$line" | grep -qE '^[+-].*read[[:space:]]+-r'; then
      safe=1
    fi
    # Check for quote additions around variables
    if [[ $safe -eq 0 ]] && echo "$line" | grep -qE '^[+-].*"\$[a-zA-Z_]'; then
      safe=1
    fi
    if [[ $safe -eq 0 ]]; then
      all_safe=0
      break
    fi
  done <<<"$change_lines"

  return $((1 - all_safe))
}

# Auto-regenerate hash for a protected file after lint-only changes
# Args:
#   $1 - File path to hash
#   $2 - Hash file path (worker-local, e.g., workers/ralph/.verify/loop.sha256)
#   $3 - Root hash file path (root-level, e.g., .verify/loop.sha256)
# Returns: Prints new hash to stdout
auto_regen_protected_hash() {
  local file="$1"
  local hash_file="$2"
  local root_hash_file="$3"

  local new_hash
  new_hash="$(sha256sum "$file" | cut -d' ' -f1)"

  # Update both hash files
  echo "$new_hash" >"$hash_file"
  if [[ -n "$root_hash_file" && -f "$(dirname "$root_hash_file")" ]]; then
    echo "$new_hash" >"$root_hash_file" 2>/dev/null || true
  fi

  echo "$new_hash"
}

# Special-case: grep returns 1 when it finds zero matches (even with -c).
# We accept exit codes 0 OR 1 when cmd is grep and expect_stdout is "0"
# Args:
#   $1 - Command string
#   $2 - Expected stdout value
#   $3 - Actual exit code
# Returns: 0 if this is a valid grep-zero case, 1 otherwise
is_grep_zero_ok() {
  local cmd="$1"
  local expect_stdout="$2"
  local rc="$3"

  [[ "$expect_stdout" == "0" ]] || return 1
  [[ "$cmd" =~ ^[[:space:]]*grep[[:space:]] ]] || return 1
  [[ "$rc" == "0" || "$rc" == "1" ]] || return 1
  return 0
}

# Run a command and capture stdout, stderr, and exit code
# Args:
#   $1 - Command to run
#   $2 - File path to write stdout
#   $3 - File path to write stderr
#   $4 - File path to write exit code
run_cmd() {
  local cmd="$1"
  local stdout_file="$2"
  local stderr_file="$3"
  local rc_file="$4"

  set +e
  bash -lc "$cmd" >"$stdout_file" 2>"$stderr_file"
  echo "$?" >"$rc_file"
  set -e
}

# Write report header to verifier report file
# Args:
#   $1 - Report file path
#   $2 - AC file path
#   $3 - Approvals file path
write_header() {
  local report_file="$1"
  local ac_file="$2"
  local approvals_file="$3"

  {
    echo "Ralph Verifier Report"
    echo "Time: $(timestamp)"
    echo "Git:  $(git_head)"
    echo "AC:   $ac_file"
    echo "Approvals: $approvals_file"
    echo "------------------------------------------------------------"
  } >"$report_file"
}
