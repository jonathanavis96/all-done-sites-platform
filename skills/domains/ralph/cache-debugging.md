# Cache Debugging Patterns

Patterns for debugging cache-related issues in the Ralph loop system.

## Cache Logging Flow

The verifier cache system logs hits/misses through multiple layers:

```text
workers/shared/common.sh     → log_cache_hit() / log_cache_miss()
        ↓ (stderr)
workers/ralph/verifier.sh    → calls cache functions during AC checks
        ↓ (stderr)
workers/ralph/loop.sh        → run_verifier() captures/summarizes stderr
        ↓ (stdout)
Terminal output              → "📊 Cache: N hits, M misses"
```

## Key Files

| File | Role |
|------|------|
| `workers/shared/common.sh` | Cache functions (`log_cache_hit`, `log_cache_miss`) - output to stderr |
| `workers/ralph/verifier.sh` | Calls cache lookup, logs hits/misses per AC check |
| `workers/ralph/loop.sh` | `run_verifier()` function - captures stderr, shows summary |

## Common Issues

### Issue: Cache metadata flooding terminal

**Symptom:** 40+ lines of `[CACHE_HIT]` / `[CACHE_MISS]` in terminal output.

**Cause:** Verifier stderr not being captured/summarized.

**Fix:** In `run_verifier()`, capture stderr to temp file and count hits/misses:

```bash
local cache_stderr
cache_stderr=$(mktemp)

if "$VERIFY_SCRIPT" 2>"$cache_stderr"; then
  # Count and summarize
  local cache_hits cache_misses
  cache_hits=$(grep -c '\[CACHE_HIT\]' "$cache_stderr" 2>/dev/null || echo "0")
  cache_misses=$(grep -c '\[CACHE_MISS\]' "$cache_stderr" 2>/dev/null || echo "0")
  if [[ $((cache_hits + cache_misses)) -gt 0 ]]; then
    echo "📊 Cache: $cache_hits hits, $cache_misses misses"
  fi
  rm -f "$cache_stderr"
  # ... rest of success handling
fi
```

### Issue: Cache output appearing in latest.txt

**Symptom:** `[CACHE_HIT]` entries in `.verify/latest.txt` instead of `[PASS]`/`[FAIL]`.

**Cause:** Stderr being redirected to the report file somewhere.

**Debug steps:**

1. Check where verifier writes to `$REPORT_FILE` (should be stdout redirect `>>`)
2. Check where cache logging writes (should be stderr `>&2`)
3. Check how verifier is called (should NOT merge stderr into stdout)

**Expected behavior:**

- Cache metadata → stderr → discarded or summarized
- PASS/FAIL results → `$REPORT_FILE` (`latest.txt`)

## Debugging Commands

```bash
# Run verifier and see all stderr (cache metadata)
cd ~/code/brain/workers/ralph && bash verifier.sh

# Run verifier with stderr hidden (normal loop behavior)
cd ~/code/brain/workers/ralph && bash verifier.sh 2>/dev/null

# Check what's in latest.txt
cat ~/code/brain/workers/ralph/.verify/latest.txt

# Search for cache logging in codebase
grep -rn "CACHE_HIT\|CACHE_MISS" workers/
```

## Cross-Run Aggregation Queries

The `artifacts/rollflow_cache/cache.sqlite` database tracks tool performance across Ralph loop runs. Use these queries to analyze patterns and identify bottlenecks.

### Schema Overview

**pass_cache table:**

- `cache_key` (TEXT PRIMARY KEY) - Unique identifier for cached result
- `tool_name` (TEXT) - Name of tool (e.g., 'verifier', 'pre-commit', 'fix-markdown')
- `last_pass_ts` (TEXT) - ISO timestamp of last successful run
- `last_duration_ms` (INTEGER) - Duration in milliseconds
- `meta_json` (TEXT) - Additional metadata (JSON format)

**fail_log table:**

- `id` (INTEGER PRIMARY KEY) - Auto-incrementing failure ID
- `cache_key` (TEXT) - Key that failed
- `tool_name` (TEXT) - Tool that failed
- `ts` (TEXT) - Timestamp of failure
- `exit_code` (INTEGER) - Exit code from failed tool
- `err_hash` (TEXT) - Hash of error output (for deduplication)
- `err_excerpt` (TEXT) - First 200 chars of error message

### Query 1: Slowest Tools by Average Duration

Identify which tools consume the most time on average:

```sql
SELECT 
  tool_name,
  COUNT(*) as run_count,
  AVG(last_duration_ms) as avg_duration_ms,
  MAX(last_duration_ms) as max_duration_ms,
  MIN(last_duration_ms) as min_duration_ms
FROM pass_cache
WHERE last_duration_ms IS NOT NULL
GROUP BY tool_name
ORDER BY avg_duration_ms DESC;
```

**Use case:** Prioritize optimization efforts on slowest tools.

### Query 2: Tool Failure Rates

Calculate failure rates by aggregating pass and fail counts separately (avoids join multiplication):

```sql
WITH
  tool_passes AS (
    SELECT tool_name, COUNT(*) AS passes
    FROM pass_cache
    GROUP BY tool_name
  ),
  tool_failures AS (
    SELECT tool_name, COUNT(*) AS failures
    FROM fail_log
    GROUP BY tool_name
  ),
  tool_stats AS (
    -- Emulate a FULL OUTER JOIN across SQLite by UNION'ing the tool_name set
    SELECT tool_name FROM tool_passes
    UNION
    SELECT tool_name FROM tool_failures
  )
SELECT
  ts.tool_name,
  COALESCE(tp.passes, 0) AS passes,
  COALESCE(tf.failures, 0) AS failures,
  ROUND(
    100.0 * COALESCE(tf.failures, 0) /
    (COALESCE(tp.passes, 0) + COALESCE(tf.failures, 0)),
    2
  ) AS failure_rate_pct
FROM tool_stats ts
LEFT JOIN tool_passes tp ON ts.tool_name = tp.tool_name
LEFT JOIN tool_failures tf ON ts.tool_name = tf.tool_name
WHERE (COALESCE(tp.passes, 0) + COALESCE(tf.failures, 0)) > 0
ORDER BY failure_rate_pct DESC;
```

**Use case:** Identify unreliable tools that need hardening.

### Query 3: Recent Tool Performance Trends

Show performance over time (requires timestamp parsing):

```sql
SELECT 
  tool_name,
  DATE(last_pass_ts) as run_date,
  COUNT(*) as runs,
  AVG(last_duration_ms) as avg_duration_ms,
  MAX(last_duration_ms) as max_duration_ms
FROM pass_cache
WHERE last_pass_ts IS NOT NULL
GROUP BY tool_name, DATE(last_pass_ts)
ORDER BY run_date DESC, avg_duration_ms DESC
LIMIT 20;
```

**Use case:** Detect performance degradation over time.

### Query 4: Cache Hit Distribution

Analyze which tools have the most cached results:

```sql
SELECT 
  tool_name,
  COUNT(*) as cached_results,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM pass_cache), 2) as pct_of_total
FROM pass_cache
GROUP BY tool_name
ORDER BY cached_results DESC;
```

**Use case:** Understand cache utilization patterns.

### Query 5: Most Common Failure Patterns

Group failures by error signature to find recurring issues:

```sql
SELECT 
  tool_name,
  err_hash,
  COUNT(*) as occurrence_count,
  MIN(err_excerpt) as sample_error,
  MIN(ts) as first_seen,
  MAX(ts) as last_seen
FROM fail_log
WHERE err_hash IS NOT NULL
GROUP BY tool_name, err_hash
ORDER BY occurrence_count DESC
LIMIT 10;
```

**Use case:** Identify systemic issues vs. one-off failures.

### Query 6: Cache Freshness Check

Find stale cache entries (not accessed recently):

```sql
SELECT 
  tool_name,
  cache_key,
  last_pass_ts,
  last_duration_ms,
  ROUND(
    (JULIANDAY('now') - JULIANDAY(last_pass_ts)) * 24,
    2
  ) as hours_since_access
FROM pass_cache
WHERE last_pass_ts IS NOT NULL
ORDER BY hours_since_access DESC
LIMIT 20;
```

**Use case:** Identify candidates for cache eviction/cleanup.

### Query 7: Performance Percentiles

Calculate p50, p90, p95, p99 durations for each tool:

```sql
WITH ranked AS (
  SELECT 
    tool_name,
    last_duration_ms,
    PERCENT_RANK() OVER (PARTITION BY tool_name ORDER BY last_duration_ms) as percentile
  FROM pass_cache
  WHERE last_duration_ms IS NOT NULL
)
SELECT 
  tool_name,
  MIN(CASE WHEN percentile >= 0.50 THEN last_duration_ms END) as p50_ms,
  MIN(CASE WHEN percentile >= 0.90 THEN last_duration_ms END) as p90_ms,
  MIN(CASE WHEN percentile >= 0.95 THEN last_duration_ms END) as p95_ms,
  MIN(CASE WHEN percentile >= 0.99 THEN last_duration_ms END) as p99_ms
FROM ranked
GROUP BY tool_name
ORDER BY p95_ms DESC;
```

**Use case:** Understand performance variability and outliers.

### Running Queries

**Python approach (recommended):**

```python
import sqlite3

conn = sqlite3.connect('artifacts/rollflow_cache/cache.sqlite')
cursor = conn.cursor()

cursor.execute("""
  SELECT tool_name, AVG(last_duration_ms) as avg_ms
  FROM pass_cache
  WHERE last_duration_ms IS NOT NULL
  GROUP BY tool_name
  ORDER BY avg_ms DESC
""")

for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]:.0f}ms")
```

**Shell approach (if sqlite3 installed):**

```bash
sqlite3 artifacts/rollflow_cache/cache.sqlite <<EOF
SELECT tool_name, AVG(last_duration_ms) as avg_ms
FROM pass_cache
WHERE last_duration_ms IS NOT NULL
GROUP BY tool_name
ORDER BY avg_ms DESC;
EOF
```

## Related Files

- `docs/CACHE_DESIGN.md` - Full cache architecture
- `skills/domains/ralph/ralph-patterns.md` - General Ralph patterns

## See Also

- **[Caching Patterns](../backend/caching-patterns.md)** - General caching strategies (TTL, LRU, write-through/write-behind)
- **[Ralph Patterns](ralph-patterns.md)** - Ralph loop architecture and troubleshooting
- **[Token Efficiency](../code-quality/token-efficiency.md)** - Performance optimization including cache usage
- **[docs/CACHE_DESIGN.md](../../../docs/CACHE_DESIGN.md)** - Full cache design document for Ralph system
