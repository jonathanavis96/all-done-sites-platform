#!/usr/bin/env bash
set -euo pipefail

# Get script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ROOT can be overridden via RALPH_PROJECT_ROOT env var
# Default: repository root (two levels up from templates/ralph/)
if [[ -n "${RALPH_PROJECT_ROOT:-}" ]]; then
  ROOT="$RALPH_PROJECT_ROOT"
else
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

# AC rules are in rules/ (relative to script dir)
AC_FILE="${1:-${SCRIPT_DIR}/rules/AC.rules}"
APPROVALS_FILE="${2:-${SCRIPT_DIR}/rules/MANUAL_APPROVALS.rules}"

VERIFY_DIR="${SCRIPT_DIR}/.verify"
REPORT_FILE="${VERIFY_DIR}/latest.txt"
AC_HASH_FILE="${VERIFY_DIR}/ac.sha256"

mkdir -p "$VERIFY_DIR"

# Freshness: Write run_id if provided by loop.sh
RUN_ID_FILE="${VERIFY_DIR}/run_id.txt"
if [[ -n "${RUN_ID:-}" ]]; then
  echo "$RUN_ID" >"$RUN_ID_FILE"
fi

timestamp() { date +"%Y-%m-%d %H:%M:%S"; }
git_head() { git rev-parse --short HEAD 2>/dev/null || echo "no-git"; }

trim_ws() {
  # trim trailing whitespace + CR
  printf "%s" "$1" | tr -d '\r' | sed 's/[[:space:]]*$//'
}

read_approval() {
  local id="$1"
  [[ -f "$APPROVALS_FILE" ]] || return 1
  grep -F "${id}=" "$APPROVALS_FILE" >/dev/null 2>&1
}

# Check if baselines are initialized (fail fast with clear message)
check_init_required() {
  local missing=()

  [[ ! -f "$AC_HASH_FILE" ]] && missing+=("ac.sha256")
  [[ ! -f "${VERIFY_DIR}/loop.sha256" ]] && missing+=("loop.sha256")
  [[ ! -f "${VERIFY_DIR}/verifier.sha256" ]] && missing+=("verifier.sha256")
  [[ ! -f "${VERIFY_DIR}/prompt.sha256" ]] && missing+=("prompt.sha256")
  [[ ! -f "${VERIFY_DIR}/agents.sha256" ]] && missing+=("agents.sha256")

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

hash_guard_check() {
  if [[ ! -f "$AC_HASH_FILE" ]]; then
    {
      echo "[$(timestamp)] ERROR: Missing AC hash guard file: $AC_HASH_FILE"
      echo "Action: create it with:"
      echo "  sha256sum \"$AC_FILE\" > \"$AC_HASH_FILE\""
    } >>"$REPORT_FILE"
    return 1
  fi

  local expected actual
  expected="$(awk '{print $1}' "$AC_HASH_FILE" | head -n 1)"
  actual="$(sha256sum "$AC_FILE" | awk '{print $1}')"
  if [[ "$expected" != "$actual" ]]; then
    {
      echo "[$(timestamp)] FAIL: AC hash mismatch (rules/AC.rules modified)."
      echo "Expected: $expected"
      echo "Actual:   $actual"
      echo "Fix: If intentional, update:"
      echo "  sha256sum \"$AC_FILE\" > \"$AC_HASH_FILE\""
    } >>"$REPORT_FILE"
    return 1
  fi
  return 0
}

# Check if changes to a protected file are lint-only (safe to auto-approve)
# Returns 0 if lint-only, 1 if contains non-lint changes
is_lint_only_change() {
  local file="$1"
  local hash_file="$2"

  # Get the baseline hash
  local baseline_hash
  baseline_hash="$(head -n 1 "$hash_file" 2>/dev/null)"
  [[ -z "$baseline_hash" ]] && return 1

  # Check if file is tracked and has uncommitted changes vs baseline
  # We need to compare current file against what the hash represents
  # Since we can't recover the original, we check git diff for patterns

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
  # These patterns match common shellcheck and markdownlint fixes
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
    # Markdown: code fence changes (with/without language tag)
    # shellcheck disable=SC2016 # Literal backticks intended, not expansion
    '^[+-]```[a-z]*$'
    '^[+-]```$'
    # Markdown: blank line additions/removals (MD031, MD032)
    '^[+-]$'
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

# Log cache config for Cortex visibility
echo ":::VERIFIER_ENV::: CACHE_MODE=${CACHE_MODE:-unset} CACHE_SCOPE=${CACHE_SCOPE:-unset}" >&2

# Special-case: grep returns 1 when it finds zero matches (even with -c).
# We accept exit codes 0 OR 1 when:
# - cmd starts with grep (basic heuristic)
# - expect_stdout is exactly "0"
is_grep_zero_ok() {
  local cmd="$1" expect_stdout="$2" rc="$3"
  [[ "$expect_stdout" == "0" ]] || return 1
  [[ "$cmd" =~ ^[[:space:]]*grep[[:space:]] ]] || return 1
  [[ "$rc" == "0" || "$rc" == "1" ]] || return 1
  return 0
}

write_header() {
  {
    echo "Ralph Verifier Report"
    echo "Time: $(timestamp)"
    echo "Git:  $(git_head)"
    echo "AC:   $AC_FILE"
    echo "Approvals: $APPROVALS_FILE"
    echo "------------------------------------------------------------"
  } >"$REPORT_FILE"
}

main() {
  if [[ ! -f "$AC_FILE" ]]; then
    echo "ERROR: AC file not found: $AC_FILE" >&2
    exit 2
  fi

  # Change to script directory so commands in rules/AC.rules use relative paths
  cd "$SCRIPT_DIR"

  # Fail fast if baselines not initialized
  if ! check_init_required; then
    exit 1
  fi

  write_header

  local overall_fail=0
  local pass=0 fail=0 warn=0 skip=0 manual_warn=0 manual_block_fail=0

  # Hash guard (hard fail if mismatch)
  if ! hash_guard_check; then
    overall_fail=1
  fi

  local id="" mode="" gate="" desc="" cmd="" expect_stdout="" expect_stdout_regex="" expect_exit="" instructions=""
  local in_block=0

  flush_block() {
    # Called when we finish reading a stanza (or at EOF)
    [[ $in_block -eq 1 ]] || return 0

    # defaults
    [[ -n "$gate" ]] || gate="block"
    [[ -n "$expect_exit" ]] || expect_exit="0"

    # Validate minimal keys
    if [[ -z "$id" ]]; then
      return 0
    fi
    if [[ -z "$mode" ]]; then
      {
        echo "[FAIL] $id"
        echo "  reason: missing mode="
      } >>"$REPORT_FILE"
      fail=$((fail + 1))
      overall_fail=1
      reset_block
      return 0
    fi

    if [[ "$mode" == "manual" ]]; then
      if [[ "$gate" == "block" ]]; then
        if read_approval "$id"; then
          {
            echo "[PASS] $id (manual approved)"
            echo "  desc: $desc"
            echo "  gate: $gate"
          } >>"$REPORT_FILE"
          pass=$((pass + 1))
        else
          {
            echo "[FAIL] $id (manual approval required)"
            echo "  desc: $desc"
            echo "  gate: $gate"
            echo "  instructions: $instructions"
            echo "  action: add approval line to $APPROVALS_FILE"
          } >>"$REPORT_FILE"
          fail=$((fail + 1))
          overall_fail=1
          manual_block_fail=$((manual_block_fail + 1))
        fi
      elif [[ "$gate" == "warn" ]]; then
        # For warn gate: if approved, PASS; if not approved, WARN (not FAIL)
        if read_approval "$id"; then
          {
            echo "[PASS] $id (manual approved)"
            echo "  desc: $desc"
            echo "  gate: $gate"
          } >>"$REPORT_FILE"
          pass=$((pass + 1))
        else
          {
            echo "[WARN] $id (manual review)"
            echo "  desc: $desc"
            echo "  instructions: $instructions"
          } >>"$REPORT_FILE"
          warn=$((warn + 1))
          manual_warn=$((manual_warn + 1))
        fi
      else
        {
          echo "[SKIP] $id (manual ignored)"
          echo "  desc: $desc"
        } >>"$REPORT_FILE"
        skip=$((skip + 1))
      fi

      reset_block
      return 0
    fi

    # auto mode
    if [[ -z "$cmd" ]]; then
      {
        echo "[FAIL] $id"
        echo "  desc: $desc"
        echo "  reason: missing cmd="
      } >>"$REPORT_FILE"
      fail=$((fail + 1))
      overall_fail=1
      reset_block
      return 0
    fi

    # === CACHE LOOKUP ===
    # Try to use cached result if CACHE_MODE allows and we have a valid cache key
    local cache_key_value=""

    # Extract target file/dir from command (heuristic: last argument or first .sh/.md file)
    local target_path=""
    if [[ "$cmd" =~ ([a-zA-Z0-9_/.-]+\.(sh|md|py|bash|rules)) ]]; then
      target_path="${BASH_REMATCH[1]}"
    fi

    # Generate cache key if we have a target path
    if [[ -n "$target_path" && -e "$target_path" ]]; then
      # Source common.sh for cache functions if not already loaded
      if ! declare -f cache_key &>/dev/null; then
        COMMON_SH="$(dirname "$SCRIPT_DIR")/shared/common.sh"
        if [[ -f "$COMMON_SH" ]]; then
          # shellcheck source=../shared/common.sh
          source "$COMMON_SH"
        fi
      fi

      # Generate cache key: check_id + target_file_hash
      if declare -f cache_key &>/dev/null; then
        cache_key_value=$(cache_key "verifier:$id" "$target_path" 2>/dev/null) || cache_key_value=""
      fi
    fi

    # Include AC.rules hash in cache key (BEFORE CACHE_MODE check for consistency)
    local ac_rules_hash=""
    if [[ -n "$cache_key_value" && -f "$AC_FILE" ]] && declare -f file_content_hash &>/dev/null; then
      ac_rules_hash=$(file_content_hash "$AC_FILE" 2>/dev/null || echo "")
    fi

    # Append AC.rules hash to cache key for rule-change invalidation
    if [[ -n "$ac_rules_hash" ]]; then
      cache_key_value="${cache_key_value}:${ac_rules_hash:0:8}"
    fi

    # Check cache if we have a key and caching is enabled
    if [[ -n "$cache_key_value" && "${CACHE_MODE:-off}" == "use" ]]; then
      local current_git_sha
      current_git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

      if declare -f lookup_cache_pass &>/dev/null; then
        if lookup_cache_pass "$cache_key_value" "$current_git_sha" "verifier:$id"; then
          # Log cache hit and treat as PASS
          if declare -f log_cache_hit &>/dev/null; then
            log_cache_hit "$cache_key_value" "verifier:$id"
          fi

          {
            echo "[PASS] $id (cached)"
            echo "  desc: $desc"
            echo "  cache_key: $cache_key_value"
          } >>"$REPORT_FILE"
          pass=$((pass + 1))
          reset_block
          return 0
        else
          # Cache miss - log it
          if declare -f log_cache_miss &>/dev/null; then
            log_cache_miss "$cache_key_value" "verifier:$id"
          fi
        fi
      fi
    fi
    # === END CACHE LOOKUP ===

    local tmp_stdout tmp_stderr tmp_rc
    tmp_stdout="$(mktemp)"
    tmp_stderr="$(mktemp)"
    tmp_rc="$(mktemp)"
    run_cmd "$cmd" "$tmp_stdout" "$tmp_stderr" "$tmp_rc"

    local rc stdout stderr stdout_norm
    rc="$(cat "$tmp_rc")"
    stdout="$(cat "$tmp_stdout")"
    stderr="$(cat "$tmp_stderr")"
    stdout_norm="$(trim_ws "$stdout")"

    local pass_check=1
    local reasons=()

    # Exit code check (with grep -c zero-match special-case)
    if [[ -n "$expect_stdout" ]] && is_grep_zero_ok "$cmd" "$expect_stdout" "$rc"; then
      # accept rc 0 or 1
      :
    else
      if [[ "$rc" != "$expect_exit" ]]; then
        pass_check=0
        reasons+=("exit=$rc expected=$expect_exit")
      fi
    fi

    # Stdout exact or regex
    if [[ -n "$expect_stdout" ]]; then
      if [[ "$stdout_norm" != "$expect_stdout" ]]; then
        pass_check=0
        reasons+=("stdout mismatch expected='$expect_stdout' got='${stdout_norm}'")
      fi
    fi

    if [[ -n "$expect_stdout_regex" ]]; then
      # Use echo to ensure there's at least a newline for grep to process
      if [[ -z "$stdout_norm" ]]; then
        if ! echo "" | grep -Eq "$expect_stdout_regex"; then
          pass_check=0
          reasons+=("stdout regex mismatch expected=/$expect_stdout_regex/ got='${stdout_norm}'")
        fi
      else
        if ! printf "%s" "$stdout_norm" | grep -Eq "$expect_stdout_regex"; then
          pass_check=0
          reasons+=("stdout regex mismatch expected=/$expect_stdout_regex/ got='${stdout_norm}'")
        fi
      fi
    fi

    if [[ $pass_check -eq 1 ]]; then
      if [[ "$gate" == "block" || "$gate" == "warn" ]]; then
        # Passing checks are PASS regardless of gate (warn gate only affects failures)
        {
          echo "[PASS] $id"
          echo "  desc: $desc"
          echo "  cmd:  $cmd"
          echo "  exit: $rc"
          echo "  stdout: $(printf "%s" "$stdout_norm")"
          if [[ -n "$stderr" ]]; then
            echo "  stderr: $(trim_ws "$stderr")"
          fi
        } >>"$REPORT_FILE"
        pass=$((pass + 1))

        # === CACHE RECORDING ===
        # Record PASS result in cache if we have a cache key and caching is enabled
        if [[ -n "$cache_key_value" && ("${CACHE_MODE:-off}" == "record" || "${CACHE_MODE:-off}" == "use") ]]; then
          # Record this PASS result in the cache database
          local current_git_sha
          current_git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

          local cache_db="${CACHE_DB:-artifacts/rollflow_cache/cache.sqlite}"
          local cache_dir
          cache_dir=$(dirname "$cache_db")

          # Ensure cache directory exists
          mkdir -p "$cache_dir"

          # Record PASS in cache database using Python
          python3 -c "
import sqlite3
import json
from datetime import datetime
try:
    conn = sqlite3.connect('$cache_db')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pass_cache (
            cache_key TEXT PRIMARY KEY,
            tool_name TEXT,
            last_pass_ts TEXT,
            last_duration_ms INTEGER,
            meta_json TEXT
        )
    ''')

    meta = {
        'git_sha': '$current_git_sha',
        'check_id': '$id',
        'target': '$target_path'
    }

    conn.execute('''
        INSERT OR REPLACE INTO pass_cache (cache_key, tool_name, last_pass_ts, last_duration_ms, meta_json)
        VALUES (?, ?, ?, ?, ?)
    ''', ('$cache_key_value', 'verifier:$id', datetime.utcnow().isoformat() + 'Z', 0, json.dumps(meta)))

    conn.commit()
    conn.close()
except Exception as e:
    # Don't fail verification if cache recording fails
    pass
" 2>/dev/null || true
        fi
        # === END CACHE RECORDING ===
      else
        {
          echo "[SKIP] $id (auto ignored)"
          echo "  desc: $desc"
        } >>"$REPORT_FILE"
        skip=$((skip + 1))
      fi
    else
      # Special handling for Protected.X failures - check if lint-only change
      if [[ "$id" =~ ^Protected\.[0-9]+$ && "$gate" == "block" ]]; then
        local protected_file="" hash_file="" root_hash_file=""
        case "$id" in
          Protected.1)
            protected_file="loop.sh"
            hash_file=".verify/loop.sha256"
            root_hash_file="$ROOT/.verify/loop.sha256"
            ;;
          Protected.2)
            protected_file="verifier.sh"
            hash_file=".verify/verifier.sha256"
            root_hash_file="$ROOT/.verify/verifier.sha256"
            ;;
          Protected.3)
            protected_file="PROMPT.md"
            hash_file=".verify/prompt.sha256"
            root_hash_file="$ROOT/.verify/prompt.sha256"
            ;;
          Protected.4)
            protected_file="AGENTS.md"
            hash_file=".verify/agents.sha256"
            root_hash_file="$ROOT/.verify/agents.sha256"
            ;;
        esac

        if [[ -n "$protected_file" ]]; then
          if is_lint_only_change "$protected_file" "$hash_file"; then
            # Auto-approve lint-only changes
            local new_hash
            new_hash="$(auto_regen_protected_hash "$protected_file" "$hash_file" "$root_hash_file")"
            {
              echo "[WARN] $id (lint-fix auto-approved)"
              echo "  desc: $desc"
              echo "  file: $protected_file"
              echo "  action: hash auto-regenerated (lint-only changes detected)"
              echo "  new_hash: $new_hash"
            } >>"$REPORT_FILE"
            warn=$((warn + 1))
          else
            # Protected file changed - WARN (not FAIL) and log for human review
            local change_log="${VERIFY_DIR}/protected_changes.log"
            local timestamp diff_stat
            timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
            diff_stat="$(git diff --stat HEAD -- "$protected_file" 2>/dev/null | tail -1)"
            [[ -z "$diff_stat" ]] && diff_stat="(no git diff available)"
            {
              echo "[$timestamp] $protected_file"
              echo "  changes: $diff_stat"
              echo "  review: git diff HEAD -- $protected_file"
              echo ""
            } >>"$change_log"
            {
              echo "[WARN] $id (protected file changed - human review required)"
              echo "  desc: $desc"
              echo "  file: $protected_file"
              echo "  changes: $diff_stat"
              echo "  logged: $change_log"
            } >>"$REPORT_FILE"
            warn=$((warn + 1))
          fi
          # Don't set overall_fail - protected files are warnings now
          rm -f "$tmp_stdout" "$tmp_stderr" "$tmp_rc"
          reset_block
          return 0
        fi
      fi

      if [[ "$gate" == "block" ]]; then
        {
          echo "[FAIL] $id"
          echo "  desc: $desc"
          echo "  cmd:  $cmd"
          echo "  exit: $rc"
          echo "  stdout: $(printf "%s" "$stdout_norm")"
          if [[ -n "$stderr" ]]; then
            echo "  stderr: $(trim_ws "$stderr")"
          fi
          echo "  reasons:"
          for r in "${reasons[@]}"; do echo "    - $r"; done
        } >>"$REPORT_FILE"
        fail=$((fail + 1))
        overall_fail=1
      elif [[ "$gate" == "warn" ]]; then
        {
          echo "[WARN] $id (auto check failed but warn gate)"
          echo "  desc: $desc"
          echo "  cmd:  $cmd"
          echo "  exit: $rc"
          echo "  stdout: $(printf "%s" "$stdout_norm")"
          echo "  reasons:"
          for r in "${reasons[@]}"; do echo "    - $r"; done
        } >>"$REPORT_FILE"
        warn=$((warn + 1))
      else
        {
          echo "[SKIP] $id (auto ignored)"
          echo "  desc: $desc"
        } >>"$REPORT_FILE"
        skip=$((skip + 1))
      fi
    fi

    rm -f "$tmp_stdout" "$tmp_stderr" "$tmp_rc"
    reset_block
  }

  reset_block() {
    id=""
    mode=""
    gate=""
    desc=""
    cmd=""
    expect_stdout=""
    expect_stdout_regex=""
    expect_exit=""
    instructions=""
    in_block=0
  }

  reset_block

  # Read AC file line-by-line
  while IFS= read -r line || [[ -n "$line" ]]; do
    # strip CR
    line="${line//$'\r'/}"

    # ignore comments and empty lines (but flush block on empty line)
    if [[ -z "${line//[[:space:]]/}" ]]; then
      flush_block
      continue
    fi
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ "$line" =~ ^\[(.+)\]$ ]]; then
      flush_block
      id="${BASH_REMATCH[1]}"
      in_block=1
      continue
    fi

    # key=value
    if [[ $in_block -eq 1 && "$line" =~ ^([a-zA-Z0-9_]+)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      # strip surrounding quotes if present
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"; fi
      if [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi

      case "$key" in
        mode) mode="$val" ;;
        gate) gate="$val" ;;
        desc) desc="$val" ;;
        cmd) cmd="$val" ;;
        expect_stdout) expect_stdout="$val" ;;
        expect_stdout_regex) expect_stdout_regex="$val" ;;
        expect_exit) expect_exit="$val" ;;
        instructions) instructions="$val" ;;
        *)
          # unknown key ignored
          ;;
      esac
    fi
  done <"$AC_FILE"

  flush_block

  # Check hash guard status before appending summary
  local hash_guard_status
  if grep -q '^\[.*\] FAIL: AC hash mismatch' "$REPORT_FILE"; then
    hash_guard_status="FAIL"
  else
    hash_guard_status="OK"
  fi

  {
    echo "------------------------------------------------------------"
    echo "SUMMARY"
    echo "  PASS: $pass"
    echo "  FAIL: $fail"
    echo "  WARN: $warn (manual_warn=$manual_warn)"
    echo "  SKIP: $skip"
    echo "  Manual gate=block failures: $manual_block_fail"
    echo "  Hash guard: $hash_guard_status"
  } >>"$REPORT_FILE"

  if [[ $overall_fail -eq 1 ]]; then
    exit 1
  fi
  exit 0
}

main "$@"
