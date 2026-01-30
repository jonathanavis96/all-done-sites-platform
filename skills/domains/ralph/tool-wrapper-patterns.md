# Tool Wrapper Patterns

**Domain:** Ralph Loop Architecture  
**Category:** Observability & Caching  
**Created:** 2026-01-26

## Purpose

Document the `run_tool()` wrapper pattern used in Ralph's loop.sh for structured tool execution, cache key generation, and error handling. This pattern provides consistent instrumentation and observability for all tools executed within the Ralph loop.

## Core Concept

The `run_tool()` function wraps arbitrary shell commands to provide:

1. **Structured logging** - Emits TOOL_START and TOOL_END markers
2. **Duration tracking** - Captures execution time in milliseconds
3. **Error handling** - Ensures cleanup on failure or interruption
4. **Exit code capture** - Records success/failure status
5. **Signal handling** - Trap-based cleanup for INT/TERM signals

## Function Signature

```bash
run_tool <tool_id> <tool_name> <cache_key> <git_sha> <tool_command>
```

**Parameters:**

- `tool_id` - Unique identifier for this execution (e.g., `tool_00042`)
- `tool_name` - Human-readable tool name (e.g., `rovodev`, `shellcheck`)
- `cache_key` - Cache lookup key (format: `agent|phase|hash|sha`)
- `git_sha` - Current git commit hash (for traceability)
- `tool_command` - Shell command to execute (will be eval'd)

**Returns:** Exit code from the executed command

## Implementation Pattern

```bash
run_tool() {
  local tool_id="$1"
  local tool_name="$2"
  local tool_key="$3"
  local git_sha="$4"
  local tool_command="$5"

  local start_ms end_ms duration_ms rc

  # Start timing
  start_ms="$(($(date +%s%N) / 1000000))"

  # Log tool start
  log_tool_start "$tool_id" "$tool_name" "$tool_key" "$git_sha"

  # Set up trap to ensure TOOL_END on failure/interrupt
  trap 'end_ms="$(($(date +%s%N) / 1000000))"; duration_ms="$((end_ms - start_ms))"; log_tool_end "$tool_id" "FAIL" "130" "$duration_ms" "interrupted"; exit 130' INT TERM

  # Execute command (with set +e to capture exit code)
  set +e
  eval "$tool_command"
  rc=$?
  set -e

  # Clear trap
  trap - INT TERM

  # Calculate duration
  end_ms="$(($(date +%s%N) / 1000000))"
  duration_ms="$((end_ms - start_ms))"

  # Log tool end - ALWAYS emit this marker
  if [[ $rc -ne 0 ]]; then
    log_tool_end "$tool_id" "FAIL" "$rc" "$duration_ms" "exit_code_$rc"
  else
    log_tool_end "$tool_id" "PASS" "$rc" "$duration_ms"
  fi

  return $rc
}
```

## Cache Key Generation

Ralph uses **content-based cache keys** (not iteration-based) to enable intelligent replay across runs.

### Key Format

```text
{agent_name}|{phase}|{prompt_hash}|{git_sha}
```

**Example:**

```text
rovodev|build|a3f7b2c9d1e5f6a8|1a2b3c4
```

### Generation Logic

```bash
# Example inputs (from loop.sh context)
prompt_with_mode="/tmp/prompt_with_mode.txt"  # Prompt file path
phase="build"  # Current phase (plan or build)

# 1. Hash the prompt content
prompt_hash="$(sha256sum "$prompt_with_mode" 2>/dev/null | cut -d' ' -f1)"

# 2. Get current git SHA
git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

# 3. Get agent name (with fallback)
agent_key="${AGENT_NAME:-${RUNNER}}"

# 4. Build cache key (truncate hash to 16 chars)
tool_key="${agent_key,,}|${phase}|${prompt_hash:0:16}|${git_sha}"
```

### Cacheability Rules

**Non-cacheable tools** (always executed fresh):

- `git push` - Side effects on remote
- `git commit` - Modifies repository state
- `acli rovodev invoke` - External API call (when not wrapped in run_tool)

**Cacheable tools** (can be replayed):

- `shellcheck` - Deterministic linting
- `markdownlint` - Deterministic formatting checks
- `pre-commit run` - Deterministic validation
- `rovodev` LLM calls - Content-addressable via prompt hash

### Cache Lookup Flow

```bash
# Context variables (from loop.sh)
phase="build"
plan_file="${ROOT}/workers/workers/IMPLEMENTATION_PLAN.md"
iter=5
tool_key="rovodev|build|a3f7b2c9|1a2b3c4"
git_sha="1a2b3c4"

# Check if cache should be used
if [[ "$CACHE_SKIP" == "true" || "$CACHE_MODE" == "use" ]]; then
  # BUILD phase safety: block cache if pending tasks exist
  if [[ "$phase" == "build" ]] && grep -q "^- \[ \]" "$plan_file"; then
    emit_marker ":::CACHE_GUARD::: iter=${iter} allowed=0 reason=pending_tasks"
    # Skip cache, proceed with fresh execution
  elif lookup_cache_pass "$tool_key" "$git_sha" "${AGENT_NAME:-$RUNNER}"; then
    # Cache hit - replay previous result
    log_cache_hit "$tool_key" "$RUNNER"
    CACHE_HITS=$((CACHE_HITS + 1))
    return 0
  else
    # Cache miss - execute tool
    log_cache_miss "$tool_key" "$RUNNER"
    CACHE_MISSES=$((CACHE_MISSES + 1))
  fi
fi
```

## Error Handling

### Trap-Based Cleanup

The wrapper uses bash traps to ensure consistent cleanup on interruption:

```bash
# Install trap BEFORE tool execution
trap 'cleanup_and_log_on_signal' INT TERM

# Execute tool
eval "$tool_command"

# Clear trap AFTER tool execution
trap - INT TERM
```

**Why this matters:**

- Ensures TOOL_END marker is ALWAYS emitted (even on Ctrl+C)
- Preserves observability in the event stream
- Prevents orphaned tool executions in logs

### Exit Code Handling

```bash
# Context variables (from run_tool function)
tool_command="shellcheck workers/ralph/*.sh"
tool_id="tool_00042"
duration_ms=234

# Disable errexit to capture exit code
set +e
eval "$tool_command"
rc=$?
set -e

# Log based on exit code
if [[ $rc -ne 0 ]]; then
  log_tool_end "$tool_id" "FAIL" "$rc" "$duration_ms" "exit_code_$rc"
else
  log_tool_end "$tool_id" "PASS" "$rc" "$duration_ms"
fi

# Return original exit code to caller
return $rc
```

**Pattern:** Always capture, always log, always return original code.

## Structured Logging

### Tool Start Marker

```text
:::TOOL_START::: id=tool_00042 tool=shellcheck cache_key=rovodev|build|a3f7b2c9|1a2b ts=1738034567890
```

**Fields:**

- `id` - Unique tool execution ID
- `tool` - Tool name
- `cache_key` - Cache lookup key
- `git_sha` - Current commit (in cache_key)
- `ts` - Unix timestamp (milliseconds)

### Tool End Marker

```text
:::TOOL_END::: id=tool_00042 result=PASS rc=0 duration_ms=234
```

**Fields:**

- `id` - Matches TOOL_START id
- `result` - PASS or FAIL
- `rc` - Exit code (0 = success)
- `duration_ms` - Execution time in milliseconds
- `reason` - (optional) Failure reason (e.g., `exit_code_1`, `interrupted`)

### Cache Markers

**Cache Hit:**

```text
:::CACHE_HIT::: cache_key=rovodev|build|a3f7b2c9|1a2b tool=rovodev ts=1738034567890
```

**Cache Miss:**

```text
:::CACHE_MISS::: cache_key=rovodev|build|a3f7b2c9|1a2b tool=rovodev ts=1738034567890
```

## Usage Examples

### Example 1: Wrap a Shell Command

```bash
tool_id="$(tool_call_id)"  # Generate unique ID
tool_name="shellcheck"
git_sha="$(git rev-parse --short HEAD)"
cache_key="rovodev|build|abc123|${git_sha}"
command="shellcheck -e SC1091 workers/ralph/*.sh"

# Execute with wrapper
run_tool "$tool_id" "$tool_name" "$cache_key" "$git_sha" "$command"
rc=$?

# Check exit code
if [[ $rc -eq 0 ]]; then
  echo "Shellcheck passed"
fi
```

### Example 2: Wrap LLM Call (Existing Pattern in loop.sh)

```bash
# Context variables (from loop.sh)
prompt_with_mode="/tmp/prompt_with_mode.txt"
phase="build"
git_sha="$(git rev-parse --short HEAD)"
output_file="/tmp/output.txt"

# Generate cache key from prompt content
prompt_hash="$(sha256sum "$prompt_with_mode" | cut -d' ' -f1)"
tool_key="${AGENT_NAME,,}|${phase}|${prompt_hash:0:16}|${git_sha}"

# Check cache before execution
if lookup_cache_pass "$tool_key" "$git_sha" "$AGENT_NAME"; then
  log_cache_hit "$tool_key" "$RUNNER"
  return 0  # Skip execution
fi

# Execute with wrapper
tool_id="$(tool_call_id)"
run_tool "$tool_id" "$RUNNER" "$tool_key" "$git_sha" \
  "acli rovodev invoke --prompt-file '$prompt_with_mode' --output-file '$output_file'"
```

### Example 3: Non-Cacheable Tool

```bash
# git commit is never cached (modifies state)
tool_id="$(tool_call_id)"
git_sha="$(git rev-parse --short HEAD)"
cache_key="git|commit|nocache|${git_sha}"

# Execute without cache lookup
run_tool "$tool_id" "git" "$cache_key" "$git_sha" \
  "git commit -m 'fix: resolve issue'"
```

## Testing & Validation

### Verify Trap Behavior

```bash
# Test interruption handling
run_tool "test_001" "sleep" "test|build|sleep|abc" "abc123" "sleep 10" &
sleep 2
kill -INT $!  # Should emit TOOL_END with interrupted reason
```

### Verify Exit Code Propagation

```bash
# Test failure propagation
run_tool "test_002" "false" "test|build|false|abc" "abc123" "false"
echo "Exit code: $?"  # Should be 1
```

### Verify Marker Emission

```bash
# Check that markers are emitted
run_tool "test_003" "echo" "test|build|echo|abc" "abc123" "echo hello" 2>&1 | grep ":::TOOL_"
# Should show TOOL_START and TOOL_END
```

## Common Pitfalls

### ❌ Anti-Pattern: Hardcoding Cacheability

```bash
# BAD: Hardcoded case statement
tool_name="git"
case "$tool_name" in
  git|acli) cacheable=false ;;
  *) cacheable=true ;;
esac
```

**Why bad:** Cacheability rules are scattered, hard to audit.

### ✅ Better: Config-Based Cacheability (Task 13.1.2)

```bash
# GOOD: Read from config file
is_non_cacheable() {
  local tool_name="$1"
  grep -qx "$tool_name" config/non_cacheable_tools.txt
}
```

### ❌ Anti-Pattern: Forgetting Trap Cleanup

```bash
# BAD: Trap not cleared
trap 'cleanup' INT TERM
eval "$command"
# If function returns here, trap persists!
```

**Why bad:** Trap affects subsequent commands, causes double cleanup.

### ✅ Better: Always Clear Traps

```bash
# GOOD: Clear trap after use
trap 'cleanup' INT TERM
eval "$command"
trap - INT TERM  # Clear trap
```

### ❌ Anti-Pattern: Iteration-Based Cache Keys

```bash
# BAD: Cache key includes iteration number
tool_key="rovodev|build|iter_${iter}|${git_sha}"
```

**Why bad:** Cache hits only within same iteration, can't replay across runs.

### ✅ Better: Content-Based Cache Keys

```bash
# GOOD: Cache key based on prompt content
prompt_hash="$(sha256sum "$prompt_file" | cut -d' ' -f1)"
tool_key="rovodev|build|${prompt_hash:0:16}|${git_sha}"
```

## Related Patterns

- **[ralph-patterns.md](ralph-patterns.md)** - Overall loop architecture
- **[cache-debugging.md](cache-debugging.md)** - Cache performance analysis
- **[skills/domains/infrastructure/agent-observability-patterns.md](../infrastructure/agent-observability-patterns.md)** - Marker design patterns
- **[docs/MARKER_SCHEMA.md](../../../docs/MARKER_SCHEMA.md)** - Formal marker specifications

## Future Enhancements

See Phase 13 tasks in workers/workers/IMPLEMENTATION_PLAN.md:

- **Task 13.1.2:** Extract non-cacheable tools to config file
- **Task 13.2.1:** Prototype YAML tool registry schema
- **Phase 13.2:** Full declarative tool registry with permissions model

## References

- Ralph loop implementation: `workers/ralph/loop.sh` lines 919-962 (run_tool function)
- Cache lookup logic: `workers/ralph/loop.sh` lines 1250-1340
- Tool marker logging: `workers/ralph/loop.sh` lines 871-912
