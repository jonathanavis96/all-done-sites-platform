# Thread Search Patterns

> **See also:** [docs/TOOLS.md](../../../docs/TOOLS.md) for CLI tool reference with token-efficient alternatives.

## Quick Reference - CLI Tools (Preferred)

Use these CLI tools for **token-efficient** searches:

| Task | CLI Command | Notes |
|------|-------------|-------|
| Search THUNK + git | `bin/brain-search "keyword"` | Multi-source, fast |
| THUNK by keyword | `bin/brain-search --thunk-only "cache"` | THUNK only |
| Git by keyword | `bin/brain-search --git-only "verifier"` | Git only |
| THUNK statistics | `bin/thunk-parse --stats` | Entry counts, priorities |
| Export to SQLite | `bin/thunk-parse --format sqlite -o thunk.db` | For complex queries |

## Quick Reference - Raw Commands (When CLI Not Sufficient)

| Search Type | Command | Use Case |
|------------|---------|----------|
| THUNK by task ID | `grep "\*\*11.1.1\*\*" workers/ralph/workers/ralph/THUNK.md` | Find completed task by original ID |
| THUNK by keyword | `grep -i "cache" workers/ralph/workers/ralph/THUNK.md` | Find tasks related to topic |
| Recent completions | `tail -20 workers/ralph/workers/ralph/THUNK.md` | View latest completed tasks |
| Git by commit msg | `git log --grep="cache" --oneline` | Find commits by keyword |
| Git by file | `git log --oneline -- path/to/file.sh` | Track file history |
| Git by author | `git log --author="ralph-brain" --oneline` | Filter by author |
| Cache DB tables | `sqlite3 cache.sqlite ".tables"` | List all cache tables |
| Cache by tool | `sqlite3 cache.sqlite "SELECT * FROM tool_calls WHERE tool_name='grep' LIMIT 5;"` | Query tool usage |
| Cache statistics | `sqlite3 cache.sqlite "SELECT tool_name, COUNT(*) FROM tool_calls GROUP BY tool_name;"` | Tool usage stats |

## workers/ralph/THUNK.md Search Patterns

### Find Task by Original ID

When you know the task ID from workers/IMPLEMENTATION_PLAN.md:

```bash
# Find task 11.1.1
grep "\*\*11.1.1\*\*" workers/ralph/workers/ralph/THUNK.md

# Find with context (5 lines before/after)
grep -C 5 "\*\*11.1.1\*\*" workers/ralph/workers/ralph/THUNK.md
```

**Pattern explanation:** Task IDs are wrapped in `**ID**` in the Description column.

### Search by Keyword

Find all tasks related to a topic:

```bash
# Case-insensitive search
grep -i "shellcheck" workers/ralph/workers/ralph/THUNK.md

# Multiple keywords (OR)
grep -E "shellcheck|markdownlint" workers/ralph/workers/ralph/THUNK.md

# Multiple keywords (AND - both must appear)
grep "shellcheck" workers/ralph/workers/ralph/THUNK.md | grep "templates"
```

### Find Tasks in Era

Each era has a section header `## Era N: Description (Date)`:

```bash
# List all eras
grep "^## Era" workers/ralph/workers/ralph/THUNK.md

# Get tasks in Era 4
sed -n '/^## Era 4:/,/^## Era 5:/p' workers/ralph/workers/ralph/THUNK.md

# Get current era (last section)
sed -n '/^## Era [0-9]/h;${g;p;}' workers/ralph/workers/ralph/THUNK.md
```

### Get Next THUNK Number

```bash
# Get last THUNK number
tail -5 workers/ralph/workers/ralph/THUNK.md | grep "^|" | tail -1 | awk -F'|' '{print $2}' | tr -d ' '

# Calculate next number (bash arithmetic)
LAST=$(tail -5 workers/ralph/workers/ralph/THUNK.md | grep "^|" | tail -1 | awk -F'|' '{print $2}' | tr -d ' ')
NEXT=$((LAST + 1))
echo "Next THUNK: $NEXT"
```

### Extract Completion Dates

```bash
# Get all completion dates
grep "^|" workers/ralph/workers/ralph/THUNK.md | awk -F'|' '{print $6}' | sort | uniq -c

# Tasks completed on specific date
grep "2026-01-25" workers/ralph/workers/ralph/THUNK.md

# Tasks completed in date range
grep "2026-01-2[3-5]" workers/ralph/workers/ralph/THUNK.md
```

## Git Search Patterns

### Search Commit Messages

```bash
# Find commits by keyword
git log --grep="cache" --oneline

# Multiple keywords (OR)
git log --grep="cache\|sqlite" --oneline

# Case-insensitive
git log --grep="cache" -i --oneline

# Get full commit details
git log --grep="cache" --oneline | head -1 | cut -d' ' -f1 | xargs git show
```

### Search by File

```bash
# Show commits that modified a file
git log --oneline -- workers/ralph/loop.sh

# Show actual changes
git log -p -- workers/ralph/loop.sh

# Show commits in date range
git log --since="2026-01-20" --until="2026-01-25" --oneline -- workers/ralph/loop.sh
```

### Search by Author

```bash
# Filter by author
git log --author="ralph-brain" --oneline

# Exclude author
git log --author="^(?!ralph-brain)" --perl-regexp --oneline

# Count commits by author
git shortlog -sn
```

### Find When Code Was Added

```bash
# Find when a function was added
git log -S "function_name" --oneline

# Find when a line was added (pickaxe)
git log -S "specific code line" -p

# Find when a regex pattern was added
git log -G "regex_pattern" --oneline
```

## Cache SQLite Queries

### Schema Inspection

```bash
# List all tables
sqlite3 artifacts/rollflow_cache/cache.sqlite ".tables"

# Show table schema
sqlite3 artifacts/rollflow_cache/cache.sqlite ".schema tool_calls"

# Show all schemas
sqlite3 artifacts/rollflow_cache/cache.sqlite ".schema"
```

### Query Tool Calls

```bash
# Get recent tool calls
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, result, timestamp FROM tool_calls ORDER BY timestamp DESC LIMIT 10;"

# Count calls by tool
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, COUNT(*) as call_count FROM tool_calls GROUP BY tool_name ORDER BY call_count DESC;"

# Find failed calls
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, error_msg, timestamp FROM tool_calls WHERE result='FAIL' ORDER BY timestamp DESC;"
```

### Cache Performance Analysis

```bash
# Average duration by tool
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, AVG(duration_ms) as avg_ms FROM tool_calls WHERE duration_ms IS NOT NULL GROUP BY tool_name ORDER BY avg_ms DESC;"

# Cache hit rate
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT 
     SUM(CASE WHEN cache_hit=1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as hit_rate_pct
   FROM tool_calls;"

# Slowest individual calls
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, duration_ms, timestamp FROM tool_calls WHERE duration_ms > 1000 ORDER BY duration_ms DESC LIMIT 10;"
```

### Query by Run ID

```bash
# Get all calls in a run
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, result, timestamp FROM tool_calls WHERE run_id='RUN_2026-01-25_03-15-42' ORDER BY timestamp;"

# Compare two runs
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, COUNT(*) FROM tool_calls WHERE run_id IN ('RUN_A', 'RUN_B') GROUP BY run_id, tool_name;"
```

## Combined Search Strategies

### Trace Task from Plan to Completion

```bash
# 1. Find task in IMPLEMENTATION_PLAN
grep "\*\*11.1.1\*\*" workers/workers/IMPLEMENTATION_PLAN.md

# 2. Find task in THUNK (completion record)
grep "\*\*11.1.1\*\*" workers/ralph/workers/ralph/THUNK.md

# 3. Find related commits
git log --grep="11.1.1" --oneline

# 4. Show actual changes
git log --grep="11.1.1" -p | head -100
```

### Investigate Cache Behavior

```bash
# 1. Check recent cache activity
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT * FROM tool_calls WHERE timestamp > datetime('now', '-1 hour') ORDER BY timestamp DESC LIMIT 20;"

# 2. Find related THUNK entries
grep -i "cache" workers/ralph/workers/ralph/THUNK.md | tail -10

# 3. Find related commits
git log --grep="cache" --since="1 day ago" --oneline

# 4. Check current cache config
cat artifacts/rollflow_cache/config.yml
```

### Debug Failed Task

```bash
# 1. Check if task exists in THUNK
grep "\*\*TASK_ID\*\*" workers/ralph/workers/ralph/THUNK.md || echo "Not completed"

# 2. Check current status in PLAN
grep "\*\*TASK_ID\*\*" workers/workers/IMPLEMENTATION_PLAN.md

# 3. Check verifier output for related failures
grep -i "task_keyword" .verify/latest.txt

# 4. Check git log for related attempts
git log --grep="TASK_ID" --oneline

# 5. Check cache for related tool failures
sqlite3 artifacts/rollflow_cache/cache.sqlite \
  "SELECT tool_name, error_msg FROM tool_calls WHERE result='FAIL' AND timestamp > datetime('now', '-1 day');"
```

## Advanced Patterns

### Extract THUNK Statistics

```bash
# Count tasks by priority
grep "^|" workers/ralph/workers/ralph/THUNK.md | awk -F'|' '{print $4}' | sort | uniq -c

# Count tasks by era
awk '/^## Era/{era=$0; next} /^|/{print era}' workers/ralph/workers/ralph/THUNK.md | sort | uniq -c

# Average tasks per day
TOTAL=$(grep -c "^|" workers/ralph/THUNK.md)
DAYS=$(git log --format="%ad" --date=short | sort -u | wc -l)
echo "scale=2; $TOTAL / $DAYS" | bc
```

### Find Repeated Patterns

```bash
# Find tasks that were repeated (same description)
grep "^|" workers/ralph/workers/ralph/THUNK.md | awk -F'|' '{print $5}' | sort | uniq -d

# Find files modified most often
git log --format= --name-only | sort | uniq -c | sort -rn | head -20

# Find most common commit types
git log --format="%s" | cut -d':' -f1 | sort | uniq -c | sort -rn
```

### Export for Analysis

```bash
# Export THUNK to CSV
grep "^|" workers/ralph/workers/ralph/THUNK.md | sed 's/|/,/g' > thunk_export.csv

# Export git log to JSON
git log --pretty=format:'{"commit":"%H","date":"%ad","message":"%s"},' --date=iso > git_log.json

# Export cache to CSV
sqlite3 -header -csv artifacts/rollflow_cache/cache.sqlite \
  "SELECT * FROM tool_calls;" > cache_export.csv
```

## Common Issues

### THUNK Number Conflicts

**Problem:** Last THUNK number is unclear due to table formatting.

**Solution:** Always use `grep "^|"` to filter only table rows, skip header/separator lines:

```bash
# WRONG - includes header separator
tail -5 workers/ralph/workers/ralph/THUNK.md

# RIGHT - table rows only
tail -5 workers/ralph/workers/ralph/THUNK.md | grep "^|"
```

### Git Grep Case Sensitivity

**Problem:** `git log --grep` is case-sensitive by default.

**Solution:** Always use `-i` for case-insensitive search:

```bash
# May miss "Cache" or "CACHE"
git log --grep="cache"

# Catches all variations
git log --grep="cache" -i
```

### SQLite Empty Results

**Problem:** Query returns no results but cache.sqlite exists.

**Solution:** Check that the database has data and table names match:

```bash
# Verify DB has data
sqlite3 artifacts/rollflow_cache/cache.sqlite "SELECT COUNT(*) FROM tool_calls;"

# Verify table name
sqlite3 artifacts/rollflow_cache/cache.sqlite ".tables"
```

## See Also

- [ralph-patterns.md](ralph-patterns.md) - Ralph loop architecture
- [cache-debugging.md](cache-debugging.md) - Cache troubleshooting
- [skills/playbooks/debug-ralph-stuck.md](../../playbooks/debug-ralph-stuck.md) - Ralph debugging playbook
- [docs/CACHE_DESIGN.md](../../../docs/CACHE_DESIGN.md) - Cache system design

---

**Last Updated:** 2026-01-26  
**Category:** Ralph Loop Operations  
**Related Skills:** ralph-patterns, cache-debugging, debug-ralph-stuck
