#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Ralph Loop - Autonomous Agent Execution
# =============================================================================
#
# WORKSPACE BOUNDARIES:
#   Ralph operates from: $ROOT/workers/ralph/ (derived from this script location)
#   Full access to:      $ROOT/** (entire brain repository)
#   PROTECTED (no modify): rules/AC.rules, .verify/*.sha256, verifier.sh, loop.sh, PROMPT.md
#   FORBIDDEN (no access): .verify/waivers/*.approved (OTP-protected)
#
# =============================================================================

# ROOT can be overridden via env var for project delegation
if [[ -n "${RALPH_PROJECT_ROOT:-}" ]]; then
  ROOT="$RALPH_PROJECT_ROOT"
  RALPH="$ROOT/workers/ralph"
else
  # Get absolute path to this script, then go up two levels for ROOT (brain/workers/ralph -> brain)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  RALPH="$SCRIPT_DIR"
  ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
fi
LOGDIR="$RALPH/logs"
VERIFY_REPORT="$RALPH/.verify/latest.txt"
mkdir -p "$LOGDIR"

# Load environment variables from .env file (if exists)
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck source=../../.env
  set -a  # Auto-export all variables
  source "$ROOT/.env"
  set +a
fi

# Source shared utilities (includes RollFlow tracking functions)
# shellcheck source=../shared/common.sh
source "$(dirname "$RALPH")/shared/common.sh"

# Source shared cache library
# shellcheck source=../shared/cache.sh
source "$(dirname "$RALPH")/shared/cache.sh"

# Cleanup logs older than 7 days on startup
cleanup_old_logs() {
  local days="${1:-7}"
  local count
  count=$(find "$LOGDIR" -name "*.log" -type f -mtime +"$days" 2>/dev/null | wc -l)
  if [[ "$count" -gt 0 ]]; then
    echo "🧹 Cleaning up $count log files older than $days days..."
    find "$LOGDIR" -name "*.log" -type f -mtime +"$days" -delete
  fi
}
cleanup_old_logs 7

# Configurable Brain repo for commit trailers
BRAIN_REPO="${BRAIN_REPO:-jonathanavis96/brain}"

# Derive clean branch name from git repo name
# Derive repo name from git remote (stable across machines) or fall back to folder name
# Use git -C "$ROOT" to ensure commands run against the intended project directory
if git -C "$ROOT" remote get-url origin &>/dev/null; then
  REPO_NAME=$(basename -s .git "$(git -C "$ROOT" remote get-url origin)")
else
  REPO_NAME=$(basename "$ROOT")
fi
WORK_BRANCH="${REPO_NAME}-work"

# Lock file to prevent concurrent runs
# Lock file includes hash of repo path for uniqueness across same-named repos
REPO_PATH_HASH=$(cd "$ROOT" && pwd | md5sum | cut -c1-8)
LOCK_FILE="/tmp/ralph-${REPO_NAME}-${REPO_PATH_HASH}.lock"

# TARGET_BRANCH will be set after arg parsing (uses BRANCH_ARG if provided, else WORK_BRANCH)

# Check if a PID is still running
is_pid_running() {
  local pid="$1"
  if [[ -z "$pid" || "$pid" == "unknown" ]]; then
    return 1 # Invalid PID, treat as not running
  fi
  # Check if process exists (works on Linux/macOS)
  kill -0 "$pid" 2>/dev/null
}

# Atomic lock acquisition with stale lock detection
acquire_lock() {
  # First, check for stale lock
  if [[ -f "$LOCK_FILE" ]]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
    if ! is_pid_running "$LOCK_PID"; then
      echo "🧹 Removing stale lock (PID $LOCK_PID no longer running)"
      rm -f "$LOCK_FILE"
    fi
  fi

  if command -v flock &>/dev/null; then
    # Use flock for atomic locking (append mode to avoid truncating before lock acquired)
    exec 9>>"$LOCK_FILE"
    if ! flock -n 9; then
      LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
      echo "ERROR: Ralph loop already running (lock: $LOCK_FILE, PID: $LOCK_PID)"
      exit 1
    fi
    # Now holding lock, safe to overwrite with our PID
    echo "$$" >"$LOCK_FILE"
  else
    # Portable fallback: noclobber atomic create
    if ! (
      set -o noclobber
      echo "$$" >"$LOCK_FILE"
    ) 2>/dev/null; then
      LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
      # Double-check: maybe we lost a race but the winner is now dead
      if ! is_pid_running "$LOCK_PID"; then
        echo "🧹 Removing stale lock (PID $LOCK_PID no longer running)"
        rm -f "$LOCK_FILE"
        # Retry once
        if ! (
          set -o noclobber
          echo "$$" >"$LOCK_FILE"
        ) 2>/dev/null; then
          echo "ERROR: Ralph loop already running (lock: $LOCK_FILE)"
          exit 1
        fi
      else
        echo "ERROR: Ralph loop already running (lock: $LOCK_FILE, PID: $LOCK_PID)"
        exit 1
      fi
    fi
  fi
}

release_lock() {
  # Release file lock and remove lock file
  if [[ -f "$LOCK_FILE" ]]; then
    rm -f "$LOCK_FILE"
  fi
  # Close file descriptor if flock was used
  exec 9>&- 2>/dev/null || true
}

acquire_lock

# =============================================================================
# Event Emission (provider-neutral markers)
# =============================================================================
# Emits lifecycle events to state/events.jsonl for external tooling.
# Best-effort: never fails the loop if event emission fails.

BRAIN_EVENT_SCRIPT="$ROOT/bin/brain-event"

emit_event() {
  # Best-effort event emission - never block the loop
  if [[ -x "$BRAIN_EVENT_SCRIPT" ]]; then
    "$BRAIN_EVENT_SCRIPT" --runner "${RUNNER:-unknown}" "$@" 2>/dev/null || true
  fi
}

# Trap for error event on unexpected exit
_loop_exit_code=0
_loop_emitted_end=false

cleanup_and_emit() {
  local exit_code=$?

  # Avoid double-emission
  if [[ "$_loop_emitted_end" == "true" ]]; then
    cleanup
    release_lock
    exit $exit_code
  fi
  _loop_emitted_end=true

  # Emit appropriate event based on exit code
  if [[ $exit_code -ne 0 && $exit_code -ne 130 ]]; then
    # Error exit (not SIGINT)
    emit_event --event error --iter "${CURRENT_ITER:-0}" --status fail --code "$exit_code" --msg "loop exited unexpectedly"
  fi

  cleanup
  release_lock
  exit $exit_code
}

# Will be set up after argument parsing
CURRENT_ITER=0

# Interrupt handling: First Ctrl+C = graceful exit, Second Ctrl+C = immediate exit
INTERRUPT_COUNT=0
INTERRUPT_RECEIVED=false

# Cleanup function for temp files and lock
cleanup() {
  rm -f "$LOCK_FILE"
  if [[ -n "${TEMP_CONFIG:-}" && -f "${TEMP_CONFIG:-}" ]]; then
    rm -f "$TEMP_CONFIG"
  fi
}

handle_interrupt() {
  INTERRUPT_COUNT=$((INTERRUPT_COUNT + 1))

  if [[ $INTERRUPT_COUNT -eq 1 ]]; then
    echo ""
    echo "========================================"
    echo "⚠️  Interrupt received!"
    echo "Will exit after current iteration completes."
    echo "Press Ctrl+C again to force immediate exit."
    echo "========================================"
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

trap 'handle_interrupt' INT TERM
trap 'cleanup' EXIT

# Safe branch handling - ensures target branch exists without resetting history
# Accepts optional branch name; defaults to WORK_BRANCH
ensure_worktree_branch() {
  local branch="${1:-$WORK_BRANCH}"
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

usage() {
  cat <<'EOF'
Usage:
  loop.sh [--prompt <path>] [--iterations N] [--plan-every N] [--yolo|--no-yolo]
          [--runner rovodev|opencode] [--model <model>] [--branch <name>] [--dry-run] [--no-monitors]
          [--opencode-serve] [--opencode-port N] [--opencode-attach <url>] [--opencode-format json|text]
          [--cache-skip] [--force-no-cache] [--force-fresh] [--rollback [N]] [--resume]

Defaults:
  --iterations 1
  --plan-every 3
  --runner      rovodev
  --model       Sonnet 4.5 (rovodev) or Grok Code (opencode). Use --model auto for rovodev config.
  --branch      Defaults to <repo>-work (e.g., brain-work, NeoQueue-work)
  If --prompt is NOT provided, loop alternates:
    - PLAN on iteration 1 and every N iterations
    - BUILD otherwise
  If --prompt IS provided, that prompt is used for all iterations.

Model Selection:
  --model <model>  Specify the model to use. Shortcuts available:
                   sonnet  -> Sonnet 4.5 (anthropic.claude-sonnet-4-5-20250929-v1:0)
                   opus    -> Opus 4.5 (anthropic.claude-opus-4-5-20251101-v1:0)
                   sonnet4 -> Sonnet 4 (anthropic.claude-sonnet-4-20250514-v1:0)
                    auto    -> Use default from ~/.rovodev/config.yml
                    Or provide a full model ID directly.

Runner Selection:
  --runner rovodev|opencode
                   rovodev: uses acli rovodev run (default)
                   opencode: uses opencode run (provider/model). See: opencode models

Branch Workflow:
  --branch <name>  Work on specified branch (creates if needed, switches to it)
                   Default: <repo>-work (derived from git remote, e.g., brain-work)
                   Then run pr-batch.sh to create PRs to main

Safety Features:
  --dry-run         Preview changes without committing (appends instruction to prompt)
  --no-monitors     Skip auto-launching monitor terminals (useful for CI/CD or headless environments)
  --cache-skip      Enable cache lookup to skip redundant tool calls (requires RollFlow cache DB)
  --cache-mode <mode> Cache behavior: off (no caching, default), record (run everything, store PASS),
                    use (check cache first, skip on hit, record misses)
  --cache-scope <scopes> Comma-separated list of cache scopes: verify,read,llm_ro
                    Default: verify,read (safe for all phases)
  --force-no-cache  Disable cache lookup even if CACHE_SKIP=1 (forces all tools to run)
  --force-fresh     Bypass all caching regardless of CACHE_MODE/SCOPE (useful for debugging stale cache)
  --rollback [N]    Undo last N Ralph commits (default: 1). Requires confirmation.
  --resume          Resume from last incomplete iteration (checks for uncommitted changes)

OpenCode Options:
  --opencode-serve      Start local OpenCode server for faster runs (implies --opencode-attach localhost:4096)
  --opencode-port N     Port for OpenCode server (default: 4096)
  --opencode-attach <url> Attach to running OpenCode server at <url> (e.g., http://localhost:4096)
  --opencode-format default|json  Format for OpenCode output (default: default; use default for grep-based verifiers)

Examples:
  # Run BUILD once (from anywhere)
  bash ralph/loop.sh --prompt ralph/PROMPT_build.md --iterations 1 --plan-every 999

  # From inside ralph/
  bash ./loop.sh --prompt ./PROMPT_build.md --iterations 1 --plan-every 999

  # Alternate plan/build for 10 iters, plan every 3
  bash ralph/loop.sh --iterations 10 --plan-every 3

  # Use Sonnet model for faster iterations
  bash ralph/loop.sh --model sonnet --iterations 20 --plan-every 5

  # Use Opus for careful planning
  bash ralph/loop.sh --model opus --iterations 1

  # Dry-run mode (see what would change)
  bash workers/ralph/loop.sh --dry-run --iterations 1

  # Run without monitor terminals (useful for CI/CD)
  bash workers/ralph/loop.sh --no-monitors --iterations 5

  # Rollback last 2 iterations
  bash workers/ralph/loop.sh --rollback 2

  # Resume after error
  bash workers/ralph/loop.sh --resume

  # Enable cache skip to speed up repeated runs
  bash workers/ralph/loop.sh --cache-skip --iterations 5

  # Force all tools to run even with cache enabled
  CACHE_SKIP=1 bash workers/ralph/loop.sh --force-no-cache --iterations 1
EOF
}

# Defaults
ITERATIONS=1
PLAN_EVERY=3
YOLO_FLAG="--yolo"
RUNNER="rovodev"
AGENT_NAME="ralph" # Agent identifier for cache isolation
PROMPT_ARG=""
MODEL_ARG=""
BRANCH_ARG=""
DRY_RUN=false
OPENCODE_SERVE=false
OPENCODE_PORT=4096
OPENCODE_ATTACH=""
OPENCODE_FORMAT="default"
ROLLBACK_MODE=false
ROLLBACK_COUNT=1
RESUME_MODE=false
NO_MONITORS=false
CACHE_SKIP="${CACHE_SKIP:-false}"
CACHE_MODE="${CACHE_MODE:-off}"           # off|record|use - controls cache behavior
CACHE_SCOPE="${CACHE_SCOPE:-verify,read}" # verify,read,llm_ro - comma-separated list of allowed scopes

# Export cache variables so subprocesses (verifier.sh) inherit them
export CACHE_MODE CACHE_SCOPE AGENT_NAME

# Note: :::CACHE_CONFIG::: marker moved inside iteration loop (see line ~1452)
# to include iter= and ts= fields per task X.4.1
FORCE_NO_CACHE=false
FORCE_FRESH=false # Bypass all caching regardless of CACHE_MODE/SCOPE
CONSECUTIVE_VERIFIER_FAILURES=0

# Deprecation: CACHE_SKIP → CACHE_MODE/CACHE_SCOPE migration
# Accept truthy values: 1, true, yes, y, on (case-insensitive)
cache_skip_lower=$(echo "${CACHE_SKIP}" | tr '[:upper:]' '[:lower:]')
if [[ "${cache_skip_lower}" == "true" || "${cache_skip_lower}" == "1" ||
  "${cache_skip_lower}" == "yes" || "${cache_skip_lower}" == "y" ||
  "${cache_skip_lower}" == "on" ]]; then
  echo "⚠️  WARNING: CACHE_SKIP is deprecated and will be removed in a future release."
  echo "    Please use: CACHE_MODE=use CACHE_SCOPE=verify,read"
  echo "    Automatically migrating for this run..."
  CACHE_MODE="use"
  CACHE_SCOPE="verify,read"
fi

# =============================================================================
# Cache Scope Mapping by Phase
# =============================================================================
#
# Ralph loop operates in different phases, each with distinct cache safety requirements:
#
# PHASE            | ALLOWED SCOPES        | RATIONALE
# -----------------|----------------------|---------------------------------------------
# PLAN             | verify, read         | LLM must reason fresh - planning requires
#                  |                      | full context and creative problem-solving
# -----------------|----------------------|---------------------------------------------
# BUILD            | verify, read         | LLM must execute tasks fresh - caching would
#                  |                      | cause Ralph to skip work and report "done"
#                  |                      | without actually implementing changes
# -----------------|----------------------|---------------------------------------------
# VERIFY (future)  | verify, read, llm_ro | Safe to cache: verifier checks deterministic
#                  |                      | rules, read-only LLM analysis has no state
#                  |                      | side effects
# -----------------|----------------------|---------------------------------------------
# REPORT (future)  | verify, read, llm_ro | Safe to cache: report generation is read-only
#                  |                      | and deterministic based on logs
# -----------------|----------------------|---------------------------------------------
#
# Cache Scopes:
#   - verify: Deterministic checks (shellcheck, markdownlint, hash validation)
#   - read:   File reads, git operations (cached by path+mtime)
#   - llm_ro: Read-only LLM analysis (cached by prompt+git_sha, no state mutation)
#
# Current Implementation (Phase 12.4.x):
#   CACHE_SKIP flag enables caching for all phases (emergency brake for debugging)
#   Phase 1.x will implement proper scope enforcement with hard-blocks for llm_ro
#   in PLAN/BUILD phases regardless of CACHE_SKIP setting.
#
# See docs/CACHE_DESIGN.md for full design rationale and safety analysis.
# =============================================================================

# Cache metrics tracking
CACHE_HITS=0
CACHE_MISSES=0
TIME_SAVED_MS=0

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      PROMPT_ARG="${2:-}"
      shift 2
      ;;
    --iterations)
      ITERATIONS="${2:-}"
      shift 2
      ;;
    --plan-every)
      PLAN_EVERY="${2:-}"
      shift 2
      ;;
    --yolo)
      YOLO_FLAG="--yolo"
      shift
      ;;
    --no-yolo)
      YOLO_FLAG=""
      shift
      ;;
    --runner)
      RUNNER="${2:-}"
      shift 2
      ;;
    --opencode-serve)
      OPENCODE_SERVE=true
      shift
      ;;
    --opencode-port)
      OPENCODE_PORT="${2:-4096}"
      shift 2
      ;;
    --opencode-attach)
      OPENCODE_ATTACH="${2:-}"
      shift 2
      ;;
    --opencode-format)
      OPENCODE_FORMAT="${2:-default}"
      shift 2
      ;;
    --model)
      MODEL_ARG="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH_ARG="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-monitors)
      NO_MONITORS=true
      shift
      ;;
    --cache-skip)
      # shellcheck disable=SC2034  # Used in future cache lookup logic (12.4.2.4)
      CACHE_SKIP=true
      shift
      ;;
    --cache-mode)
      CACHE_MODE="${2:-}"
      shift 2
      ;;
    --cache-scope)
      CACHE_SCOPE="${2:-}"
      shift 2
      ;;
    --force-no-cache)
      FORCE_NO_CACHE=true
      shift
      ;;
    --force-fresh)
      FORCE_FRESH=true
      shift
      ;;
    --rollback)
      ROLLBACK_MODE=true
      if [[ -n "${2:-}" && "$2" =~ ^[0-9]+$ ]]; then
        ROLLBACK_COUNT="$2"
        shift 2
      else
        shift
      fi
      ;;
    --resume)
      RESUME_MODE=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

# Validate CACHE_MODE
if [[ "$CACHE_MODE" != "off" && "$CACHE_MODE" != "record" && "$CACHE_MODE" != "use" ]]; then
  echo "ERROR: Invalid CACHE_MODE='$CACHE_MODE'. Must be: off|record|use" >&2
  exit 2
fi

# Model version configuration - SINGLE SOURCE OF TRUTH
# Update these when new model versions are released
# Last updated: 2026-01-18 (Sonnet 4.5 September 2025 release)
MODEL_SONNET_45="anthropic.claude-sonnet-4-5-20250929-v1:0"
MODEL_OPUS_45="anthropic.claude-opus-4-5-20251101-v1:0"
MODEL_SONNET_4="anthropic.claude-sonnet-4-20250514-v1:0"
MODEL_GPT52_CODEX="gpt-5.2-codex"

# Resolve model shortcut to full model ID
resolve_model() {
  local model="$1"
  case "$model" in
    opus | opus4.5 | opus45)
      echo "$MODEL_OPUS_45"
      ;;
    sonnet | sonnet4.5 | sonnet45)
      echo "$MODEL_SONNET_45"
      ;;
    sonnet4)
      echo "$MODEL_SONNET_4"
      ;;
    gpt52 | codex | gpt-5.2 | gpt5.2)
      echo "$MODEL_GPT52_CODEX"
      ;;
    latest | auto)
      # Use system default - don't override config
      echo ""
      ;;
    *)
      echo "$model"
      ;;
  esac
}

# Resolve model shortcut to OpenCode provider/model.
# IMPORTANT: Replace placeholder IDs below with the *exact* IDs from: opencode models
resolve_model_opencode() {
  local model="$1"
  case "$model" in
    grok | grokfast | grok-code-fast-1)
      # Confirmed via opencode models
      echo "opencode/grok-code"
      ;;
    opus | opus4.5 | opus45)
      # Placeholder - anthropic not available in current setup
      echo "opencode/gpt-5-nano"
      ;; # Fallback to available model
    sonnet | sonnet4.5 | sonnet45)
      # Placeholder - anthropic not available
      echo "opencode/gpt-5-nano"
      ;; # Fallback
    latest | auto)
      # Let OpenCode decide its own default if user explicitly asked for auto/latest
      echo ""
      ;;
    *)
      # Pass through (user provided provider/model already, or an OpenCode alias)
      echo "$model"
      ;;
  esac
}

# Setup model config - default to Sonnet 4.5 for Ralph loops
CONFIG_FLAG=""
TEMP_CONFIG=""

# Use provided model or default based on runner
# Match Cortex pattern: explicit model shortcut (not "auto")
if [[ -z "$MODEL_ARG" ]]; then
  if [[ "$RUNNER" == "opencode" ]]; then
    MODEL_ARG="grok" # Default for OpenCode
  else
    MODEL_ARG="sonnet" # Default for RovoDev (Sonnet 4.5) - explicit shortcut like Cortex
  fi
fi

if [[ "$RUNNER" == "opencode" ]]; then
  RESOLVED_MODEL="$(resolve_model_opencode "$MODEL_ARG")"
else
  RESOLVED_MODEL="$(resolve_model "$MODEL_ARG")"
fi

# Only create RovoDev temp config when runner=rovodev and we have a model to set.
# acli rovodev run supports --config-file (see: acli rovodev run --help)
if [[ "$RUNNER" == "rovodev" ]]; then
  if [[ -n "$RESOLVED_MODEL" ]]; then
    TEMP_CONFIG="/tmp/rovodev_config_$$_$(date +%s).yml"

    # Copy base config and override modelId
    if [[ -f "$HOME/.rovodev/config.yml" ]]; then
      sed "s|^  modelId:.*|  modelId: $RESOLVED_MODEL|" "$HOME/.rovodev/config.yml" >"$TEMP_CONFIG"
    else
      cat >"$TEMP_CONFIG" <<EOFCONFIG
version: 1
agent:
  modelId: $RESOLVED_MODEL
EOFCONFIG
    fi
    CONFIG_FLAG="--config-file $TEMP_CONFIG"
    echo "Using model: $RESOLVED_MODEL"
  fi
else
  # OpenCode runner uses provider/model directly; no temp config needed.
  if [[ -n "$RESOLVED_MODEL" ]]; then
    echo "Using model: $RESOLVED_MODEL"
  else
    echo "Using model: (OpenCode default)"
  fi
fi

# Resolve target branch:
# 1. User-provided --branch takes precedence
# 2. On --resume without --branch, stay on current branch
# 3. Otherwise use default WORK_BRANCH
if [[ -n "$BRANCH_ARG" ]]; then
  TARGET_BRANCH="$BRANCH_ARG"
elif [[ "$RESUME_MODE" == "true" ]]; then
  TARGET_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$WORK_BRANCH")"
else
  TARGET_BRANCH="$WORK_BRANCH"
fi

# Debug output for derived values
echo "Repo: $REPO_NAME | Branch: $TARGET_BRANCH | Lock: $LOCK_FILE"

# Resolve a prompt path robustly (works from repo root or workers/ralph/)
resolve_prompt() {
  local p="$1"
  if [[ -z "$p" ]]; then return 1; fi

  # 1) As provided (relative to current working directory)
  if [[ -f "$p" ]]; then
    realpath "$p"
    return 0
  fi

  # 2) Relative to repo root
  if [[ -f "$ROOT/$p" ]]; then
    realpath "$ROOT/$p"
    return 0
  fi

  echo "Prompt not found: $p (checked: '$p' and '$ROOT/$p')" >&2
  return 1
}

# Handle rollback mode
if [[ "$ROLLBACK_MODE" == "true" ]]; then
  echo "========================================"
  echo "🔄 Rollback Mode"
  echo "========================================"
  echo ""

  # Show last N commits
  echo "Last $ROLLBACK_COUNT commit(s) to be reverted:"
  echo ""
  git log --oneline -n "$ROLLBACK_COUNT"
  echo ""

  # Confirmation
  read -r -p "⚠️  Revert these $ROLLBACK_COUNT commit(s)? (type 'yes' to confirm): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Rollback cancelled."
    exit 0
  fi

  # Perform rollback
  echo ""
  echo "Reverting last $ROLLBACK_COUNT commit(s)..."
  if git reset --hard HEAD~"$ROLLBACK_COUNT"; then
    echo "✅ Rollback successful!"
    echo ""
    echo "Current HEAD:"
    git log --oneline -n 1
  else
    echo "❌ Rollback failed!"
    exit 1
  fi

  exit 0
fi

# Handle resume mode
if [[ "$RESUME_MODE" == "true" ]]; then
  echo "========================================"
  echo "🔄 Resume Mode"
  echo "========================================"
  echo ""

  # Check for uncommitted changes
  if git diff --quiet && git diff --cached --quiet; then
    echo "No uncommitted changes found."
    echo "Nothing to resume. Repository is clean."
    exit 0
  fi

  echo "Uncommitted changes detected:"
  echo ""
  git status --short
  echo ""

  read -r -p "Continue from this state? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Resume cancelled."
    exit 0
  fi

  echo "✅ Continuing with existing changes..."
  echo ""
fi

# Handle branch switching
if [[ -n "$BRANCH_ARG" ]]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [[ "$CURRENT_BRANCH" != "$BRANCH_ARG" ]]; then
    echo "========================================"
    echo "🌿 Branch: $BRANCH_ARG"
    echo "========================================"

    # Check if branch exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH_ARG"; then
      git checkout "$BRANCH_ARG"
    else
      echo "Creating new branch: $BRANCH_ARG"
      git checkout -b "$BRANCH_ARG"
      # Push if remote exists
      if git remote get-url origin &>/dev/null; then
        git push -u origin "$BRANCH_ARG" 2>/dev/null || true
      fi
    fi
    echo ""
  fi
fi

# Ralph determines mode from iteration number (PROMPT.md has conditional logic)
PLAN_PROMPT="$RALPH/PROMPT.md"
BUILD_PROMPT="$RALPH/PROMPT.md"

# Verifier gate - runs rules/AC.rules checks after BUILD
VERIFY_SCRIPT="$RALPH/verifier.sh"
RUN_ID_FILE="$RALPH/.verify/run_id.txt"
INIT_SCRIPT="$RALPH/init_verifier_baselines.sh"
AC_HASH_FILE="$RALPH/.verify/ac.sha256"

# Auto-init verifier baselines if missing
init_verifier_if_needed() {
  if [[ -x "$INIT_SCRIPT" && ! -f "$AC_HASH_FILE" ]]; then
    echo ""
    echo "========================================"
    echo "🔧 Initializing verifier baselines..."
    echo "========================================"
    if "$INIT_SCRIPT"; then
      echo "✅ Baselines initialized successfully"
    else
      echo "❌ Failed to initialize baselines"
      return 1
    fi
  fi
  return 0
}

# Track last verifier result for prompt injection
LAST_VERIFIER_STATUS=""
LAST_VERIFIER_FAILED_RULES=""
LAST_VERIFIER_FAIL_COUNT=0

# Parse verifier report to extract failed rules
parse_verifier_failures() {
  local report_file="$1"
  [[ -f "$report_file" ]] || return

  local rules=""
  local count=0

  # Extract [FAIL] rule IDs (standard format)
  local standard_fails
  standard_fails=$(grep -oE '^\[FAIL\] [A-Za-z0-9_.]+' "$report_file" 2>/dev/null | sed 's/\[FAIL\] //' | tr '\n' ',' | sed 's/,$//' | sed 's/,,*/,/g')
  local standard_count
  standard_count=$(grep -c '^\[FAIL\]' "$report_file" 2>/dev/null || echo "0")

  # Check for hash guard failure (special format: [timestamp] FAIL: AC hash mismatch)
  if grep -q 'FAIL: AC hash mismatch' "$report_file" 2>/dev/null; then
    rules="HashGuard"
    count=1
  fi

  # Combine results
  if [[ -n "$standard_fails" ]]; then
    if [[ -n "$rules" ]]; then
      rules="$rules, $standard_fails"
    else
      rules="$standard_fails"
    fi
    count=$((count + standard_count))
  fi

  LAST_VERIFIER_FAILED_RULES="$rules"
  LAST_VERIFIER_FAIL_COUNT="$count"
}

# Check if Ralph requested human intervention in the log
check_human_intervention() {
  local log_file="$1"
  # Strip ANSI codes and check for human intervention marker
  if sed 's/\x1b\[[0-9;]*m//g' "$log_file" | grep -q 'HUMAN INTERVENTION REQUIRED'; then
    return 0 # intervention needed
  fi
  return 1 # no intervention needed
}

# Check if previous verifier found protected file failures (requires human intervention)
check_protected_file_failures() {
  # If no failed rules, nothing to check
  [[ -z "$LAST_VERIFIER_FAILED_RULES" ]] && return 1

  # Check if any Protected.* rules failed
  if echo "$LAST_VERIFIER_FAILED_RULES" | grep -qE 'Protected\.[0-9]+'; then
    return 0 # protected file failures found
  fi
  return 1 # no protected file failures
}

# =============================================================================
# Structured Marker Emission (Phase 0 Observability)
# =============================================================================
# Markers are emitted to BOTH:
#   1. stderr (for terminal visibility)
#   2. CURRENT_LOG_FILE (for rollflow_analyze parsing)
#
# CURRENT_LOG_FILE is set by run_once() before tool execution.
# If not set, markers only go to stderr.

CURRENT_LOG_FILE=""

# Emit a structured marker to stderr AND log file (if set)
# Args: $1 = marker line
emit_marker() {
  local marker="$1"
  # Always emit to stderr for terminal visibility
  echo "$marker" >&2
  # Also append to log file if set (for rollflow_analyze)
  if [[ -n "$CURRENT_LOG_FILE" && -f "$CURRENT_LOG_FILE" ]]; then
    echo "$marker" >>"$CURRENT_LOG_FILE"
  fi
}

# =============================================================================
# Scoped Staging - Stage only intended files, exclude noise
# =============================================================================
# Always stages: workers/IMPLEMENTATION_PLAN.md, workers/ralph/THUNK.md (canonical layout)
# Never stages: artifacts/**, */rollflow_cache/**, *.sqlite
# Conditionally stages: Other changed files not in denylist
#
# Usage: stage_scoped_changes
# Returns: 0 if files were staged, 1 if nothing to stage
stage_scoped_changes() {
  local staged_count=0

  # Detect canonical paths based on ADR-0001
  local plan_file="workers/IMPLEMENTATION_PLAN.md"
  local thunk_file="workers/ralph/THUNK.md"

  # Always stage core Ralph files if they have changes
  for core_file in "$plan_file" "$thunk_file"; do
    if [[ -f "$ROOT/$core_file" ]] && ! git diff --quiet -- "$ROOT/$core_file" 2>/dev/null; then
      git add "$ROOT/$core_file"
      staged_count=$((staged_count + 1))
    fi
  done

  # Get all changed files (unstaged only, since we handle core files above)
  local changed_files
  changed_files=$(git diff --name-only 2>/dev/null) || true

  # Also include untracked files (e.g., newly created docs/skills) so flush commits
  # don't leave the worktree dirty.
  local untracked_files
  untracked_files=$(git ls-files --others --exclude-standard 2>/dev/null) || true

  # Stage each file unless it matches denylist patterns
  local files_to_consider
  files_to_consider=$(printf "%s\n%s\n" "$changed_files" "$untracked_files" | sed '/^\s*$/d' | sort -u) || true

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue

    # Denylist patterns - skip these files (template-safe patterns only)
    case "$file" in
      artifacts/*) continue ;;        # Dashboard, metrics, reports
      */rollflow_cache/*) continue ;; # Cache databases
      *.sqlite) continue ;;           # Any SQLite files
    esac

    # Stage the file
    git add "$ROOT/$file" 2>/dev/null && staged_count=$((staged_count + 1))
  done <<<"$files_to_consider"

  # Protected file rule: ensure .verify hash files are staged with their protected files
  # This prevents pre-commit hash validation failures
  # Protected files: loop.sh, verifier.sh, PROMPT.md, rules/AC.rules, AGENTS.md
  local protected_files=("loop" "verifier" "prompt" "ac" "agents")
  local verify_dirs=(".verify" "workers/.verify" "workers/ralph/.verify" "templates/ralph/.verify")

  for pf in "${protected_files[@]}"; do
    # Check if any file with this base is staged
    if git diff --cached --name-only | grep -qiE "(${pf}\.sh|${pf}\.md|${pf}\.rules)$"; then
      # Stage all corresponding hash files that have changes
      for vdir in "${verify_dirs[@]}"; do
        local hash_file="${vdir}/${pf}.sha256"
        if [[ -f "$ROOT/$hash_file" ]] && ! git diff --quiet -- "$ROOT/$hash_file" 2>/dev/null; then
          git add "$ROOT/$hash_file" 2>/dev/null && staged_count=$((staged_count + 1))
        fi
      done
    fi
  done

  if [[ $staged_count -gt 0 ]]; then
    echo "Staged $staged_count file(s) (scoped staging)"
    return 0
  else
    return 1
  fi
}

# =============================================================================
# End-of-Run Flush Commit - Ensure no changes are left uncommitted
# =============================================================================
# Commits any pending changes using scoped staging so that runs ending on BUILD
# do not leave a dirty worktree.
#
# Usage: flush_scoped_commit_if_needed <reason>
flush_scoped_commit_if_needed() {
  local reason="${1:-end_of_run}"

  # Respect dry-run mode: never commit
  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    return 0
  fi

  # Nothing to do if clean
  if git diff --quiet && git diff --cached --quiet; then
    return 0
  fi

  echo ""
  echo "Flushing uncommitted changes (reason: $reason)..."

  if stage_scoped_changes; then
    git commit -m "build: flush uncommitted changes ($reason)" || true
    echo "✓ Flush commit created"
  else
    echo "No files to commit after scoped staging"
  fi
  echo ""
}

generate_iteration_summary() {
  local iter_num="$1"
  local mode="$2"
  local logfile="$3"

  local timestamp run_id
  timestamp="$(date '+%Y-%m-%d %H:%M')"
  run_id="${ROLLFLOW_RUN_ID:-unknown}"

  # Context (best-effort)
  local branch runner model
  branch="${TARGET_BRANCH:-$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown") }"
  runner="${RUNNER:-unknown}"
  model="${MODEL_DISPLAY:-${RESOLVED_MODEL:-${MODEL_ARG:-auto}}}"

  strip_ansi_csi() {
    sed -E $'s/\x1B\[[0-?]*[ -/]*[@-~]//g; s/\x1B\][^\x07]*(\x07|\x1B\\\\)//g'
  }

  if [[ ! -f "$logfile" ]]; then
    cat <<EOF
**Ralph — Iteration ${iter_num} (${mode^^})** • ${timestamp}

**Run**
- Run ID: `${run_id}`
- Log: `${logfile}`
EOF
    return
  fi

  local marker_line
  marker_line=$(grep -n ":::\(PLAN\|BUILD\)_READY:::" "$logfile" 2>/dev/null | tail -1 | cut -d: -f1 || echo "")

  if [[ -z "$marker_line" ]]; then
    cat <<EOF
**Ralph — Iteration ${iter_num} (${mode^^})** • ${timestamp}

**Run**
- Run ID: `${run_id}`
- Log: `${logfile}`
EOF
    return
  fi

  local search_prefix response_line start_line
  search_prefix=$(sed -n "1,${marker_line}p" "$logfile" | strip_ansi_csi)
  response_line=$(echo "$search_prefix" | grep -n "─── Response" | tail -1 | cut -d: -f1 || echo "")

  if [[ -n "$response_line" ]]; then
    start_line=$((response_line + 1))
  else
    start_line=1
  fi

  local raw_block
  raw_block=$(sed -n "${start_line},$((marker_line - 1))p" "$logfile" | strip_ansi_csi)

  local awk_program
  awk_program=$(cat <<'AWK'
function flush_section() {
  if (sec == "") return
  out[sec] = buf
  buf = ""
}

function add_line(s) {
  if (s ~ /^[[:space:]]*$/) return
  sub(/\r$/, "", s)

  # Convert bullet glyphs to dash bullets
  if (s ~ /^[[:space:]]*[•●]/) {
    sub(/^[[:space:]]*[•●][[:space:]]*/, "- ", s)
  }

  # If this is an indented continuation and last line was a bullet, indent it
  if (s ~ /^[[:space:]]+/ && last_was_bullet) {
    s = "  " s
  }

  last_was_bullet = (s ~ /^- /)
  buf = buf s "\n"
}

BEGIN {
  sec = "Preamble"
  buf = ""
  last_was_bullet = 0
}

/^PROGRESS[[:space:]]*\|/ {
  if (match($0, /file=([^[:space:]]+)/, m)) file = m[1]
  next
}

/^STATUS[[:space:]]*\|/ { next }

/^Summary[[:space:]]*$/       { flush_section(); sec = "Summary"; next }
/^Changes Made[[:space:]]*$/  { flush_section(); sec = "Changes Made"; next }
/^Next Steps[[:space:]]*$/    { flush_section(); sec = "Next Steps"; next }
/^Completed[[:space:]]*$/     { flush_section(); sec = "Completed"; next }

{ add_line($0) }

END {
  flush_section()

  if (file != "") print "__FILE__=" file

  if (out["Summary"] == "" && out["Preamble"] != "") out["Summary"] = out["Preamble"]

  # If Summary has no dash bullets, bulletize each line
  if (out["Summary"] != "" && out["Summary"] !~ /^- /) {
    n = split(out["Summary"], a, "\n")
    tmp = ""
    for (i=1; i<=n; i++) {
      if (a[i] ~ /^[[:space:]]*$/) continue
      tmp = tmp "- " a[i] "\n"
    }
    out["Summary"] = tmp
  }

  print "__SECTION__Summary";       printf "%s", out["Summary"]
  print "__SECTION__Changes Made";  printf "%s", out["Changes Made"]
  print "__SECTION__Next Steps";    printf "%s", out["Next Steps"]
}
AWK
)

  local parsed
  parsed=$(echo "$raw_block" | awk "$awk_program")

  local context_file=""
  if echo "$parsed" | head -1 | grep -q '^__FILE__='; then
    context_file=$(echo "$parsed" | head -1 | sed 's/^__FILE__=//')
    parsed=$(echo "$parsed" | tail -n +2)
  fi

  local summary_section changes_section next_steps_section
  summary_section=$(echo "$parsed" | awk '/^__SECTION__Summary$/{p=1;next} /^__SECTION__Changes Made$/{p=0} p{print}')
  changes_section=$(echo "$parsed" | awk '/^__SECTION__Changes Made$/{p=1;next} /^__SECTION__Next Steps$/{p=0} p{print}')
  next_steps_section=$(echo "$parsed" | awk '/^__SECTION__Next Steps$/{p=1;next} p{print}')

  summary_section=$(echo "$summary_section" | sed '/^[[:space:]]*$/d')
  changes_section=$(echo "$changes_section" | sed '/^[[:space:]]*$/d')
  next_steps_section=$(echo "$next_steps_section" | sed '/^[[:space:]]*$/d')

  echo "**Ralph — Iteration ${iter_num} (${mode^^})** • ${timestamp}"
  echo ""
  echo "**Context**"
  echo "- Branch: \`${branch}\`"
  echo "- Runner: \`${runner}\`"
  echo "- Model: \`${model}\`"
  if [[ -n "$context_file" ]]; then
    echo "- File: \`${context_file}\`"
  fi
  echo ""

  if [[ -n "$summary_section" ]]; then
    echo "**Summary**"
    echo "$summary_section"
    echo ""
  fi

  if [[ -n "$changes_section" ]]; then
    echo "**Changes Made**"
    echo "$changes_section"
    echo ""
  fi

  if [[ -n "$next_steps_section" ]]; then
    echo "**Next Steps**"
    echo "$next_steps_section"
    echo ""
  fi

  echo "**Run**"
  echo "- Run ID: \`${run_id}\`"
  echo "- Log: \`${logfile}\`"
}



# Emit structured TOOL_START marker
# Args: $1 = tool_id, $2 = tool_name, $3 = cache_key, $4 = git_sha
log_tool_start() {
  local tool_id="$1"
  local tool_name="$2"
  local cache_key="$3"
  local git_sha="$4"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  emit_marker ":::TOOL_START::: id=${tool_id} tool=${tool_name} cache_key=${cache_key} git_sha=${git_sha} ts=${ts}"
}

# Emit structured TOOL_END marker
# Args: $1 = tool_id, $2 = result (PASS/FAIL), $3 = exit_code, $4 = duration_ms, $5 = reason (optional)
log_tool_end() {
  local tool_id="$1"
  local result="$2"
  local exit_code="$3"
  local duration_ms="$4"
  local reason="${5:-}"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [[ -n "$reason" ]]; then
    emit_marker ":::TOOL_END::: id=${tool_id} result=${result} exit=${exit_code} duration_ms=${duration_ms} reason=${reason} ts=${ts}"
  else
    emit_marker ":::TOOL_END::: id=${tool_id} result=${result} exit=${exit_code} duration_ms=${duration_ms} ts=${ts}"
  fi
}

# Emit cache hit marker
# Args: $1 = cache_key, $2 = tool_name
log_cache_hit() {
  local cache_key="$1"
  local tool_name="$2"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  emit_marker ":::CACHE_HIT::: cache_key=${cache_key} tool=${tool_name} ts=${ts}"
}

# Emit cache miss marker
# Args: $1 = cache_key, $2 = tool_name
log_cache_miss() {
  local cache_key="$1"
  local tool_name="$2"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  emit_marker ":::CACHE_MISS::: cache_key=${cache_key} tool=${tool_name} ts=${ts}"
}

# Wrapper for tool execution with structured logging
# Ensures TOOL_END marker is emitted even on failure (via trap)
# Args: $1 = tool_id, $2 = tool_name, $3 = tool_key, $4 = git_sha, $5 = command to execute
# Returns: exit code from command
run_tool() {
  local tool_id="$1"
  local tool_name="$2"
  local tool_key="$3"
  local git_sha="$4"
  local tool_command="$5"

  local start_ms
  local end_ms
  local duration_ms
  local rc

  # Start timing
  start_ms="$(($(date +%s%N) / 1000000))"

  # Log tool start
  log_tool_start "$tool_id" "$tool_name" "$tool_key" "$git_sha"

  # Set up trap to ensure TOOL_END on failure/interrupt
  # This trap handles signals (INT/TERM) and ensures cleanup before exit
  trap 'end_ms="$(($(date +%s%N) / 1000000))"; duration_ms="$((end_ms - start_ms))"; log_tool_end "$tool_id" "FAIL" "130" "$duration_ms" "interrupted"; exit 130' INT TERM

  # Execute command (with set +e to capture exit code without triggering set -e)
  set +e
  eval "$tool_command"
  rc=$?
  set -e

  # Clear trap
  trap - INT TERM

  # Calculate duration
  end_ms="$(($(date +%s%N) / 1000000))"
  duration_ms="$((end_ms - start_ms))"

  # Log tool end - ALWAYS emit this marker (pass or fail)
  if [[ $rc -ne 0 ]]; then
    log_tool_end "$tool_id" "FAIL" "$rc" "$duration_ms" "exit_code_$rc"
  else
    log_tool_end "$tool_id" "PASS" "$rc" "$duration_ms"
  fi

  return $rc
}

run_verifier() {
  local iter="${1:-0}"
  if [[ ! -x "$VERIFY_SCRIPT" ]]; then
    # Check for .initialized marker to determine security vs bootstrap mode
    if [[ -f "$RALPH/.verify/.initialized" ]]; then
      # Security hard-fail: verifier was initialized but is now missing
      echo "🚨 SECURITY ERROR: Verifier missing but .initialized marker exists!"
      echo "   Expected: $VERIFY_SCRIPT"
      echo "   Marker: $RALPH/.verify/.initialized"
      LAST_VERIFIER_STATUS="FAIL"
      LAST_VERIFIER_FAILED_RULES="verifier_missing_initialized"
      LAST_VERIFIER_FAIL_COUNT=1
      return 1
    else
      # Bootstrap mode: soft-fail, allow continuation
      echo "⚠️  Verifier not found or not executable: $VERIFY_SCRIPT"
      echo "   (Bootstrap mode - no .initialized marker found)"
      LAST_VERIFIER_STATUS="SKIP"
      return 0 # Don't block if verifier doesn't exist yet
    fi
  fi

  # Auto-init baselines if missing
  if ! init_verifier_if_needed; then
    LAST_VERIFIER_STATUS="FAIL"
    LAST_VERIFIER_FAILED_RULES="init_baselines"
    LAST_VERIFIER_FAIL_COUNT=1
    return 1
  fi

  echo ""
  echo "========================================"
  echo "🔍 Running acceptance criteria verifier..."
  echo "========================================"

  # Generate unique run ID for freshness check
  RUN_ID="$(date +%s)-$$"
  export RUN_ID

  # Emit structured verifier environment marker
  local verifier_ts
  verifier_ts="$(date +%s)"
  emit_marker ":::VERIFIER_ENV::: iter=${iter:-0} ts=${verifier_ts} run_id=${RUN_ID}"

  # Capture stderr to summarize cache metrics (avoid spamming 40+ lines)
  local cache_stderr
  cache_stderr=$(mktemp)

  if "$VERIFY_SCRIPT" 2>"$cache_stderr"; then
    # Verify freshness: run_id.txt must match our RUN_ID
    if [[ -f "$RUN_ID_FILE" ]]; then
      local stored_id
      stored_id=$(cat "$RUN_ID_FILE" 2>/dev/null)
      if [[ "$stored_id" != "$RUN_ID" ]]; then
        echo "❌ Freshness check FAILED: run_id mismatch"
        echo "   Expected: $RUN_ID"
        echo "   Got: $stored_id"
        rm -f "$cache_stderr"
        LAST_VERIFIER_STATUS="FAIL"
        LAST_VERIFIER_FAILED_RULES="freshness_check"
        LAST_VERIFIER_FAIL_COUNT=1
        return 1
      fi
    else
      echo "❌ Freshness check FAILED: run_id.txt not found"
      rm -f "$cache_stderr"
      LAST_VERIFIER_STATUS="FAIL"
      LAST_VERIFIER_FAILED_RULES="freshness_check"
      LAST_VERIFIER_FAIL_COUNT=1
      return 1
    fi

    # Show cache summary (hits/misses) instead of 40+ individual lines
    local cache_hits cache_misses
    cache_hits=$(grep -c '\[CACHE_HIT\]' "$cache_stderr" 2>/dev/null) || cache_hits=0
    cache_misses=$(grep -c '\[CACHE_MISS\]' "$cache_stderr" 2>/dev/null) || cache_misses=0
    if [[ $((cache_hits + cache_misses)) -gt 0 ]]; then
      echo "📊 Cache: $cache_hits hits, $cache_misses misses"
    fi
    rm -f "$cache_stderr"

    echo "✅ All acceptance criteria passed! (run_id: $RUN_ID)"
    tail -10 "$RALPH/.verify/latest.txt" 2>/dev/null || true
    LAST_VERIFIER_STATUS="PASS"
    LAST_VERIFIER_FAILED_RULES=""
    LAST_VERIFIER_FAIL_COUNT=0
    return 0
  else
    # Show cache summary even on failure
    local cache_hits cache_misses
    cache_hits=$(grep -c '\[CACHE_HIT\]' "$cache_stderr" 2>/dev/null) || cache_hits=0
    cache_misses=$(grep -c '\[CACHE_MISS\]' "$cache_stderr" 2>/dev/null) || cache_misses=0
    if [[ $((cache_hits + cache_misses)) -gt 0 ]]; then
      echo "📊 Cache: $cache_hits hits, $cache_misses misses"
    fi
    rm -f "$cache_stderr"

    echo "❌ Acceptance criteria FAILED"
    echo ""
    # Show header and summary, skip individual check results
    sed -n '1,/^----/p; /^SUMMARY$/,$ p' "$RALPH/.verify/latest.txt" 2>/dev/null || echo "(no report found)"
    LAST_VERIFIER_STATUS="FAIL"
    parse_verifier_failures "$RALPH/.verify/latest.txt"
    return 1
  fi
}

run_once() {
  local prompt_file="$1"
  local phase="$2"
  local iter="$3"

  local ts
  ts="$(date +%F_%H%M%S)"
  local log="$LOGDIR/${ts}_iter${iter}_${phase}.log"

  # Set global log file for marker emission (Phase 0 observability)
  # Touch the file first so emit_marker can append to it
  touch "$log"
  CURRENT_LOG_FILE="$log"

  # Hard-block llm_ro scope for PLAN/BUILD phases (task 1.3.3)
  # These phases must always call the LLM fresh to avoid skipping work
  local effective_cache_scope="$CACHE_SCOPE"
  if [[ "$phase" == "plan" || "$phase" == "build" ]]; then
    if echo "$CACHE_SCOPE" | grep -q "llm_ro"; then
      # Remove llm_ro from scope
      effective_cache_scope=$(echo "$CACHE_SCOPE" | sed 's/,llm_ro//g; s/llm_ro,//g; s/llm_ro//g' | sed 's/^,//; s/,$//')
      echo ""
      echo "⚠️  llm_ro scope ignored for ${phase^^} phase (cache safety)"
      echo "   Original scope: $CACHE_SCOPE"
      echo "   Effective scope: $effective_cache_scope"
      echo ""
    fi
  fi

  echo
  echo "========================================"
  echo "Ralph Loop"
  echo "Root: $ROOT"
  echo "Iteration: $iter / $ITERATIONS"
  echo "Phase: $phase"
  echo "Prompt: $prompt_file"
  echo "Log: $log"
  echo "========================================"
  echo

  # Create temporary prompt with mode prepended
  local prompt_with_mode="/tmp/rovodev_prompt_with_mode_$$_${iter}.md"
  {
    echo "# MODE: ${phase^^}"
    echo "# REPOSITORY: $REPO_NAME"
    echo "# ROOT: $ROOT"
    echo "# RUNNER: $RUNNER"

    # Single source of truth: this is the model value loop.sh will actually use/pass to the runner.
    # If RESOLVED_MODEL is empty (e.g. user asked for auto/latest), fall back to the requested MODEL_ARG.
    local effective_model
    effective_model="${RESOLVED_MODEL:-${MODEL_ARG:-auto}}"
    echo "# MODEL: ${effective_model}"
    echo ""

    # Inject verifier status from previous iteration (if any)
    if [[ -n "$LAST_VERIFIER_STATUS" ]]; then
      echo "# LAST_VERIFIER_RESULT: $LAST_VERIFIER_STATUS"
      if [[ "$LAST_VERIFIER_STATUS" == "FAIL" ]]; then
        echo "# FAILED_RULES: $LAST_VERIFIER_FAILED_RULES"
        echo "# FAILURE_COUNT: $LAST_VERIFIER_FAIL_COUNT"
        echo "# ACTION_REQUIRED: Fix AC failures shown below BEFORE picking new tasks."
      fi
      echo ""
    fi

    # Inject current verifier summary (BUILD mode gets fresh state after auto-fix)
    # IMPORTANT: This is the ONLY source of verifier info - DO NOT read .verify/latest.txt
    if [[ "$phase" == "build" ]] && [[ -f "$VERIFY_REPORT" ]]; then
      echo "# ═══════════════════════════════════════════════════════════════"
      echo "# VERIFIER STATUS (injected by loop.sh - DO NOT read .verify/latest.txt)"
      echo "# ═══════════════════════════════════════════════════════════════"
      echo ""
      # Extract summary section
      sed -n '/^SUMMARY$/,/^$/p' "$VERIFY_REPORT" 2>/dev/null || true
      echo ""
      # Show WARN and FAIL items with full details
      local warn_fail_count
      warn_fail_count=$(grep -cE "^\[WARN\]|\[FAIL\]" "$VERIFY_REPORT" 2>/dev/null) || warn_fail_count=0
      if [[ "$warn_fail_count" -gt 0 ]]; then
        echo "# Issues requiring attention:"
        grep -E "^\[WARN\]|\[FAIL\]" "$VERIFY_REPORT" 2>/dev/null
        echo ""
        # Include the desc/cmd/stdout for failed items
        echo "# Details for failed checks:"
        awk '/^\[FAIL\]/{p=1; print; next} p && /^  (desc|cmd|exit|stdout):/{print} p && /^\[/{p=0}' "$VERIFY_REPORT" 2>/dev/null || true
      else
        echo "# ✅ All checks passing!"
      fi
      echo ""
      echo "# ═══════════════════════════════════════════════════════════════"
      echo ""
    fi

    # Inject remaining markdown lint errors (PLAN mode only)
    # PLAN Ralph should see these so he can add tasks to fix them
    if [[ "$phase" == "plan" ]] && [[ -n "${MARKDOWN_LINT_ERRORS:-}" ]]; then
      echo "# ═══════════════════════════════════════════════════════════════"
      echo "# MARKDOWN LINT ERRORS (add tasks to IMPLEMENTATION_PLAN.md)"
      echo "# ═══════════════════════════════════════════════════════════════"
      echo "#"
      echo "# The following markdown errors could NOT be auto-fixed."
      echo "# Add tasks to IMPLEMENTATION_PLAN.md using this format:"
      echo "#"
      echo "#   - [ ] **X.Y** Fix <ERROR_CODE> in <filename>"
      echo "#     - **AC:** \`markdownlint <file>\` passes (no <ERROR_CODE> errors)"
      echo "#"
      echo "# Errors to fix:"
      echo "#"
      echo "$MARKDOWN_LINT_ERRORS"
      echo ""
      echo "# ═══════════════════════════════════════════════════════════════"
      echo ""
    fi

    # Inject AGENTS.md (standard Ralph pattern: PROMPT.md + AGENTS.md)
    # NEURONS.md and THOUGHTS.md are read via subagent when needed (too large for base context)
    echo "# AGENTS.md - Operational Guide"
    echo ""
    cat "${RALPH}/AGENTS.md"
    echo ""
    echo "---"
    echo ""

    cat "$prompt_file"

    # Append dry-run instruction if enabled
    if [[ "$DRY_RUN" == "true" ]]; then
      echo ""
      echo "---"
      echo ""
      echo "# DRY-RUN MODE ACTIVE"
      echo ""
      echo "⚠️ **CRITICAL: This is a dry-run. DO NOT commit any changes.**"
      echo ""
      echo "Your task:"
      echo "1. Read IMPLEMENTATION_PLAN.md and identify the first unchecked task"
      echo "2. Analyze what changes would be needed to implement it"
      echo "3. Show file diffs or describe modifications you would make"
      echo "4. Update IMPLEMENTATION_PLAN.md with detailed notes about your findings"
      echo "5. DO NOT use git commit - stop after analysis"
      echo ""
      echo "Output format:"
      echo "- List files that would be created/modified"
      echo "- Show code snippets or diffs for key changes"
      echo "- Document any risks or dependencies discovered"
      echo "- Add findings to IMPLEMENTATION_PLAN.md under 'Discoveries & Notes'"
      echo ""
      echo "This is a preview only. No commits will be made."
    fi
  } >"$prompt_with_mode"

  # Feed prompt into selected runner with RollFlow tracking markers
  local tool_id tool_key start_ms end_ms duration_ms rc
  local git_sha
  git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
  tool_id="$(tool_call_id)"
  # Generate input-based cache key (prompt content hash + git SHA, NOT iteration number)
  # This implements task 1.5.1: remove iteration-level caching, use content-based keys
  local prompt_hash
  prompt_hash="$(sha256sum "$prompt_with_mode" 2>/dev/null | cut -d' ' -f1 || echo 'unknown')"
  # Use AGENT_NAME for cache key (task 4.4.1: agent isolation)
  local agent_key="${AGENT_NAME:-${RUNNER}}"
  if [[ -z "$AGENT_NAME" ]]; then
    echo "⚠️  WARNING: AGENT_NAME not set, falling back to RUNNER for cache key" >&2
  fi
  tool_key="${agent_key,,}|${phase}|${prompt_hash:0:16}|${git_sha}"
  start_ms="$(($(date +%s%N) / 1000000))"

  # Check cache if CACHE_SKIP or CACHE_MODE=use is enabled and neither FORCE_NO_CACHE nor FORCE_FRESH is set
  if [[ ("$CACHE_SKIP" == "true" || "$CACHE_MODE" == "use") && "$FORCE_NO_CACHE" != "true" && "$FORCE_FRESH" != "true" ]]; then
    # Safety check: If BUILD phase has pending tasks, force fresh run (task 1.4.1)
    if [[ "$phase" == "build" ]]; then
      local plan_file="${ROOT}/workers/IMPLEMENTATION_PLAN.md"
      if [[ -f "$plan_file" ]] && grep -q "^- \[ \]" "$plan_file"; then
        local guard_ts=$(($(date +%s%N) / 1000000))
        emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=0 reason=pending_tasks phase=BUILD ts=${guard_ts}"
        echo ""
        echo "========================================"
        echo "⚠️  Cache disabled: pending tasks detected"
        echo "BUILD phase with [ ] tasks requires fresh execution"
        echo "========================================"
        echo ""
        # Skip cache lookup, proceed with normal execution
      elif lookup_cache_pass "$tool_key" "$git_sha" "$RUNNER"; then
        # Cache hit - skip tool execution
        local guard_ts=$(($(date +%s%N) / 1000000))
        emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=1 reason=no_pending_tasks phase=BUILD ts=${guard_ts}"
        # Query saved duration from cache
        local saved_ms=0
        local cache_db="${CACHE_DB:-artifacts/rollflow_cache/cache.sqlite}"
        if [[ -f "$cache_db" ]]; then
          saved_ms=$(python3 -c "
import sqlite3
try:
    conn = sqlite3.connect('$cache_db')
    cursor = conn.execute('SELECT last_duration_ms FROM pass_cache WHERE cache_key = ?', ('$tool_key',))
    row = cursor.fetchone()
    conn.close()
    print(row[0] if row and row[0] else 0)
except Exception:
    print(0)
" 2>/dev/null) || saved_ms=0
        fi

        log_cache_hit "$tool_key" "$RUNNER"
        CACHE_HITS=$((CACHE_HITS + 1))
        TIME_SAVED_MS=$((TIME_SAVED_MS + saved_ms))

        echo ""
        echo "========================================"
        echo "✓ Cache hit - skipping tool execution"
        echo "Key: $tool_key"
        echo "Tool: $RUNNER"
        echo "Saved: ${saved_ms}ms"
        echo "========================================"
        echo ""
        # Cleanup temp config before early return
        if [[ -n "${TEMP_CONFIG:-}" && -f "${TEMP_CONFIG:-}" ]]; then
          rm -f "$TEMP_CONFIG"
        fi
        return 0
      else
        # Cache miss - proceed with execution
        local guard_ts=$(($(date +%s%N) / 1000000))
        emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=1 reason=no_pending_tasks phase=BUILD ts=${guard_ts}"
        log_cache_miss "$tool_key" "${AGENT_NAME:-$RUNNER}"
        CACHE_MISSES=$((CACHE_MISSES + 1))
      fi
    else
      # PLAN phase - check cache normally
      if lookup_cache_pass "$tool_key" "$git_sha" "$RUNNER"; then
        # Cache hit - skip tool execution
        local guard_ts=$(($(date +%s%N) / 1000000))
        emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=1 reason=idempotent_check phase=PLAN ts=${guard_ts}"
        # Query saved duration from cache
        local saved_ms=0
        local cache_db="${CACHE_DB:-artifacts/rollflow_cache/cache.sqlite}"
        if [[ -f "$cache_db" ]]; then
          saved_ms=$(python3 -c "
import sqlite3
try:
    conn = sqlite3.connect('$cache_db')
    cursor = conn.execute('SELECT last_duration_ms FROM pass_cache WHERE cache_key = ?', ('$tool_key',))
    row = cursor.fetchone()
    conn.close()
    print(row[0] if row and row[0] else 0)
except Exception:
    print(0)
" 2>/dev/null) || saved_ms=0
        fi

        log_cache_hit "$tool_key" "$RUNNER"
        CACHE_HITS=$((CACHE_HITS + 1))
        TIME_SAVED_MS=$((TIME_SAVED_MS + saved_ms))

        echo ""
        echo "========================================"
        echo "✓ Cache hit - skipping tool execution"
        echo "Key: $tool_key"
        echo "Tool: $RUNNER"
        echo "Saved: ${saved_ms}ms"
        echo "========================================"
        echo ""
        # Cleanup temp config before early return
        if [[ -n "${TEMP_CONFIG:-}" && -f "${TEMP_CONFIG:-}" ]]; then
          rm -f "$TEMP_CONFIG"
        fi
        return 0
      else
        # Cache miss - proceed with execution
        local guard_ts=$(($(date +%s%N) / 1000000))
        emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=1 reason=idempotent_check phase=PLAN ts=${guard_ts}"
        log_cache_miss "$tool_key" "${AGENT_NAME:-$RUNNER}"
        CACHE_MISSES=$((CACHE_MISSES + 1))
      fi
    fi
  fi

  # Execute LLM call through run_tool() wrapper for structured logging
  if [[ "$RUNNER" == "opencode" ]]; then
    # NOTE: Passing full prompt as CLI arg can hit shell/argv limits if prompt is huge.
    # If that happens, pivot to a file-based approach after validating basic integration.
    attach_flag=""
    if [[ -n "${OPENCODE_ATTACH:-}" ]]; then
      attach_flag="--attach ${OPENCODE_ATTACH}"
    fi
    run_tool "$tool_id" "$RUNNER" "$tool_key" "$git_sha" \
      "opencode run \"${attach_flag}\" --model \"${RESOLVED_MODEL}\" --format \"${OPENCODE_FORMAT}\" \"\$(cat \"$prompt_with_mode\")\" 2>&1 | tee -a \"$log\""
    rc=$?

    if [[ $rc -ne 0 ]]; then
      echo "❌ OpenCode failed (exit $rc). See: $log"
      tail -n 80 "$log" || true
      return 1
    fi
  else
    # Default: RovoDev
    run_tool "$tool_id" "$RUNNER" "$tool_key" "$git_sha" \
      "script -q -c \"cat \\\"$prompt_with_mode\\\" | acli rovodev run ${CONFIG_FLAG} ${YOLO_FLAG} 2> >(bash $ROOT/workers/shared/filter_acli_errors.sh >&2)\" \"$log\""
    rc=$?
  fi

  # Clean up temporary prompt
  rm -f "$prompt_with_mode"

  echo
  echo "Run complete."
  echo "Transcript: $log"

  # In dry-run mode, remind user no commits were made
  if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "========================================"
    echo "🔍 Dry-run completed"
    echo "No changes were committed."
    echo "Review the transcript above for analysis."
    echo "========================================"
  fi

  # Run verifier after both PLAN and BUILD iterations
  if [[ "$phase" == "plan" ]] || [[ "$phase" == "build" ]]; then
    if run_verifier "$iter"; then
      echo ""
      echo "========================================"
      echo "🎉 ${phase^^} iteration verified successfully!"
      echo "========================================"
      CONSECUTIVE_VERIFIER_FAILURES=0
    else
      echo ""
      echo "========================================"
      echo "⚠️  ${phase^^} completed but verification failed."
      echo "Review .verify/latest.txt for details."
      echo "========================================"
      # Return special exit code for verifier failure (not human intervention)
      # This allows the main loop to track consecutive failures
      return 44
    fi
  fi

  # Legacy: also check for :::COMPLETE::: but ignore it (loop.sh owns completion now)
  if sed 's/\x1b\[[0-9;]*m//g' "$log" | grep -qE '^\s*:::COMPLETE:::\s*$'; then
    echo ""
    echo "⚠️  Ralph output :::COMPLETE::: but that token is reserved for loop.sh."
    echo "Ignoring - use :::BUILD_READY::: or :::PLAN_READY::: instead."
  fi

  # Check if Ralph requested human intervention
  if check_human_intervention "$log"; then
    echo ""
    echo "========================================"
    echo "🛑 HUMAN INTERVENTION REQUIRED"
    echo "========================================"
    echo "Ralph has indicated it cannot proceed without human help."
    echo "Review the log above for details."
    echo ""
    return 43 # Special return code for human intervention
  fi

  # Check if all tasks are done (for true completion)
  if [[ -f "$ROOT/IMPLEMENTATION_PLAN.md" ]]; then
    local unchecked_count
    # Note: grep -c returns exit 1 when count is 0, so we capture output first then default
    unchecked_count=$(grep -cE '^\s*-\s*\[ \]' "$ROOT/IMPLEMENTATION_PLAN.md" 2>/dev/null) || unchecked_count=0
    if [[ "$unchecked_count" -eq 0 ]]; then
      # All tasks done - run final verification
      if run_verifier "$iter"; then
        echo ""
        echo "========================================"
        echo "🎉 All tasks complete and verified!"
        echo "========================================"
        return 42 # Special return code for completion
      fi
    fi
  fi

  return 0
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
launch_monitors() {
  local monitor_dir="$RALPH"
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

# Start OpenCode server if requested
if [[ "$RUNNER" == "opencode" ]]; then
  if $OPENCODE_SERVE; then
    OPENCODE_ATTACH="http://localhost:${OPENCODE_PORT}"
    opencode serve --port "$OPENCODE_PORT" >/tmp/opencode_serve.log 2>&1 &
    OPENCODE_SERVE_PID=$!
    trap '[[ -n "${OPENCODE_SERVE_PID:-}" ]] && kill "$OPENCODE_SERVE_PID" 2>/dev/null' EXIT
  fi
fi

# Fail fast if opencode runner but command not found
if [[ "$RUNNER" == "opencode" ]]; then
  command -v opencode >/dev/null 2>&1 || {
    echo "ERROR: opencode not found in PATH"
    exit 1
  }
fi

# Health check for attach endpoint (TCP port check)
if [[ -n "${OPENCODE_ATTACH:-}" ]]; then
  hostport="${OPENCODE_ATTACH#http://}"
  hostport="${hostport#https://}"
  hostport="${hostport%%/*}"
  h="${hostport%%:*}"
  p="${hostport##*:}"
  if ! (echo >/dev/tcp/"$h"/"$p") >/dev/null 2>&1; then
    echo "WARN: OpenCode attach endpoint not reachable; running without --attach"
    OPENCODE_ATTACH=""
  fi
fi

# Print effective config for debugging
echo "Runner=${RUNNER} Model=${RESOLVED_MODEL:-<default>} Format=${OPENCODE_FORMAT:-<default>} Attach=${OPENCODE_ATTACH:-<none>} Serve=${OPENCODE_SERVE:-false}"

# Change to repository root for all git operations
cd "$ROOT"

# Ensure we're on the worktree branch before starting
echo ""
echo "========================================"
echo "Setting up worktree branch: $TARGET_BRANCH"
echo "========================================"
ensure_worktree_branch "$TARGET_BRANCH"
echo ""

# Launch monitors before starting iterations (unless --no-monitors flag is set)
if [[ "$NO_MONITORS" == "false" ]]; then
  launch_monitors
fi

# Generate RollFlow run ID and log run start marker
ROLLFLOW_RUN_ID="run-$(date +%s)-$$"
export ROLLFLOW_RUN_ID
log_run_start "$ROLLFLOW_RUN_ID"

# Print cache status reminder if enabled
if [[ "$CACHE_SKIP" == "true" ]]; then
  echo ""
  echo "========================================"
  echo "🚀 Cache skip enabled"
  echo "Redundant tool calls will be skipped"
  echo "========================================"
  echo ""
fi

# Set up trap for error event on unexpected exit
trap 'cleanup_and_emit' EXIT

# Determine prompt strategy
if [[ -n "$PROMPT_ARG" ]]; then
  PROMPT_FILE="$(resolve_prompt "$PROMPT_ARG")"
  for ((i = 1; i <= ITERATIONS; i++)); do
    # Initialize log file early for marker emission (Phase 0 observability)
    iter_ts="$(date +%F_%H%M%S)"
    CURRENT_LOG_FILE="$LOGDIR/${iter_ts}_iter${i}_custom.log"
    touch "$CURRENT_LOG_FILE"

    # Log iteration start marker for RollFlow tracking
    log_iter_start "iter-$i" "$ROLLFLOW_RUN_ID"
    CURRENT_ITER=$i

    # Emit ITER_START marker for rollflow_analyze (task X.1.1)
    iter_start_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::ITER_START::: iter=$i run_id=$ROLLFLOW_RUN_ID ts=$iter_start_ts"

    emit_event --event iteration_start --iter "$i"

    # Log cache config for Cortex visibility (task X.4.1)
    cache_config_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::CACHE_CONFIG::: mode=$CACHE_MODE scope=$CACHE_SCOPE exported=1 iter=$i ts=$cache_config_ts"

    # Check for interrupt before starting iteration
    if [[ "$INTERRUPT_RECEIVED" == "true" ]]; then
      echo ""
      echo "Exiting gracefully after iteration $((i - 1))."
      exit 130
    fi

    # Check for protected file failures before starting LLM (requires human intervention)
    if check_protected_file_failures; then
      echo ""
      echo "========================================"
      echo "🛑 HUMAN INTERVENTION REQUIRED"
      echo "========================================"
      echo "Protected file hash mismatches detected: $LAST_VERIFIER_FAILED_RULES"
      echo ""
      echo "These files are protected and cannot be fixed by Ralph."
      echo ""
      # Show which specific files failed
      if [[ -f "$VERIFY_REPORT" ]]; then
        echo "Failed protected files:"
        grep "^\[FAIL\] Protected\." "$VERIFY_REPORT" | while read -r line; do
          if echo "$line" | grep -q "Protected.1"; then
            echo "  - loop.sh"
          elif echo "$line" | grep -q "Protected.2"; then
            echo "  - verifier.sh"
          elif echo "$line" | grep -q "Protected.3"; then
            echo "  - PROMPT.md"
          elif echo "$line" | grep -q "Protected.4"; then
            echo "  - rules/AC.rules"
          fi
        done
        echo ""
      fi
      echo "To regenerate baselines for these files:"
      echo "  cd workers/ralph"
      echo "  sha256sum loop.sh | cut -d' ' -f1 > ../.verify/loop.sha256"
      echo "  sha256sum PROMPT.md | cut -d' ' -f1 > ../.verify/prompt.sha256"
      echo "  sha256sum verifier.sh | cut -d' ' -f1 > ../.verify/verifier.sha256"
      echo "  sha256sum rules/AC.rules | cut -d' ' -f1 > ../.verify/ac.sha256"
      echo ""
      echo "After resolving, re-run the loop to continue."
      exit 1
    fi

    # Capture exit code without triggering set -e
    run_result=0
    emit_event --event phase_start --iter "$i" --phase "custom"
    # Emit PHASE_START marker for rollflow_analyze (task X.1.2)
    phase_start_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::PHASE_START::: iter=$i phase=custom run_id=$ROLLFLOW_RUN_ID ts=$phase_start_ts"
    run_once "$PROMPT_FILE" "custom" "$i" || run_result=$?
    if [[ $run_result -eq 0 ]]; then
      emit_event --event phase_end --iter "$i" --phase "custom" --status ok
      # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
      phase_end_ts="$(($(date +%s%N) / 1000000))"
      emit_marker ":::PHASE_END::: iter=$i phase=custom status=ok run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
    else
      emit_event --event phase_end --iter "$i" --phase "custom" --status fail --code "$run_result"
      # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
      phase_end_ts="$(($(date +%s%N) / 1000000))"
      emit_marker ":::PHASE_END::: iter=$i phase=custom status=fail code=$run_result run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
    fi
    # Check if Ralph signaled completion
    if [[ $run_result -eq 42 ]]; then
      echo ""
      echo "Loop terminated early due to completion."
      break
    fi
    # Check if Ralph requested human intervention
    if [[ $run_result -eq 43 ]]; then
      echo ""
      echo "Loop paused - human intervention required."
      echo "After resolving the issue, re-run the loop to continue."
      exit 1
    fi
    # Check if verifier failed (exit code 44) - give one retry then stop
    if [[ $run_result -eq 44 ]]; then
      CONSECUTIVE_VERIFIER_FAILURES=$((CONSECUTIVE_VERIFIER_FAILURES + 1))
      if [[ $CONSECUTIVE_VERIFIER_FAILURES -ge 2 ]]; then
        echo ""
        echo "========================================"
        echo "🛑 LOOP STOPPED: Consecutive verifier failures"
        echo "========================================"
        echo "Verifier failed $CONSECUTIVE_VERIFIER_FAILURES times in a row."
        echo "Ralph was given a retry iteration but could not fix the issues."
        echo ""
        echo "Review .verify/latest.txt for details."
        echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
        echo ""

        # Post critical verifier failure to Discord (if configured)
        if [[ -n "$DISCORD_WEBHOOK_URL" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
          {
            echo "**⚠️ Verifier Failed - Loop Stopped**"
            echo ""
            echo "Iteration: $i"
            echo "Consecutive failures: $CONSECUTIVE_VERIFIER_FAILURES"
            echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
            echo ""
            echo "**Recent failures:**"
            sed -n '/^\[FAIL\]/p' .verify/latest.txt 2>/dev/null | head -10
          } | "$ROOT/bin/discord-post" 2>/dev/null || true
        fi

        echo "After fixing manually, re-run the loop to continue."
        exit 1
      else
        echo ""
        echo "========================================"
        echo "⚠️  Verifier failed - giving Ralph one retry iteration"
        echo "========================================"
        echo "Next iteration will inject LAST_VERIFIER_RESULT: FAIL"
        echo "Ralph should fix the AC failures before picking new tasks."
        echo ""

        # Post verifier failure alert to Discord (if configured)
        if [[ -n "$DISCORD_WEBHOOK_URL" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
          {
            echo "**⚠️ Verifier Failed - Retry Scheduled**"
            echo ""
            echo "Iteration: $i"
            echo "Status: Giving Ralph one retry iteration"
            echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
            echo ""
            echo "**Top failures:**"
            sed -n '/^\[FAIL\]/p' .verify/latest.txt 2>/dev/null | head -5
          } | "$ROOT/bin/discord-post" 2>/dev/null || true
        fi
      fi
    else
      # Reset counter on successful iteration
      CONSECUTIVE_VERIFIER_FAILURES=0
    fi

    # Run gap radar after iteration completes (task 7.4.1)
    if [[ -x "$ROOT/bin/gap-radar" ]]; then
      echo ""
      echo "Running gap radar analysis..."
      if "$ROOT/bin/gap-radar" --dry-run 2>&1 | tee -a "$LOGDIR/iter${i}_custom.log"; then
        echo "✓ Gap radar analysis complete"
      else
        echo "⚠ Gap radar analysis failed (non-blocking)"
      fi
      echo ""
    fi

    emit_event --event iteration_end --iter "$i" --status ok

    # Emit ITER_END marker for rollflow_analyze (task X.1.1)
    iter_end_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::ITER_END::: iter=$i run_id=$ROLLFLOW_RUN_ID ts=$iter_end_ts"

    # Post iteration summary to Discord (if configured) - task 34.1.3
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
      echo ""
      echo "Posting iteration summary to Discord..."

      # Avoid re-printing the full summary to the interactive terminal (too noisy).
      # Append any discord-post output/errors to a per-iteration completion log.
      completion_log="${LOGDIR}/iter${i}_completion.log"
      if generate_iteration_summary "$i" "$current_phase" "$CURRENT_LOG_FILE" | "$ROOT/bin/discord-post" >>"$completion_log" 2>&1; then
        echo "✓ Discord update posted"
      else
        echo "⚠ Discord post failed (non-blocking)"
      fi
      echo ""
    fi
  done
else
  # Alternating plan/build
  for ((i = 1; i <= ITERATIONS; i++)); do
    # Initialize log file early for marker emission (Phase 0 observability)
    # Note: run_once() will update CURRENT_LOG_FILE with the actual phase-specific log
    iter_ts="$(date +%F_%H%M%S)"
    if [[ $i -eq 1 || $((i % PLAN_EVERY)) -eq 0 ]]; then
      CURRENT_LOG_FILE="$LOGDIR/${iter_ts}_iter${i}_plan.log"
    else
      CURRENT_LOG_FILE="$LOGDIR/${iter_ts}_iter${i}_build.log"
    fi
    touch "$CURRENT_LOG_FILE"

    # Log iteration start marker for RollFlow tracking
    log_iter_start "iter-$i" "$ROLLFLOW_RUN_ID"
    CURRENT_ITER=$i

    # Emit ITER_START marker for rollflow_analyze (task X.1.1)
    iter_start_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::ITER_START::: iter=$i run_id=$ROLLFLOW_RUN_ID ts=$iter_start_ts"

    emit_event --event iteration_start --iter "$i"

    # Log cache config for Cortex visibility (task X.4.1)
    cache_config_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::CACHE_CONFIG::: mode=$CACHE_MODE scope=$CACHE_SCOPE exported=1 iter=$i ts=$cache_config_ts"

    # Check for interrupt before starting iteration
    if [[ "$INTERRUPT_RECEIVED" == "true" ]]; then
      echo ""
      echo "Exiting gracefully after iteration $((i - 1))."
      exit 130
    fi

    # Check for protected file failures before starting LLM (requires human intervention)
    if check_protected_file_failures; then
      echo ""
      echo "========================================"
      echo "🛑 HUMAN INTERVENTION REQUIRED"
      echo "========================================"
      echo "Protected file hash mismatches detected: $LAST_VERIFIER_FAILED_RULES"
      echo ""
      echo "These files are protected and cannot be fixed by Ralph."
      echo ""
      # Show which specific files failed
      if [[ -f "$VERIFY_REPORT" ]]; then
        echo "Failed protected files:"
        grep "^\[FAIL\] Protected\." "$VERIFY_REPORT" | while read -r line; do
          if echo "$line" | grep -q "Protected.1"; then
            echo "  - loop.sh"
          elif echo "$line" | grep -q "Protected.2"; then
            echo "  - verifier.sh"
          elif echo "$line" | grep -q "Protected.3"; then
            echo "  - PROMPT.md"
          elif echo "$line" | grep -q "Protected.4"; then
            echo "  - rules/AC.rules"
          fi
        done
        echo ""
      fi
      echo "To regenerate baselines for these files:"
      echo "  cd workers/ralph"
      echo "  sha256sum loop.sh | cut -d' ' -f1 > ../.verify/loop.sha256"
      echo "  sha256sum PROMPT.md | cut -d' ' -f1 > ../.verify/prompt.sha256"
      echo "  sha256sum verifier.sh | cut -d' ' -f1 > ../.verify/verifier.sha256"
      echo "  sha256sum rules/AC.rules | cut -d' ' -f1 > ../.verify/ac.sha256"
      echo ""
      echo "After resolving, re-run the loop to continue."
      exit 1
    fi

    # Capture exit code without triggering set -e
    run_result=0
    if [[ "$i" -eq 1 ]] || ((PLAN_EVERY > 0 && ((i - 1) % PLAN_EVERY == 0))); then
      # Clean up completed tasks before PLAN phase
      # Ralph already logs to THUNK.md during BUILD, so no --archive needed
      if [[ -f "$RALPH/cleanup_plan.sh" ]]; then
        echo "Cleaning up completed tasks from plan..."
        if (cd "$RALPH" && bash cleanup_plan.sh) 2>&1; then
          echo "✓ Plan cleanup complete"
        else
          echo "⚠ Plan cleanup failed (non-blocking)"
        fi
        echo ""
      fi

      # Commit any accumulated changes from BUILD iterations using scoped staging
      if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "Committing accumulated BUILD changes..."
        if stage_scoped_changes; then
          git commit -m "build: accumulated changes from BUILD iterations" || true
          echo "✓ BUILD changes committed"
        else
          echo "No changes to commit (all files in denylist)"
        fi
        echo ""
      fi

      # Snapshot plan BEFORE sync for drift detection (prevents direct-edit bypass)
      PLAN_SNAPSHOT="$ROOT/.verify/plan_snapshot.md"
      if [[ -f "$ROOT/IMPLEMENTATION_PLAN.md" ]]; then
        cp "$ROOT/IMPLEMENTATION_PLAN.md" "$PLAN_SNAPSHOT"
      fi

      # Sync tasks from Cortex before PLAN mode
      if [[ -f "$RALPH/sync_workers_plan_to_cortex.sh" ]]; then
        echo "Syncing tasks from Cortex..."
        if (cd "$RALPH" && bash sync_workers_plan_to_cortex.sh) 2>&1; then
          echo "✓ Cortex sync complete"
        else
          echo "⚠ Cortex sync failed (non-blocking)"
        fi
        echo ""
      fi

      # Capture remaining markdown lint errors for PLAN phase
      # Auto-fix markdown issues before checking for remaining errors
      MARKDOWN_LINT_ERRORS=""
      if command -v markdownlint &>/dev/null; then
        echo "Running auto-fix for markdown lint errors..."
        if [[ -f "$RALPH/fix-markdown.sh" ]]; then
          bash "$RALPH/fix-markdown.sh" "$ROOT" 2>&1 | tail -10 || true
        fi
        
        echo "Checking for remaining markdown lint errors..."
        lint_output=$(markdownlint "$ROOT" 2>&1 | grep -E "error MD" | head -40) || true
        if [[ -n "$lint_output" ]]; then
          MARKDOWN_LINT_ERRORS="$lint_output"
          echo "Found $(echo "$lint_output" | wc -l) markdown lint errors for PLAN review"
        else
          echo "No markdown lint errors found"
        fi
        unset lint_output
      fi

      emit_event --event phase_start --iter "$i" --phase "plan"
      # Emit PHASE_START marker for rollflow_analyze (task X.1.2)
      phase_start_ts="$(($(date +%s%N) / 1000000))"
      emit_marker ":::PHASE_START::: iter=$i phase=plan run_id=$ROLLFLOW_RUN_ID ts=$phase_start_ts"
      run_once "$PLAN_PROMPT" "plan" "$i" || run_result=$?
      if [[ $run_result -eq 0 ]]; then
        emit_event --event phase_end --iter "$i" --phase "plan" --status ok
        # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
        phase_end_ts="$(($(date +%s%N) / 1000000))"
        emit_marker ":::PHASE_END::: iter=$i phase=plan status=ok run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
      else
        emit_event --event phase_end --iter "$i" --phase "plan" --status fail --code "$run_result"
        # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
        phase_end_ts="$(($(date +%s%N) / 1000000))"
        emit_marker ":::PHASE_END::: iter=$i phase=plan status=fail code=$run_result run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
      fi
    else
      # Auto-fix lint issues before BUILD iteration (only if relevant files changed)
      autofix_git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

      # Check what files have changed (staged + unstaged)
      changed_files="$(
        git diff --name-only HEAD 2>/dev/null
        git diff --name-only --cached 2>/dev/null
      )"
      md_changed=$(echo "$changed_files" | grep -c '\.md$' || true)

      # Run fix-markdown only if .md files changed (saves ~7.5s when no markdown changes)
      if [[ -f "$RALPH/fix-markdown.sh" ]] && [[ "$md_changed" -gt 0 ]]; then
        echo "Running auto-fix for markdown ($md_changed .md file(s) changed)..."
        fix_md_id="$(tool_call_id)"
        fix_md_key="fix-markdown|${autofix_git_sha}"
        run_tool "$fix_md_id" "fix-markdown" "$fix_md_key" "$autofix_git_sha" \
          "(cd \"$ROOT\" && bash \"$RALPH/fix-markdown.sh\" . 2>/dev/null) || true" || true
      elif [[ "$md_changed" -eq 0 ]]; then
        echo "Skipping fix-markdown (no .md files changed)"
      fi

      # Run pre-commit only on staged files (saves ~10s vs --all-files)
      # Note: PLAN-start commit runs full pre-commit via git hooks
      # This is incremental check for BUILD phase changes only
      if command -v pre-commit &>/dev/null; then
        # Stage any changes so pre-commit can check them
        if [[ -n "$changed_files" ]]; then
          if stage_scoped_changes; then
            echo "Running pre-commit on staged files..."
            precommit_id="$(tool_call_id)"
            precommit_key="pre-commit|${autofix_git_sha}"
            run_tool "$precommit_id" "pre-commit" "$precommit_key" "$autofix_git_sha" \
              "(cd \"$ROOT\" && pre-commit run 2>/dev/null) || true" || true
          else
            echo "Skipping pre-commit (nothing staged)"
          fi
        else
          echo "Skipping pre-commit (no changes to check)"
        fi
      fi

      # Run verifier to get current state (Ralph will see WARN/FAIL in context)
      # Skip if no changes - post-iteration verifier will still run after Ralph works
      if [[ -n "$changed_files" ]]; then
        echo "Running verifier to check current state..."
        verifier_pre_id="$(tool_call_id)"
        verifier_pre_key="verifier-pre-build|${autofix_git_sha}"
        run_tool "$verifier_pre_id" "verifier" "$verifier_pre_key" "$autofix_git_sha" \
          "(cd \"$RALPH\" && bash verifier.sh 2>/dev/null) || true" || true
      else
        echo "Skipping pre-build verifier (no changes since last run)"
      fi
      echo ""

      emit_event --event phase_start --iter "$i" --phase "build"
      # Emit PHASE_START marker for rollflow_analyze (task X.1.2)
      phase_start_ts="$(($(date +%s%N) / 1000000))"
      emit_marker ":::PHASE_START::: iter=$i phase=build run_id=$ROLLFLOW_RUN_ID ts=$phase_start_ts"
      run_once "$BUILD_PROMPT" "build" "$i" || run_result=$?
      if [[ $run_result -eq 0 ]]; then
        emit_event --event phase_end --iter "$i" --phase "build" --status ok
        # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
        phase_end_ts="$(($(date +%s%N) / 1000000))"
        emit_marker ":::PHASE_END::: iter=$i phase=build status=ok run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
      else
        emit_event --event phase_end --iter "$i" --phase "build" --status fail --code "$run_result"
        # Emit PHASE_END marker for rollflow_analyze (task X.1.2)
        phase_end_ts="$(($(date +%s%N) / 1000000))"
        emit_marker ":::PHASE_END::: iter=$i phase=build status=fail code=$run_result run_id=$ROLLFLOW_RUN_ID ts=$phase_end_ts"
      fi

      # Sync completions back to Cortex after BUILD iterations
      if false; then # DEPRECATED: no completions sync in this repo/template
        echo "Syncing completions to Cortex..."
        if false; then
          echo "✓ Completions synced to Cortex"
        else
          echo "⚠ Completions sync failed (non-blocking)"
        fi
        echo ""
      fi
    fi

    # Plan drift detection: compare snapshot vs current plan
    PLAN_SNAPSHOT="$ROOT/.verify/plan_snapshot.md"
    if [[ -f "$PLAN_SNAPSHOT" ]] && [[ -f "$ROOT/IMPLEMENTATION_PLAN.md" ]]; then
      # Check for unexpected changes (tasks added directly, not via cortex sync)
      snapshot_tasks=$(grep -c "^- \[ \]" "$PLAN_SNAPSHOT" 2>/dev/null || echo "0")
      current_tasks=$(grep -c "^- \[ \]" "$ROOT/IMPLEMENTATION_PLAN.md" 2>/dev/null || echo "0")
      if [[ "$current_tasks" -gt "$snapshot_tasks" ]]; then
        new_task_count=$((current_tasks - snapshot_tasks))
        echo ""
        echo "⚠️  Plan drift detected: $new_task_count new task(s) added directly to IMPLEMENTATION_PLAN.md"
        echo "    Tasks should be added via cortex/IMPLEMENTATION_PLAN.md and synced."
        echo ""
      fi
      # Clean up snapshot
      rm -f "$PLAN_SNAPSHOT"
    fi

    # Check if Ralph signaled completion (exit code 42)
    if [[ $run_result -eq 42 ]]; then
      echo ""
      echo "Loop terminated early due to completion."
      break
    fi
    # Check if Ralph requested human intervention (exit code 43)
    if [[ $run_result -eq 43 ]]; then
      echo ""
      echo "Loop paused - human intervention required."
      echo "After resolving the issue, re-run the loop to continue."
      exit 1
    fi
    # Check if verifier failed (exit code 44) - give one retry then stop
    if [[ $run_result -eq 44 ]]; then
      CONSECUTIVE_VERIFIER_FAILURES=$((CONSECUTIVE_VERIFIER_FAILURES + 1))
      if [[ $CONSECUTIVE_VERIFIER_FAILURES -ge 2 ]]; then
        echo ""
        echo "========================================"
        echo "🛑 LOOP STOPPED: Consecutive verifier failures"
        echo "========================================"
        echo "Verifier failed $CONSECUTIVE_VERIFIER_FAILURES times in a row."
        echo "Ralph was given a retry iteration but could not fix the issues."
        echo ""
        echo "Review .verify/latest.txt for details."
        echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
        echo ""

        # Post critical verifier failure to Discord (if configured)
        if [[ -n "$DISCORD_WEBHOOK_URL" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
          {
            echo "**⚠️ Verifier Failed - Loop Stopped**"
            echo ""
            echo "Iteration: $i"
            echo "Consecutive failures: $CONSECUTIVE_VERIFIER_FAILURES"
            echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
            echo ""
            echo "**Recent failures:**"
            sed -n '/^\[FAIL\]/p' .verify/latest.txt 2>/dev/null | head -10
          } | "$ROOT/bin/discord-post" 2>/dev/null || true
        fi

        echo "After fixing manually, re-run the loop to continue."
        exit 1
      else
        echo ""
        echo "========================================"
        echo "⚠️  Verifier failed - giving Ralph one retry iteration"
        echo "========================================"
        echo "Next iteration will inject LAST_VERIFIER_RESULT: FAIL"
        echo "Ralph should fix the AC failures before picking new tasks."
        echo ""

        # Post verifier failure alert to Discord (if configured)
        if [[ -n "$DISCORD_WEBHOOK_URL" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
          {
            echo "**⚠️ Verifier Failed - Retry Scheduled**"
            echo ""
            echo "Iteration: $i"
            echo "Status: Giving Ralph one retry iteration"
            echo "Failed rules: $LAST_VERIFIER_FAILED_RULES"
            echo ""
            echo "**Top failures:**"
            sed -n '/^\[FAIL\]/p' .verify/latest.txt 2>/dev/null | head -5
          } | "$ROOT/bin/discord-post" 2>/dev/null || true
        fi
      fi
    else
      # Reset counter on successful iteration
      CONSECUTIVE_VERIFIER_FAILURES=0
    fi

    # Run gap radar after BUILD iteration completes (task 7.4.1)
    # Only run for BUILD iterations (not PLAN)
    if [[ "$i" -ne 1 ]] && ! ((PLAN_EVERY > 0 && ((i - 1) % PLAN_EVERY == 0))); then
      if [[ -x "$ROOT/bin/gap-radar" ]]; then
        echo ""
        echo "Running gap radar analysis..."
        if "$ROOT/bin/gap-radar" --dry-run 2>&1 | tee -a "$LOGDIR/iter${i}_build.log"; then
          echo "✓ Gap radar analysis complete"
        else
          echo "⚠ Gap radar analysis failed (non-blocking)"
        fi
        echo ""
      fi
    fi

    emit_event --event iteration_end --iter "$i" --status ok

    # Emit ITER_END marker for rollflow_analyze (task X.1.1)
    iter_end_ts="$(($(date +%s%N) / 1000000))"
    emit_marker ":::ITER_END::: iter=$i run_id=$ROLLFLOW_RUN_ID ts=$iter_end_ts"

    # Post iteration summary to Discord (if configured) - task 34.1.3
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
      echo ""
      echo "Posting iteration summary to Discord..."

      # Avoid re-printing the full summary to the interactive terminal (too noisy).
      # Append any discord-post output/errors to a per-iteration completion log.
      completion_log="${LOGDIR}/iter${i}_completion.log"
      if generate_iteration_summary "$i" "$current_phase" "$CURRENT_LOG_FILE" | "$ROOT/bin/discord-post" >>"$completion_log" 2>&1; then
        echo "✓ Discord update posted"
      else
        echo "⚠ Discord post failed (non-blocking)"
      fi
      echo ""
    fi
  done
fi

# Ensure no pending changes are left uncommitted when the loop ends
flush_scoped_commit_if_needed "end_of_run"

# Print cache statistics summary at end of run
if [[ "$CACHE_SKIP" == "true" ]]; then
  echo ""
  echo "========================================"
  echo "📊 Cache Statistics"
  echo "========================================"
  echo "Cache hits:   $CACHE_HITS"
  echo "Cache misses: $CACHE_MISSES"
  if [[ $CACHE_HITS -gt 0 ]]; then
    TIME_SAVED_SEC=$((TIME_SAVED_MS / 1000))
    echo "Time saved:   ${TIME_SAVED_SEC}s (${TIME_SAVED_MS}ms)"
  fi
  echo "========================================"
  echo ""
fi

# Post loop completion summary to Discord (task 34.2.2)
if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
  echo ""
  echo "Posting loop completion summary to Discord..."
  {
    echo "**🎉 Ralph Loop Complete**"
    echo ""
    echo "Total iterations: $ITERATIONS"
    echo "Run ID: ${ROLLFLOW_RUN_ID:-unknown}"
    echo ""
    if [[ "$CACHE_SKIP" == "true" ]] && [[ $CACHE_HITS -gt 0 ]]; then
      TIME_SAVED_SEC=$((TIME_SAVED_MS / 1000))
      echo "**Cache Statistics:**"
      echo "- Cache hits: $CACHE_HITS"
      echo "- Cache misses: $CACHE_MISSES"
      echo "- Time saved: ${TIME_SAVED_SEC}s"
      echo ""
    fi
    echo "Check logs for details: \`$LOGDIR\`"
  } | "$ROOT/bin/discord-post" 2>&1 | tee -a "$LOGDIR/discord_final.log" || echo "⚠ Discord post failed (non-blocking)"
  echo ""
fi
