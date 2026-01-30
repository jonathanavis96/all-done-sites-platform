#!/usr/bin/env bash
# =============================================================================
# Shared Cache Library
# =============================================================================
#
# Shared caching functions for Ralph, Cerebras, Cortex, and other workers.
# Source this file from worker loop scripts.
#
# Usage:
#   source "$(dirname "$(dirname "${BASH_SOURCE[0]}")")/shared/cache.sh"
#
# Environment Variables:
#   CACHE_MODE    - off|record|use (default: off)
#   CACHE_SCOPE   - verify,read,llm_ro (default: verify,read)
#   CACHE_DB      - Path to cache database (default: artifacts/rollflow_cache/cache.sqlite)
#   CACHE_CONFIG  - Path to cache config YAML (default: artifacts/rollflow_cache/config.yml)
#   AGENT_NAME    - Agent identifier for cache isolation (required)
#
# =============================================================================

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

# Check if caching should be used based on environment variables
# Returns: 0 if caching enabled, 1 if disabled
cache_should_use() {
  # Handle CACHE_SKIP deprecation (legacy support)
  local cache_skip_lower
  cache_skip_lower=$(echo "${CACHE_SKIP:-false}" | tr '[:upper:]' '[:lower:]')
  if [[ "${cache_skip_lower}" == "true" || "${cache_skip_lower}" == "1" ||
    "${cache_skip_lower}" == "yes" || "${cache_skip_lower}" == "y" ||
    "${cache_skip_lower}" == "on" ]]; then
    return 0 # CACHE_SKIP=1 means enable caching
  fi

  # Check CACHE_MODE
  if [[ "${CACHE_MODE:-off}" == "use" ]]; then
    return 0 # Caching enabled
  fi

  return 1 # Caching disabled
}

# Generate a cache key for a tool call
# Args: $1 = tool_name, $2 = phase, $3 = content_hash, $4 = git_sha
# Output: Cache key string (tool|phase|hash|sha)
# Example: cache_make_key "rovodev" "build" "abc123..." "def456"
cache_make_key() {
  local tool_name="${1:-unknown}"
  local phase="${2:-unknown}"
  local content_hash="${3:-unknown}"
  local git_sha="${4:-unknown}"

  # Use AGENT_NAME if available, fall back to tool_name
  local agent="${AGENT_NAME:-${tool_name}}"

  echo "${agent,,}|${phase}|${content_hash:0:16}|${git_sha}"
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

# Try to load cached result and retrieve duration
# Args: $1 = cache_key
# Output: Prints duration_ms to stdout (0 if not found)
# Returns: 0 if cache hit, 1 if miss
cache_try_load() {
  local cache_key="$1"
  local cache_db="${CACHE_DB:-artifacts/rollflow_cache/cache.sqlite}"

  if [[ ! -f "$cache_db" ]]; then
    echo "0"
    return 1
  fi

  local saved_ms=0
  saved_ms=$(python3 -c "
import sqlite3
try:
    conn = sqlite3.connect('$cache_db')
    cursor = conn.execute('SELECT last_duration_ms FROM pass_cache WHERE cache_key = ?', ('$cache_key',))
    row = cursor.fetchone()
    conn.close()
    print(row[0] if row and row[0] else 0)
except Exception:
    print(0)
" 2>/dev/null) || saved_ms=0

  echo "$saved_ms"

  if [[ "$saved_ms" -gt 0 ]]; then
    return 0
  else
    return 1
  fi
}

# Store a successful result in cache
# Note: Actual storage happens via rollflow_analyze parsing log markers
# This function is a placeholder for future direct storage implementation
# Args: $1 = cache_key, $2 = tool_name, $3 = duration_ms (unused - reserved for future)
cache_store() {
  local cache_key="$1"
  local tool_name="$2"
  # duration_ms="${3:-0}" - Reserved for future direct storage implementation

  # Currently a no-op: cache storage happens via rollflow_analyze
  # which parses :::TOOL_END::: markers from logs
  # Future: Implement direct SQLite INSERT here
  return 0
}

# Log cache hit event for metrics tracking
# Args: $1 = cache_key, $2 = tool_name (optional)
log_cache_hit() {
  local cache_key="$1"
  local tool_name="${2:-unknown}"

  # Emit structured log line for metrics collection
  echo "[CACHE_HIT] key=$cache_key tool=$tool_name timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2

  return 0
}

# Log cache miss event for metrics tracking
# Args: $1 = cache_key, $2 = tool_name (optional)
log_cache_miss() {
  local cache_key="$1"
  local tool_name="${2:-unknown}"

  # Emit structured log line for metrics collection
  echo "[CACHE_MISS] key=$cache_key tool=$tool_name timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2

  return 0
}

# =============================================================================
# File Hashing Utilities (for cache key generation)
# =============================================================================

# Compute SHA256 hash of file contents
# Args: $1 = file path
# Returns: Prints 64-char hex hash to stdout, returns 0 on success
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
    echo "d41d8cd98f00b204e9800998ecf8427e0000000000000000000000000000000"
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

# Generate a stable cache key for tools based on file content
# Args: $1 = tool name, $2 = target file or directory path
# Output: SHA256 hash (first 16 chars for readability)
cache_key() {
  local tool_name="${1:-unknown}"
  local target_path="${2:-}"

  if [[ -z "$target_path" ]]; then
    echo "ERROR: cache_key: target path required" >&2
    return 1
  fi

  # Determine if target is file or directory and compute appropriate hash
  local content_hash
  if [[ -f "$target_path" ]]; then
    content_hash=$(file_content_hash "$target_path") || return 1
  elif [[ -d "$target_path" ]]; then
    content_hash=$(tree_hash "$target_path") || return 1
  else
    echo "ERROR: cache_key: target not found: $target_path" >&2
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
