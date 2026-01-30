#!/usr/bin/env bash
# =============================================================================
# Shared Worker Utilities
# =============================================================================
#
# Common functions shared across Ralph, Cerebras, and other workers.
# Source this file from worker loop scripts.
#
# Usage:
#   source "$(dirname "$(dirname "${BASH_SOURCE[0]}")")/shared/common.sh"
#
# =============================================================================

# Cleanup logs older than N days
# Args: $1 = days (default: 7), $2 = log directory
cleanup_old_logs() {
  local days="${1:-7}"
  local logdir="${2:-$LOGDIR}"
  local count
  count=$(find "$logdir" -name "*.log" -type f -mtime +"$days" 2>/dev/null | wc -l)
  if [[ "$count" -gt 0 ]]; then
    echo "🧹 Cleaning up $count log files older than $days days..."
    find "$logdir" -name "*.log" -type f -mtime +"$days" -delete
  fi
}

# Check if a PID is still running
# Args: $1 = PID
# Returns: 0 if running, 1 if not
is_pid_running() {
  local pid="$1"
  if [[ -z "$pid" || "$pid" == "unknown" ]]; then
    return 1 # Invalid PID, treat as not running
  fi
  # Check if process exists (works on Linux/macOS)
  kill -0 "$pid" 2>/dev/null
}

# Atomic lock acquisition with stale lock detection
# Args: $1 = lock file path
# Environment: Uses LOCK_FILE if $1 not provided
# Returns: 0 on success, exits on failure
acquire_lock() {
  local lock_file="${1:-${LOCK_FILE}}"

  # First, check for stale lock
  if [[ -f "$lock_file" ]]; then
    local lock_pid
    lock_pid=$(cat "$lock_file" 2>/dev/null || echo "unknown")
    if ! is_pid_running "$lock_pid"; then
      echo "🧹 Removing stale lock (PID $lock_pid no longer running)"
      rm -f "$lock_file"
    fi
  fi

  if command -v flock &>/dev/null; then
    # Use flock for atomic locking (append mode to avoid truncating before lock acquired)
    exec 9>>"$lock_file"
    if ! flock -n 9; then
      local lock_pid
      lock_pid=$(cat "$lock_file" 2>/dev/null || echo "unknown")
      echo "ERROR: Worker already running (lock: $lock_file, PID: $lock_pid)"
      exit 1
    fi
    # Now holding lock, safe to overwrite with our PID
    echo "$$" >"$lock_file"
  else
    # Portable fallback: noclobber atomic create
    if ! (
      set -o noclobber
      echo "$$" >"$lock_file"
    ) 2>/dev/null; then
      local lock_pid
      lock_pid=$(cat "$lock_file" 2>/dev/null || echo "unknown")
      # Double-check: maybe we lost a race but the winner is now dead
      if ! is_pid_running "$lock_pid"; then
        echo "🧹 Removing stale lock (PID $lock_pid no longer running)"
        rm -f "$lock_file"
        # Retry once
        if ! (
          set -o noclobber
          echo "$$" >"$lock_file"
        ) 2>/dev/null; then
          echo "ERROR: Worker already running (lock: $lock_file)"
          exit 1
        fi
      else
        echo "ERROR: Worker already running (lock: $lock_file, PID: $lock_pid)"
        exit 1
      fi
    fi
  fi
}

# =============================================================================
# RollFlow Tool Call Tracking
# =============================================================================
# Functions for generating cache keys and tracking tool calls for analysis.
# Used by rollflow_analyze to detect duplicate/cacheable tool invocations.

# Generate a stable cache key for verifier tools based on file content
# Args: $1 = tool name, $2 = target file or directory path
# Output: SHA256 hash (first 16 chars for readability)
# Example: cache_key "shellcheck" "loop.sh"
# Note: Key = tool_name + file_content_hash(target) for files, or tool_name + tree_hash(target) for directories
cache_key() {
  local tool_name="${1:-unknown}"
  local target_path="${2:-}"

  # Handle missing target path
  if [[ -z "$target_path" ]]; then
    echo "ERROR: cache_key: target path required" >&2
    return 1
  fi

  # Determine if target is file or directory and compute appropriate hash
  local content_hash
  if [[ -f "$target_path" ]]; then
    # File: use file_content_hash
    content_hash=$(file_content_hash "$target_path") || return 1
  elif [[ -d "$target_path" ]]; then
    # Directory: use tree_hash
    content_hash=$(tree_hash "$target_path") || return 1
  else
    echo "ERROR: cache_key: target not found or not a file/directory: $target_path" >&2
    return 1
  fi

  # Combine tool name (lowercase) and content hash
  local input="${tool_name,,}|${content_hash}"
  if command -v sha256sum &>/dev/null; then
    echo -n "$input" | sha256sum | cut -c1-16
  elif command -v shasum &>/dev/null; then
    echo -n "$input" | shasum -a 256 | cut -c1-16
  else
    echo "ERROR: cache_key: neither sha256sum nor shasum available" >&2
    return 1
  fi
}

# Generate a unique tool call ID
# Output: UUID-like identifier
tool_call_id() {
  # Use /proc/sys/kernel/random/uuid if available, otherwise generate from timestamp+random
  if [[ -f /proc/sys/kernel/random/uuid ]]; then
    cat /proc/sys/kernel/random/uuid
  else
    echo "$(date +%s%N)-$$-$RANDOM"
  fi
}

# Log tool call start marker (for rollflow_analyze parsing)
# Args: $1 = call_id, $2 = tool_name, $3 = cache_key, $4 = git_sha (optional)
log_tool_start() {
  local call_id="$1"
  local tool_name="$2"
  local key="$3"
  local git_sha="${4:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
  local ts
  ts="$(date -Iseconds)"

  echo "::TOOL_CALL_START:: id=$call_id name=$tool_name key=$key ts=$ts git=$git_sha"
}

# Log tool call end marker (for rollflow_analyze parsing)
# Args: $1 = call_id, $2 = status (PASS|FAIL), $3 = exit_code, $4 = duration_ms, $5 = error (optional)
log_tool_end() {
  local call_id="$1"
  local status="$2"
  local exit_code="$3"
  local duration_ms="$4"
  local err="${5:-}"

  # Sanitize error message (no newlines, limit length)
  err="${err//$'\n'/ }"
  err="${err:0:100}"

  if [[ -n "$err" ]]; then
    echo "::TOOL_CALL_END:: id=$call_id status=$status exit=$exit_code duration_ms=$duration_ms err=$err"
  else
    echo "::TOOL_CALL_END:: id=$call_id status=$status exit=$exit_code duration_ms=$duration_ms"
  fi
}

# Log run start marker
# Args: $1 = run_id
log_run_start() {
  local run_id="$1"
  local ts
  ts="$(date -Iseconds)"
  echo "::RUN:: id=$run_id ts=$ts"
}

# Log iteration start marker
# Args: $1 = iter_id, $2 = run_id
log_iter_start() {
  local iter_id="$1"
  local run_id="$2"
  local ts
  ts="$(date -Iseconds)"
  echo "::ITER:: id=$iter_id run_id=$run_id ts=$ts"
}

# =============================================================================

# Cleanup function for temp files and lock
# Environment: Uses LOCK_FILE, TEMP_CONFIG
cleanup() {
  if [[ -n "${LOCK_FILE:-}" && -f "${LOCK_FILE:-}" ]]; then
    rm -f "$LOCK_FILE"
  fi
  if [[ -n "${TEMP_CONFIG:-}" && -f "${TEMP_CONFIG:-}" ]]; then
    rm -f "$TEMP_CONFIG"
  fi
}

# Interrupt handling: First Ctrl+C = graceful exit, Second Ctrl+C = immediate exit
# Environment: Uses and sets INTERRUPT_COUNT, INTERRUPT_RECEIVED (caller must check these)
handle_interrupt() {
  # shellcheck disable=SC2034
  INTERRUPT_COUNT=$((INTERRUPT_COUNT + 1))

  if [[ $INTERRUPT_COUNT -eq 1 ]]; then
    echo ""
    echo "========================================"
    echo "⚠️  Interrupt received!"
    echo "Will exit after current iteration completes."
    echo "Press Ctrl+C again to force immediate exit."
    echo "========================================"
    # shellcheck disable=SC2034
    INTERRUPT_RECEIVED=true
  else
    echo ""
    echo "========================================"
    echo "🛑 Force exit!"
    echo "========================================"
    cleanup
    kill 0
    exit 130
  fi
}

# Safe branch handling - ensures target branch exists without resetting history
# Args: $1 = branch name (required)
# Returns: 0 on success, 1 on failure
ensure_worktree_branch() {
  local branch="$1"
  if [[ -z "$branch" ]]; then
    echo "ERROR: ensure_worktree_branch requires branch name argument"
    return 1
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  else
    echo "Creating new worktree branch: $branch"
    git checkout -b "$branch"
  fi

  # Set upstream if not already set
  if ! git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
    echo "Setting upstream for $branch"
    git push -u origin "$branch" 2>/dev/null || true
  fi
}

# Launch a script in a new terminal window
# Args: $1 = window title, $2 = script path, $3 = process grep pattern
# Returns: 0 if launched successfully, 1 otherwise
launch_in_terminal() {
  local title="$1"
  local script_path="$2"
  local process_pattern="$3"

  # Try to detect available terminal emulator (priority order: tmux, wt.exe, gnome-terminal, konsole, xterm)
  # All terminal launches redirect stderr to /dev/null to suppress dbus/X11 errors
  if [[ -n "${TMUX:-}" ]]; then
    if tmux new-window -n "$title" "bash $script_path" 2>/dev/null; then
      return 0
    fi
  elif command -v wt.exe &>/dev/null; then
    wt.exe new-tab --title "$title" -- wsl bash "$script_path" 2>/dev/null &
    sleep 0.5
    if pgrep -f "$process_pattern" >/dev/null; then
      return 0
    fi
  elif command -v gnome-terminal &>/dev/null; then
    gnome-terminal --title="$title" -- bash "$script_path" 2>/dev/null &
    sleep 0.5 # Give it time to fail
    if pgrep -f "$process_pattern" >/dev/null; then
      return 0
    fi
  elif command -v konsole &>/dev/null; then
    konsole --title "$title" -e bash "$script_path" 2>/dev/null &
    sleep 0.5
    if pgrep -f "$process_pattern" >/dev/null; then
      return 0
    fi
  elif command -v xterm &>/dev/null; then
    xterm -T "$title" -e bash "$script_path" 2>/dev/null &
    sleep 0.5
    if pgrep -f "$process_pattern" >/dev/null; then
      return 0
    fi
  fi

  return 1
}

# Auto-launch monitors in background if not already running
# Args: $1 = monitor directory path
# Environment: Expects monitor scripts at $1/current_ralph_tasks.sh and $1/thunk_ralph_tasks.sh
# Returns: Always returns 0 (non-blocking)
launch_monitors() {
  local monitor_dir="$1"
  local current_tasks_launched=false
  local thunk_tasks_launched=false

  # Check if current_ralph_tasks.sh exists and launch
  if [[ -f "$monitor_dir/current_ralph_tasks.sh" ]]; then
    if ! pgrep -f "current_ralph_tasks.sh" >/dev/null; then
      if launch_in_terminal "Current Tasks" "$monitor_dir/current_ralph_tasks.sh" "current_ralph_tasks.sh"; then
        current_tasks_launched=true
      fi
    else
      current_tasks_launched=true # Already running
    fi
  fi

  # Check if thunk_ralph_tasks.sh exists and launch
  if [[ -f "$monitor_dir/thunk_ralph_tasks.sh" ]]; then
    if ! pgrep -f "thunk_ralph_tasks.sh" >/dev/null; then
      if launch_in_terminal "Thunk Tasks" "$monitor_dir/thunk_ralph_tasks.sh" "thunk_ralph_tasks.sh"; then
        thunk_tasks_launched=true
      fi
    else
      thunk_tasks_launched=true # Already running
    fi
  fi

  # If both monitors failed to launch, print consolidated fallback message
  if [[ "$current_tasks_launched" == "false" && "$thunk_tasks_launched" == "false" ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ⚠️  Could not auto-launch monitor terminals."
    echo ""
    echo "  To run monitors manually, open new terminals and run:"
    echo "    bash $monitor_dir/current_ralph_tasks.sh"
    echo "    bash $monitor_dir/thunk_ralph_tasks.sh"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
  fi
}

# Load cache configuration from YAML file
# Returns: Sets global variables NON_CACHEABLE_TOOLS (array), MAX_CACHE_AGE_HOURS (int)
load_cache_config() {
  local config_file="${CACHE_CONFIG:-artifacts/rollflow_cache/config.yml}"

  # Default values
  NON_CACHEABLE_TOOLS=()
  MAX_CACHE_AGE_HOURS=168

  # Load config if file exists
  if [[ -f "$config_file" ]]; then
    # Parse YAML using Python
    local config_json
    config_json=$(python3 -c "
import yaml
import json
import sys
try:
    with open('$config_file', 'r') as f:
        config = yaml.safe_load(f)
        print(json.dumps(config))
except Exception as e:
    print('{}', file=sys.stderr)
    sys.exit(0)
" 2>/dev/null)

    # Extract values
    if [[ -n "$config_json" ]]; then
      # Get non_cacheable_tools array
      local tools_json
      tools_json=$(echo "$config_json" | python3 -c "
import json
import sys
config = json.load(sys.stdin)
tools = config.get('non_cacheable_tools', [])
if tools:
    print(' '.join(tools))
" 2>/dev/null)

      if [[ -n "$tools_json" ]]; then
        # shellcheck disable=SC2206
        NON_CACHEABLE_TOOLS=($tools_json)
      fi

      # Get max_cache_age_hours
      local age
      age=$(echo "$config_json" | python3 -c "
import json
import sys
config = json.load(sys.stdin)
print(config.get('max_cache_age_hours', 168))
" 2>/dev/null)

      if [[ -n "$age" ]]; then
        MAX_CACHE_AGE_HOURS="$age"
      fi
    fi
  fi
}

# Check if a tool is in the non-cacheable list
# Args: $1 = tool_name
# Returns: 0 if non-cacheable, 1 if cacheable
is_tool_non_cacheable() {
  local tool_name="$1"

  # Lazy load config on first call
  if [[ -z "${NON_CACHEABLE_TOOLS+x}" ]]; then
    load_cache_config
  fi

  # Check if tool is in non-cacheable list
  for tool in "${NON_CACHEABLE_TOOLS[@]}"; do
    if [[ "$tool" == "$tool_name" ]]; then
      return 0 # Non-cacheable
    fi
  done

  return 1 # Cacheable
}

# Query cache for a previously passed tool call
# Args: $1 = cache_key, $2 = git_sha (optional, for staleness check), $3 = tool_name (optional, for non-cacheable check)
# Returns: 0 if cache hit (key exists in pass_cache and not stale), 1 if cache miss or stale
lookup_cache_pass() {
  local cache_key="$1"
  local current_git_sha="${2:-}"
  local tool_name="${3:-}"
  local cache_db="${CACHE_DB:-artifacts/rollflow_cache/cache.sqlite}"

  # Handle missing or invalid arguments
  if [[ -z "$cache_key" ]]; then
    return 1 # No key provided, treat as miss
  fi

  # Check if tool is non-cacheable (from config)
  if [[ -n "$tool_name" ]] && is_tool_non_cacheable "$tool_name"; then
    return 1 # Tool is configured as non-cacheable
  fi

  # Handle missing DB gracefully
  if [[ ! -f "$cache_db" ]]; then
    return 1 # No cache DB, treat as miss
  fi

  # Load cache config to get TTL
  if [[ -z "${MAX_CACHE_AGE_HOURS+x}" ]]; then
    load_cache_config
  fi

  # Query the pass_cache table for the cache_key
  # Check: 1) key exists, 2) git SHA match (if provided), 3) age < TTL
  if [[ -n "$current_git_sha" ]]; then
    # Staleness check enabled: compare git SHA and check TTL
    python3 -c "
import sqlite3
import sys
import json
from datetime import datetime, timedelta
try:
    conn = sqlite3.connect('$cache_db')
    cursor = conn.execute('SELECT last_pass_ts, meta_json FROM pass_cache WHERE cache_key = ?', ('$cache_key',))
    row = cursor.fetchone()
    conn.close()

    if not row:
        sys.exit(1)  # Cache miss

    # Check TTL expiration
    last_pass_ts = row[0]
    max_age_hours = $MAX_CACHE_AGE_HOURS
    cache_time = datetime.fromisoformat(last_pass_ts.replace('Z', '+00:00'))
    age_hours = (datetime.utcnow() - cache_time.replace(tzinfo=None)).total_seconds() / 3600

    if age_hours > max_age_hours:
        sys.exit(1)  # Cache expired (too old)

    # Extract git_sha from meta_json
    meta = json.loads(row[1]) if row[1] else {}
    cached_sha = meta.get('git_sha', '')

    # If cached SHA differs from current SHA, treat as stale (miss)
    if cached_sha and cached_sha != '$current_git_sha':
        sys.exit(1)  # Stale cache (SHA mismatch)

    sys.exit(0)  # Cache hit
except Exception:
    sys.exit(1)
" 2>/dev/null
  else
    # No staleness check: just verify key exists and check TTL
    python3 -c "
import sqlite3
import sys
from datetime import datetime
try:
    conn = sqlite3.connect('$cache_db')
    cursor = conn.execute('SELECT last_pass_ts FROM pass_cache WHERE cache_key = ?', ('$cache_key',))
    row = cursor.fetchone()
    conn.close()

    if not row:
        sys.exit(1)  # Cache miss

    # Check TTL expiration
    last_pass_ts = row[0]
    max_age_hours = $MAX_CACHE_AGE_HOURS
    cache_time = datetime.fromisoformat(last_pass_ts.replace('Z', '+00:00'))
    age_hours = (datetime.utcnow() - cache_time.replace(tzinfo=None)).total_seconds() / 3600

    if age_hours > max_age_hours:
        sys.exit(1)  # Cache expired (too old)

    sys.exit(0)  # Cache hit
except Exception:
    sys.exit(1)
" 2>/dev/null
  fi

  return $?
}

# Log cache hit event for metrics tracking
# Arguments:
#   $1 - cache_key (string)
#   $2 - tool_name (optional, for detailed logging)
# Returns: Always 0 (logging should not fail the workflow)
log_cache_hit() {
  local cache_key="$1"
  local tool_name="${2:-unknown}"

  # Emit structured log line for metrics collection
  echo "[CACHE_HIT] key=$cache_key tool=$tool_name timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2

  return 0
}

# Log cache miss event for metrics tracking
# Arguments:
#   $1 - cache_key (string)
#   $2 - tool_name (optional, for detailed logging)
# Returns: Always 0 (logging should not fail the workflow)
log_cache_miss() {
  local cache_key="$1"
  local tool_name="${2:-unknown}"

  # Emit structured log line for metrics collection
  echo "[CACHE_MISS] key=$cache_key tool=$tool_name timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2

  return 0
}

# =============================================================================
# File Hashing Utilities
# =============================================================================
# Functions for generating content-based hashes for cache key generation.

# Compute SHA256 hash of file contents
# Args: $1 = file path
# Returns: Prints 64-char hex hash to stdout, returns 0 on success
# Example: hash=$(file_content_hash "path/to/file.sh")
file_content_hash() {
  local file_path="$1"

  if [[ -z "$file_path" ]]; then
    echo "ERROR: file_content_hash: file path required" >&2
    return 1
  fi

  if [[ ! -f "$file_path" ]]; then
    echo "ERROR: file_content_hash: file not found: $file_path" >&2
    return 1
  fi

  # Use sha256sum (Linux) or shasum (macOS)
  if command -v sha256sum &>/dev/null; then
    sha256sum "$file_path" | awk '{print $1}'
  elif command -v shasum &>/dev/null; then
    shasum -a 256 "$file_path" | awk '{print $1}'
  else
    echo "ERROR: file_content_hash: neither sha256sum nor shasum available" >&2
    return 1
  fi
}

# Compute hash of directory tree state (files + mtimes)
# Args: $1 = directory path
# Returns: Prints 64-char hex hash to stdout, returns 0 on success
# Example: hash=$(tree_hash "path/to/dir")
# Note: Hash changes when any file in directory is added/removed/modified
tree_hash() {
  local dir_path="$1"

  if [[ -z "$dir_path" ]]; then
    echo "ERROR: tree_hash: directory path required" >&2
    return 1
  fi

  if [[ ! -d "$dir_path" ]]; then
    echo "ERROR: tree_hash: directory not found: $dir_path" >&2
    return 1
  fi

  # Generate hash based on:
  # 1. File paths (relative to dir_path)
  # 2. File modification times
  # 3. File sizes
  # This creates a stable hash that changes when any file is added/removed/modified
  local tree_state
  tree_state=$(find "$dir_path" -type f -printf "%P %T@ %s\n" 2>/dev/null | sort)

  # Fallback for systems without -printf (e.g., macOS)
  if [[ -z "$tree_state" ]]; then
    tree_state=$(find "$dir_path" -type f | sort | while IFS= read -r file; do
      local rel_path="${file#"$dir_path"/}"
      local mtime size
      if stat -c "%Y %s" "$file" &>/dev/null; then
        # GNU stat
        mtime=$(stat -c "%Y" "$file")
        size=$(stat -c "%s" "$file")
      else
        # BSD/macOS stat
        mtime=$(stat -f "%m" "$file")
        size=$(stat -f "%z" "$file")
      fi
      echo "$rel_path $mtime $size"
    done)
  fi

  if [[ -z "$tree_state" ]]; then
    # Empty directory or no files found
    echo "d41d8cd98f00b204e9800998ecf8427e0000000000000000000000000000000" # Empty hash
    return 0
  fi

  # Hash the tree state
  if command -v sha256sum &>/dev/null; then
    echo -n "$tree_state" | sha256sum | awk '{print $1}'
  elif command -v shasum &>/dev/null; then
    echo -n "$tree_state" | shasum -a 256 | awk '{print $1}'
  else
    echo "ERROR: tree_hash: neither sha256sum nor shasum available" >&2
    return 1
  fi
}

# Guard function for PLAN-ONLY mode enforcement
# Usage: guard_plan_only_mode <action>
# Returns: 0 = allowed, 1 = blocked
# Example: guard_plan_only_mode "git commit" || { echo "Blocked"; exit 1; }
guard_plan_only_mode() {
  local action="${1:-}"

  # Guard disabled if not in PLAN mode
  [[ "${RALPH_MODE:-}" != "PLAN" ]] && return 0

  # Pattern-match action against blocked categories
  case "$action" in
    git\ add* | git\ commit* | git\ push*)
      # git-write operations blocked
      echo "PLAN-ONLY: Refusing '$action'. Add task to plan instead." >&2
      return 1
      ;;
    *-w* | *--fix* | shfmt* | markdownlint*)
      # file-modify operations blocked (includes --fix variants)
      echo "PLAN-ONLY: Refusing '$action'. Add task to plan instead." >&2
      return 1
      ;;
    verifier.sh* | pre-commit*)
      # verification operations blocked
      echo "PLAN-ONLY: Refusing '$action'. Add task to plan instead." >&2
      return 1
      ;;
    *)
      # Allow all other operations (reads, planning)
      return 0
      ;;
  esac
}
