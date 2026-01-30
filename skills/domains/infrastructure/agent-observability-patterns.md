# Agent Observability Patterns

**Purpose:** Patterns for instrumenting autonomous agents with observability markers, events, and metrics for debugging and optimization.

**When to Use:** Agent loops (Ralph, Cerebras), autonomous workflows, production agent systems

**Related Skills:**

- [Observability Patterns](observability-patterns.md) - General infrastructure observability
- [Ralph Patterns](../ralph/ralph-patterns.md) - Ralph loop architecture and troubleshooting
- [State Management Patterns](state-management-patterns.md) - State tracking across iterations

---

## Quick Reference

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Structured Markers** | Parseable event emission | `:::MARKER:::` with `key=value` pairs |
| **Iteration Tracking** | Trace work across loop cycles | `:::ITER_START:::` / `:::ITER_END:::` with `run_id` |
| **Phase Boundaries** | Segment work into logical phases | `:::PHASE_START:::` / `:::PHASE_END:::` with status |
| **Tool Instrumentation** | Track external command execution | `:::TOOL_START:::` / `:::TOOL_END:::` with duration |
| **Cache Observability** | Debug cache hit/miss patterns | `:::CACHE_HIT:::` / `:::CACHE_MISS:::` / `:::CACHE_GUARD:::` |
| **Event Store** | Queryable event history | JSONL append-only log + SQLite for queries |
| **Real-Time Monitoring** | Live iteration progress | Tail markers, parse on-the-fly |

---

## Core Patterns

### 1. Structured Marker Format

**Problem:** Agent logs are unstructured, hard to parse programmatically.

**Solution:** Emit grep-friendly markers with structured fields.

**Format:**

```text
:::MARKER_NAME::: key1=value1 key2=value2 ts=2026-01-25T12:30:00Z
```

**Key Properties:**

- **Grep-friendly:** `grep ':::TOOL_START:::' loop.log`
- **Field extraction:** `awk -F'[ =]' '/:::TOOL_START:::/ {print $4}'`
- **Timestamped:** Include `ts` field for chronological ordering
- **Unique IDs:** Use `run_id`, `iter`, `id` for correlation

**Example (Shell):**

```bash
# Function to emit markers
emit_marker() {
  local marker_name="$1"
  shift
  echo ":::${marker_name}::: $* ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

# Usage
emit_marker "ITER_START" "iter=1" "run_id=abc123"
# Output: :::ITER_START::: iter=1 run_id=abc123 ts=2026-01-25T12:30:00Z
```

**Example (Python):**

```python
import datetime

def emit_marker(name: str, **fields):
    """Emit structured marker to stdout."""
    ts = datetime.datetime.utcnow().isoformat() + "Z"
    fields_str = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f":::{name}::: {fields_str} ts={ts}", flush=True)

# Usage
emit_marker("PHASE_START", phase="plan", iter=1, run_id="abc123")
# Output: :::PHASE_START::: phase=plan iter=1 run_id=abc123 ts=2026-01-25T12:30:00Z
```

**Anti-pattern:** Avoid free-form text in markers. Use `reason="value with spaces"` for multi-word values.

---

### 2. Iteration Lifecycle Tracking

**Problem:** Agent loops run multiple iterations - need to correlate events within iterations and across runs.

**Solution:** Emit start/end markers with `run_id` (stable across iterations) and `iter` (increments per iteration).

**Markers:**

```bash
:::ITER_START::: iter=1 run_id=abc123 ts=...
:::ITER_END::: iter=1 run_id=abc123 ts=...
```

**Implementation (Shell):**

```bash
# Generate run_id once at loop start
RUN_ID=$(date +%s%N | sha256sum | cut -c1-8)

for iter in {1..10}; do
  emit_marker "ITER_START" "iter=$iter" "run_id=$RUN_ID"
  
  # Do work...
  
  emit_marker "ITER_END" "iter=$iter" "run_id=$RUN_ID"
done
```

**Query Pattern (awk):**

```bash
# Extract iteration durations
awk '
  /:::ITER_START:::/ { start[$4] = $NF }  # key: iter=N, value: ts
  /:::ITER_END:::/ {
    iter = $4
    if (start[iter]) {
      duration = $NF - start[iter]
      print iter " took " duration "s"
    }
  }
' loop.log
```

**Benefits:**

- **Cross-iteration analysis:** Compare iteration N vs N+1 performance
- **Crash recovery:** Identify incomplete iterations (START without END)
- **Multi-run correlation:** Same `run_id` links related iterations

---

### 3. Phase Segmentation

**Problem:** Iterations have logical phases (PLAN, BUILD, VERIFY) - need to attribute time/work to each phase.

**Solution:** Emit phase boundaries with `status` on end marker.

**Markers:**

```bash
:::PHASE_START::: iter=1 phase=plan run_id=abc123 ts=...
:::PHASE_END::: iter=1 phase=plan status=success run_id=abc123 ts=...
```

**Status Values:**

- `success` - Phase completed without errors
- `failure` - Phase failed (include `code=N` for exit code)
- `skipped` - Phase not run (cache hit, conditions not met)

**Implementation (Shell):**

```bash
run_phase() {
  local phase="$1"
  emit_marker "PHASE_START" "iter=$ITER" "phase=$phase" "run_id=$RUN_ID"
  
  if "$phase"_logic; then
    emit_marker "PHASE_END" "iter=$ITER" "phase=$phase" "status=success" "run_id=$RUN_ID"
  else
    local exit_code=$?
    emit_marker "PHASE_END" "iter=$ITER" "phase=$phase" "status=failure" "code=$exit_code" "run_id=$RUN_ID"
    return $exit_code
  fi
}

# Usage
run_phase "plan"
run_phase "build"
run_phase "verify"
```

**Query Pattern (grep + awk):**

```bash
# Show failed phases
grep ':::PHASE_END:::' loop.log | grep 'status=failure' | awk '{print $4, $6}'
```

---

### 4. Tool Call Instrumentation

**Problem:** Need to track which external tools are called, how long they take, and whether they succeed.

**Solution:** Wrap tool calls with START/END markers, include unique `id` for correlation.

**Markers:**

```bash
:::TOOL_START::: id=T001 tool=shellcheck cache_key=abc123 git_sha=def456 ts=...
:::TOOL_END::: id=T001 result=PASS exit=0 duration_ms=1234 ts=...
```

**Implementation (Shell):**

```bash
# Wrapper for instrumented tool execution
run_tool() {
  local tool_name="$1"
  shift
  local args=("$@")
  
  local tool_id="T$(date +%s%N | cut -c1-8)"
  local cache_key=$(echo "$tool_name ${args[*]}" | sha256sum | cut -c1-8)
  local git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  
  emit_marker "TOOL_START" "id=$tool_id" "tool=$tool_name" "cache_key=$cache_key" "git_sha=$git_sha"
  
  local start_ms=$(($(date +%s%N) / 1000000))
  "$tool_name" "${args[@]}"
  local exit_code=$?
  local end_ms=$(($(date +%s%N) / 1000000))
  local duration_ms=$((end_ms - start_ms))
  
  local result="PASS"
  [[ $exit_code -ne 0 ]] && result="FAIL"
  
  emit_marker "TOOL_END" "id=$tool_id" "result=$result" "exit=$exit_code" "duration_ms=$duration_ms"
  
  return $exit_code
}

# Usage
run_tool shellcheck -x file.sh
run_tool markdownlint README.md
```

**Benefits:**

- **Performance profiling:** Identify slow tools
- **Failure correlation:** Map exit codes to tool invocations
- **Cache analysis:** Track which tools benefit from caching

---

### 5. Cache Observability

**Problem:** Caching is opaque - hard to debug why cache hits/misses occur.

**Solution:** Emit cache decision markers at every lookup.

**Markers:**

```bash
:::CACHE_CONFIG::: mode=adaptive scope=verify,read exported=true iter=1 ts=...
:::CACHE_GUARD::: iter=1 allowed=true reason="verify phase allows read scope" phase=verify ts=...
:::CACHE_HIT::: cache_key=abc123 tool=shellcheck ts=...
:::CACHE_MISS::: cache_key=def456 tool=markdownlint ts=...
```

**Implementation (Shell):**

```bash
cache_lookup() {
  local cache_key="$1"
  local tool_name="$2"
  
  # Check if cache entry exists
  if sqlite3 cache.db "SELECT 1 FROM pass_cache WHERE cache_key='$cache_key'"; then
    emit_marker "CACHE_HIT" "cache_key=$cache_key" "tool=$tool_name"
    return 0
  else
    emit_marker "CACHE_MISS" "cache_key=$cache_key" "tool=$tool_name"
    return 1
  fi
}

# Usage in tool wrapper
if cache_lookup "$cache_key" "$tool_name"; then
  echo "Using cached result"
  return 0
else
  echo "Running tool fresh"
  run_tool "$tool_name" "$@"
fi
```

**Query Patterns:**

```bash
# Cache hit rate
total=$(grep -c ':::CACHE_' loop.log)
hits=$(grep -c ':::CACHE_HIT:::' loop.log)
echo "Cache hit rate: $((hits * 100 / total))%"

# Tools with most misses
grep ':::CACHE_MISS:::' loop.log | awk '{print $4}' | sort | uniq -c | sort -rn
```

---

### 6. Event Store (JSONL + SQLite)

**Problem:** Markers in logs are good for grep, but not for complex queries.

**Solution:** Dual storage - JSONL for append-only writes, SQLite for queries.

**JSONL Schema:**

```json
{"ts":"2026-01-25T12:30:00Z","event":"iteration_start","iter":1,"run_id":"abc123","workspace":"/home/user/brain","pid":12345}
{"ts":"2026-01-25T12:30:15Z","event":"phase_start","iter":1,"phase":"plan","run_id":"abc123"}
{"ts":"2026-01-25T12:31:00Z","event":"tool_call","id":"T001","tool":"shellcheck","duration_ms":1234,"exit":0}
{"ts":"2026-01-25T12:31:30Z","event":"phase_end","iter":1,"phase":"plan","status":"success","run_id":"abc123"}
{"ts":"2026-01-25T12:31:45Z","event":"iteration_end","iter":1,"run_id":"abc123"}
```

**SQLite Schema:**

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  event TEXT NOT NULL,
  iter INTEGER,
  run_id TEXT,
  phase TEXT,
  tool TEXT,
  status TEXT,
  duration_ms INTEGER,
  exit_code INTEGER,
  data JSON  -- For additional fields
);

CREATE INDEX idx_events_run_id ON events(run_id);
CREATE INDEX idx_events_iter ON events(iter);
CREATE INDEX idx_events_event ON events(event);
```

**Ingestion (Python):**

```python
import json
import sqlite3

def ingest_jsonl_to_sqlite(jsonl_path: str, db_path: str):
    """Parse JSONL events and insert into SQLite."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    with open(jsonl_path) as f:
        for line in f:
            event = json.loads(line)
            cursor.execute("""
                INSERT INTO events (ts, event, iter, run_id, phase, tool, status, duration_ms, exit_code, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.get("ts"),
                event.get("event"),
                event.get("iter"),
                event.get("run_id"),
                event.get("phase"),
                event.get("tool"),
                event.get("status"),
                event.get("duration_ms"),
                event.get("exit"),
                json.dumps(event)  # Store full event as JSON
            ))
    
    conn.commit()
    conn.close()
```

**Query Examples:**

```sql
-- Average iteration duration by run
SELECT run_id, AVG(duration_ms) as avg_duration
FROM (
  SELECT run_id, 
    (strftime('%s', e2.ts) - strftime('%s', e1.ts)) * 1000 as duration_ms
  FROM events e1
  JOIN events e2 ON e1.run_id = e2.run_id AND e1.iter = e2.iter
  WHERE e1.event = 'iteration_start' AND e2.event = 'iteration_end'
)
GROUP BY run_id;

-- Slowest tools
SELECT tool, AVG(duration_ms) as avg_ms, COUNT(*) as calls
FROM events
WHERE event = 'tool_call'
GROUP BY tool
ORDER BY avg_ms DESC
LIMIT 10;

-- Failed phases
SELECT iter, phase, status, exit_code
FROM events
WHERE event = 'phase_end' AND status = 'failure'
ORDER BY ts DESC;
```

---

### 7. Real-Time Monitoring

**Problem:** Want to watch iteration progress live, not parse logs after completion.

**Solution:** Tail event file and parse markers on-the-fly.

**Implementation (Shell + Python):**

```bash
#!/bin/bash
# tail_events.sh - Real-time event monitor

EVENT_FILE="state/events.jsonl"

tail -f "$EVENT_FILE" | while IFS= read -r line; do
  event=$(echo "$line" | jq -r '.event')
  
  case "$event" in
    iteration_start)
      iter=$(echo "$line" | jq -r '.iter')
      echo "[$(date +%H:%M:%S)] 🔄 Iteration $iter started"
      ;;
    phase_start)
      phase=$(echo "$line" | jq -r '.phase')
      echo "[$(date +%H:%M:%S)] 📋 Phase: $phase"
      ;;
    tool_call)
      tool=$(echo "$line" | jq -r '.tool')
      duration=$(echo "$line" | jq -r '.duration_ms')
      echo "[$(date +%H:%M:%S)] 🔧 $tool completed in ${duration}ms"
      ;;
    phase_end)
      phase=$(echo "$line" | jq -r '.phase')
      status=$(echo "$line" | jq -r '.status')
      echo "[$(date +%H:%M:%S)] ✅ Phase $phase: $status"
      ;;
    iteration_end)
      echo "[$(date +%H:%M:%S)] 🏁 Iteration complete"
      echo "---"
      ;;
  esac
done
```

**Usage:**

```bash
# Terminal 1: Run agent loop
bash loop.sh

# Terminal 2: Monitor events
bash tail_events.sh
```

**Output Example:**

```text
[12:30:00] 🔄 Iteration 1 started
[12:30:01] 📋 Phase: plan
[12:30:15] 🔧 shellcheck completed in 1234ms
[12:30:30] 📋 Phase: build
[12:30:45] 🔧 markdownlint completed in 567ms
[12:31:00] ✅ Phase build: success
[12:31:01] 🏁 Iteration complete
---
```

---

## Known Limitations

### RovoDev Tool Blindness

**Problem:** RovoDev's native tools (`bash`, `grep`, `open_files`, `find_and_replace_code`, `expand_code_chunks`) execute in the agent runtime, NOT through shell wrappers. They don't emit `:::TOOL_START:::` markers.

**Impact:** Tool observability only captures ~20-30% of actual tool calls (shell-wrapped ones like `shellcheck`, `markdownlint`).

**Workaround (Partial):**

1. **Infer from logs:** Parse RovoDev's structured output for tool invocations
2. **Manual instrumentation:** Add explicit markers in wrapper scripts
3. **Agent-level hooks:** If RovoDev exposes pre/post-tool hooks, integrate

**Example (Heuristic Parsing):**

```python
# Parse RovoDev's <invoke name="bash"> blocks
import re

def parse_rovodev_tools(log_text: str):
    """Extract tool calls from RovoDev XML tags."""
    pattern = r'<invoke name="(\w+)">'
    matches = re.findall(pattern, log_text)
    return matches

# Usage
log_content = '<invoke name="bash">...</invoke><invoke name="grep">...</invoke>'
tools = parse_rovodev_tools(log_content)
print(f"Detected tools: {tools}")
# Output: ['bash', 'grep']
```

**Status:** Tracked as Gap G1 in `cortex/docs/research/agent-observability-research.md`

---

## Brain Implementation Reference

Brain repository uses these patterns in `workers/ralph/loop.sh`:

| Marker | Purpose | Line Reference |
|--------|---------|----------------|
| `:::ITER_START:::` | Iteration begins | ~line 850 |
| `:::ITER_END:::` | Iteration completes | ~line 950 |
| `:::PHASE_START:::` | Phase begins | ~line 870 |
| `:::PHASE_END:::` | Phase completes | ~line 920 |
| `:::TOOL_START:::` | Shell tool starts | ~line 600 |
| `:::TOOL_END:::` | Shell tool completes | ~line 650 |
| `:::CACHE_HIT:::` | Cache lookup succeeded | `workers/shared/cache.sh` |
| `:::CACHE_MISS:::` | Cache lookup failed | `workers/shared/cache.sh` |
| `:::CACHE_CONFIG:::` | Cache mode for iteration | ~line 800 |
| `:::CACHE_GUARD:::` | Cache scope filtering | ~line 810 |

**Parser:** `tools/rollflow_analyze/src/rollflow_analyze/parsers/marker_parser.py`

**Event Schema:** `docs/events.md`

**CLI Tool:** `bin/brain-event` (manual event emission)

---

## Common Pitfalls

### 1. Missing Timestamps

**Problem:** Markers without `ts` field can't be ordered chronologically.

**Solution:** Always include `ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)` in every marker.

### 2. Non-Unique IDs

**Problem:** Using sequential IDs (1, 2, 3) causes collisions across runs.

**Solution:** Use timestamp + hash for globally unique IDs:

```bash
unique_id() {
  echo "$(date +%s%N | sha256sum | cut -c1-8)"
}
```

### 3. Marker Spam

**Problem:** Emitting markers for every trivial operation clutters logs.

**Solution:** Only instrument high-value operations (phases, expensive tools, cache decisions).

### 4. Ignoring Exit Codes

**Problem:** Not capturing tool exit codes loses failure information.

**Solution:** Always include `exit=$?` in `:::TOOL_END:::` markers.

### 5. Parsing Drift

**Problem:** Changing marker format breaks existing parsers.

**Solution:** Version marker schemas (`:::TOOL_START_V2:::`), maintain backward compatibility.

---

## Testing Strategies

### Marker Validation

```bash
# Smoke test: Check all markers have required fields
validate_markers() {
  local log_file="$1"
  
  # Check ITER_START has iter, run_id, ts
  if ! grep ':::ITER_START:::' "$log_file" | grep -q 'iter=.*run_id=.*ts='; then
    echo "ERROR: ITER_START missing required fields"
    return 1
  fi
  
  # Check TOOL_END has id, result, exit, duration_ms, ts
  if ! grep ':::TOOL_END:::' "$log_file" | grep -q 'id=.*result=.*exit=.*duration_ms=.*ts='; then
    echo "ERROR: TOOL_END missing required fields"
    return 1
  fi
  
  echo "All markers valid"
}

# Usage
validate_markers "logs/iter1.log"
```

### Event Integrity

```python
# Test JSONL schema compliance
import json

def validate_events(jsonl_path: str):
    """Check all events have required fields."""
    required_fields = {"ts", "event"}
    
    with open(jsonl_path) as f:
        for i, line in enumerate(f, 1):
            event = json.loads(line)
            missing = required_fields - set(event.keys())
            if missing:
                print(f"Line {i}: Missing fields {missing}")
                return False
    
    print("All events valid")
    return True

# Usage
validate_events("state/events.jsonl")
```

### Cache Hit Rate

```bash
# Test cache effectiveness
test_cache_hit_rate() {
  local log_file="$1"
  local min_hit_rate="${2:-50}"  # Default 50%
  
  local total=$(grep -c ':::CACHE_' "$log_file")
  local hits=$(grep -c ':::CACHE_HIT:::' "$log_file")
  
  if [[ $total -eq 0 ]]; then
    echo "SKIP: No cache lookups found"
    return 0
  fi
  
  local hit_rate=$((hits * 100 / total))
  
  if [[ $hit_rate -lt $min_hit_rate ]]; then
    echo "FAIL: Cache hit rate ${hit_rate}% below threshold ${min_hit_rate}%"
    return 1
  fi
  
  echo "PASS: Cache hit rate ${hit_rate}%"
}

# Usage
test_cache_hit_rate "logs/iter1.log" 60
```

---

## See Also

- **[Observability Patterns](observability-patterns.md)** - General infrastructure observability (metrics, traces, logs)
- **[Ralph Patterns](../ralph/ralph-patterns.md)** - Ralph loop architecture, modes, troubleshooting
- **[State Management Patterns](state-management-patterns.md)** - State tracking across agent iterations
- **[Error Handling Patterns](../backend/error-handling-patterns.md)** - Structured error reporting
- **[Cache Debugging](../ralph/cache-debugging.md)** - Cache-specific troubleshooting patterns

**External Resources:**

- [OpenTelemetry](https://opentelemetry.io/) - Standard for traces/spans
- [JSONL Format](https://jsonlines.org/) - Newline-delimited JSON
- [SQLite Full-Text Search](https://www.sqlite.org/fts5.html) - FTS5 for event search

---

**Last Updated:** 2026-01-26 by Ralph (THUNK #832)
