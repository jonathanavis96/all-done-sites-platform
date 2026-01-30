# Ralph Loop Architecture

## Why This Exists

Ralph is the automated self-improvement loop for brain repositories and projects. Agents need to understand how Ralph works internally (subagents, tool visibility, execution flow, monitoring systems) to effectively write prompts, debug issues, and implement similar task automation systems.

## When to Use It

- Writing or modifying Ralph prompts (`PROMPT.md`)
- Debugging Ralph execution issues
- Understanding why certain operations are fast (parallel) vs slow (sequential)
- Deciding between interactive RovoDev sessions vs Ralph automation
- Implementing file-watching monitors or task tracking systems
- Troubleshooting display artifacts or parser issues in bash scripts

## Quick Reference

### Ralph Files

| File | Purpose | When Updated |
|------|---------|--------------|
| `PROMPT.md` | Instructions for each iteration | Rarely (core behavior) |
| `workers/IMPLEMENTATION_PLAN.md` | Task list with priorities | Every BUILD (mark progress) |
| `workers/ralph/THUNK.md` | Completed work log | On task completion |
| `THOUGHTS.md` | Goals, context, decisions | On major decisions |
| `NEURONS.md` | Codebase map | When structure changes |
| `AGENTS.md` | Operational commands | When features change |
| `rules/AC.rules` | Acceptance criteria | When requirements change |

### Execution Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **PLAN** | New session, major changes | Analyze → Update plan → Commit + Push |
| **BUILD** | Task implementation | Implement → Mark `[?]` → Commit local |
| **VERIFY** | After BUILD | Run `verifier.sh` → Pass = `[x]` |

### Task Status Markers

| Marker | Meaning | Next Action |
|--------|---------|-------------|
| `[ ]` | Not started | Pick and implement |
| `[?]` | Implemented, needs verification | Run verifier |
| `[x]` | Verified complete | Move to THUNK |
| `[-]` | Blocked/skipped | Document reason |

### Monitor Hotkeys

| Script | Key | Action |
|--------|-----|--------|
| `current_ralph_tasks.sh` | `q` | Quit |
| | `h` | Toggle hide completed |
| | `r` | Refresh |
| | `f` | Filter |
| `thunk_ralph_tasks.sh` | `q` | Quit |
| | `e` | Create new era |
| | `r` | Refresh |

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Variable lost after pipe | Subshell scoping | Use `< <(cmd)` instead of `cmd \|` |
| Display artifacts | Missing full redraw | Clear screen before each update |
| Stale file content | File not re-read | Use `inotifywait` or poll with checksum |
| Task not detected | Parser boundary issue | Check `##` vs `###` header detection |

## High-Level Architecture

### Core Components

```text
loop.sh (Bash orchestrator)
    ↓
acli rovodev run --yolo -- "$promptContent"
    ↓
RovoDev Agent (executes prompt instructions)
    ↓
Spawns subagents as instructed by prompt
    ↓
Updates workers/IMPLEMENTATION_PLAN.md + workers/ralph/THUNK.md
    ↓
Monitors detect changes and update displays
```text

### Subagent Usage

Ralph prompts instruct RovoDev to use:

- **Reading/Searching**: Up to 100 parallel subagents
- **Writing/Modifying**: Exactly 1 agent (sequential for safety)

**Key insight**: Subagent orchestration happens inside RovoDev backend, not in loop.sh. The bash script just calls acli and logs output.

### Visibility

**Without `--verbose`**: Only see RovoDev's final text responses

**With `--verbose`**: See tool calls and results:

```text
⬢ Called expand_folder: 
    • folder_path: "ralph"
[tool results]
```text

**Never visible**: Internal subagent spawning/pooling (happens in backend)

### Prompt Instructions

Prompts explicitly tell RovoDev to use subagents:

```markdown
### Context Gathering (up to 100 parallel subagents)
- Study `skills/SUMMARY.md` for overview
```text

These instructions guide RovoDev's internal behavior. Loop.sh doesn't enforce this - it just passes the prompt through.

### Commit Strategy

**BUILD mode**: Local commits only (no push)
**PLAN mode**: Commits local changes + pushes all accumulated commits

```text
Iteration 1 (PLAN):  Analyze → Update plan → COMMIT + PUSH all → Stop
Iteration 2 (BUILD): Implement task → Mark [?] → COMMIT local → Stop
Iteration 3 (BUILD): Implement task → Mark [?] → COMMIT local → Stop
Iteration 4 (BUILD): Implement task → Mark [?] → COMMIT local → Stop
Iteration 5 (PLAN):  Re-analyze → Update plan → COMMIT + PUSH all → Stop
```text

Benefits:

- All commits are local and fast during BUILD
- PLAN phase has full context for meaningful commit messages
- Related changes grouped together in git history
- Push happens only after validation and planning

## Monitor Architecture Deep Dive

Ralph includes two real-time monitoring scripts that demonstrate advanced bash patterns for file watching, parsing, and display management.

### Current Ralph Tasks Monitor (`current_ralph_tasks.sh`)

**Purpose**: Display pending tasks from workers/IMPLEMENTATION_PLAN.md in real-time

**Key Features**:

- Extracts tasks from priority sections (HIGH/MEDIUM/LOW)
- Marks first unchecked task with `▶` symbol (current task)
- Watches file for changes (sub-second updates)
- Interactive hotkeys: `q` (quit), `h` (hide completed), `r` (archive), `c` (clear)
- Always full-screen redraw (no rendering artifacts)

**Parser State Machine**:

```bash
# State tracking
current_section=""      # HIGH/MEDIUM/LOW PRIORITY
in_task_section=false  # Inside a priority section?
task_counter=0         # Sequential task numbering per section
indent_level=0         # Nesting depth (0, 1, 2, ...)

# Transition rules:
# 1. Line matches "HIGH PRIORITY" → in_task_section=true, reset counter
# 2. Line matches "MEDIUM PRIORITY" → in_task_section=true, reset counter  
# 3. Line matches "LOW PRIORITY" → in_task_section=true, reset counter
# 4. Line matches "## " (major section) → in_task_section=false
# 5. Line matches "- [ ]" or "- [x]" → extract task, determine indent
```text

**Parsing Algorithm**:

1. Scan file line-by-line
2. Track current priority section (state machine)
3. Match task pattern: `^([[:space:]]*)-[[:space:]]\[([ x])\][[:space:]]*(.*)$`
4. Calculate indent level: `${#leading_spaces} / 2`
5. Generate short title from task description (action verb extraction)
6. Cache completed tasks (hash-based) for performance
7. Output structured data: `status|section|label|title|indent|status|full_desc`

**Display Strategy**:

- **Always full redraw**: Simplicity over incremental updates
- **No cursor positioning**: Clear screen + rebuild from scratch
- **Benefits**: No artifacts, no state tracking complexity, reliable
- **Cost**: Slightly more CPU, but negligible for human-scale task lists

**File Watching Pattern**:

```bash
# Get initial modification time
LAST_MODIFIED=$(stat -c %Y "$PLAN_FILE" 2>/dev/null || stat -f %m "$PLAN_FILE" 2>/dev/null)

# Monitor loop
while true; do
    CURRENT_MODIFIED=$(get_file_mtime)
    if [[ "$CURRENT_MODIFIED" != "$LAST_MODIFIED" ]]; then
        LAST_MODIFIED="$CURRENT_MODIFIED"
        display_tasks  # Trigger full redraw
    fi
    sleep 0.5  # Poll interval
done
```text

**Non-blocking Input**:

```bash
# Enable non-blocking stdin
stty -echo -icanon time 0 min 0

# Read with timeout
if read -t 0.1 -n 1 key 2>/dev/null; then
    case "$key" in
        q|Q) cleanup ;;
        h|H) toggle_hide_completed ;;
    esac
fi
```text

### THUNK Monitor (`thunk_ralph_tasks.sh`)

**Purpose**: Display completed tasks appended to workers/ralph/THUNK.md in real-time

**Key Features**:

- Watches workers/ralph/THUNK.md for Ralph-appended completions
- Safety net: Auto-syncs from workers/IMPLEMENTATION_PLAN.md if Ralph forgets
- Append-only display optimization (tail parsing)
- Interactive hotkeys: `r` (refresh), `f` (force sync), `e` (new era), `q` (quit)
- Sequential THUNK numbering across project lifecycle

**Parser State Machine**:

```bash
# State tracking
current_era=""         # Current era name
in_era=false          # Inside an era section?
total_count=0         # Total completed tasks
LAST_LINE_COUNT=0     # Track file growth

# Transition rules:
# 1. Line matches "## Era: (.+)" → current_era=name, in_era=true
# 2. Line matches table row "| N | ... |" → extract and display
# 3. File grows → parse only new lines (incremental)
# 4. File shrinks → full refresh needed
```text

**Incremental Update Strategy**:

```bash
# Check line count to determine update strategy
CURRENT_LINE_COUNT=$(wc -l < "$THUNK_FILE")

if [[ "$CURRENT_LINE_COUNT" -lt "$LAST_LINE_COUNT" ]]; then
    # Line count decreased - full refresh (deletions)
    display_thunks
elif [[ "$CURRENT_LINE_COUNT" -gt "$LAST_LINE_COUNT" ]]; then
    # Line count increased - tail-only parsing (append-only)
    parse_new_thunk_entries "$LAST_LINE_COUNT"
else
    # Same line count - content modified (edits)
    display_thunks
fi
```text

**Tail-Only Parsing** (Optimization):

```bash
# Only parse new lines since last read
parse_new_thunk_entries() {
    local start_line="$1"
    local line_num=0
    
    while IFS= read -r line; do
        ((line_num++))
        if [[ $line_num -le $start_line ]]; then
            continue  # Skip already-displayed lines
        fi
        # Parse and append new entries using cursor positioning
        if [[ "$line" =~ table_pattern ]]; then
            tput cup $append_row 0  # Position cursor
            echo "  ✓ THUNK #$num — $title"
            ((append_row++))
        fi
    done < "$THUNK_FILE"
    
    # Update footer in-place (no full redraw)
    update_footer_count
}
```text

**Auto-Sync Pattern** (Safety Net):

```bash
# Scan workers/IMPLEMENTATION_PLAN.md for new [x] tasks
scan_for_new_completions() {
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[x\][[:space:]]*(.*)$ ]]; then
            local task_desc="${BASH_REMATCH[1]}"
            
            # Check if already in workers/ralph/THUNK.md
            if task_exists_in_thunk "$task_desc"; then
                continue
            fi
            
            # Append to workers/ralph/THUNK.md
            append_to_thunk_table "$task_desc"
        fi
    done < "$PLAN_FILE"
}
```text

## Advanced Bash Patterns

### Terminal Control with tput

**Cursor Positioning**:

```bash
tput cup $row $col     # Move cursor to (row, col)
tput clear             # Clear entire screen
tput el                # Clear to end of line
```text

**Color & Formatting**:

```bash
echo -e "\033[32m✓\033[0m"      # Green checkmark
echo -e "\033[1mBold\033[0m"    # Bold text
echo -e "\033[33m▶\033[0m"      # Yellow arrow
```text

### Associative Arrays for Caching

```bash
declare -A COMPLETED_CACHE

# Generate cache key (hash full raw line to prevent collisions)
cache_key=$(echo -n "$line" | md5sum | cut -d' ' -f1)

# Store in cache
COMPLETED_CACHE[$cache_key]="$output_line"

# Retrieve from cache
if [[ -n "${COMPLETED_CACHE[$cache_key]}" ]]; then
    echo "${COMPLETED_CACHE[$cache_key]}"
fi
```text

**Benefits**:

- O(1) lookup vs O(n) scanning
- Avoids repeated title generation for completed tasks
- Significant performance gain for large task lists

### Regex Patterns for Task Parsing

**Flexible Priority Matching**:

```bash
local line_upper="${line^^}"  # Convert to uppercase
if [[ "$line_upper" =~ HIGH[[:space:]]*PRIORITY ]] && [[ ! "$line_upper" =~ ARCHIVE ]]; then
    current_section="High Priority"
fi
```text

**Task Line Extraction**:

```bash
# Captures: leading spaces, status (space or x), description
if [[ "$line" =~ ^([[:space:]]*)-[[:space:]]\[([ x])\][[:space:]]*(.*)$ ]]; then
    local leading_spaces="${BASH_REMATCH[1]}"
    local status="${BASH_REMATCH[2]}"
    local task_desc="${BASH_REMATCH[3]}"
fi
```text

**Title Generation** (Action Verb Extraction):

```bash
# Extract verb + object: "Update foo.sh" → "Update foo"
if [[ "$desc" =~ ^(Create|Update|Fix|Test|Implement)([[:space:]]*:[[:space:]]*|[[:space:]]+)(.+)$ ]]; then
    local verb="${BASH_REMATCH[1]}"
    local rest="${BASH_REMATCH[3]}"
    # Truncate at period, arrow, or 50 chars
    echo "$verb $rest" | cut -c1-50
fi
```text

## Operational Patterns

### PLAN-Mode Governance Rules

**Purpose**: Prevent uncontrolled scope expansion while allowing Ralph to identify and propose improvements.

**The Problem**: Ralph needs to identify knowledge gaps and improvements, but adding new phases directly could expand scope without review.

**The Pattern**:

```bash
# Ralph identifies a gap during PLAN mode
# Example: Brain is referenced by web projects, but frontend skills are minimal
```

**Implementation**:

1. **Propose, don't commit** - Describe new phases in console output only
2. **Explain rationale** - What gap does it fill? Why is it needed?
3. **Wait for approval** - Human or Cortex must approve before implementation
4. **Exception** - `## Phase 0-Warn: Verifier Warnings` can be added immediately (urgent fixes)

**Example Proposal Format**:

```text
PROPOSED NEW PHASES:
- Phase 8: Frontend Skills Expansion
  - Rationale: Brain is referenced by web projects, needs React/Vue patterns
  - Tasks: 8.1.1 Create frontend README, 8.1.2 Add component patterns...

Awaiting approval before adding to workers/IMPLEMENTATION_PLAN.md.
```

**Why This Exists**:

- New phases = significant scope expansion
- Cortex owns strategic planning; Ralph executes
- Proposing allows review before commitment
- Prevents Ralph from creating unbounded work

**When to Propose New Phases**:

- Discovering systematic gaps across multiple domains
- Identifying recurring issues that need dedicated focus
- Finding missing infrastructure or tooling categories

**When NOT to Propose**:

- Single tasks within existing phases (just add the task)
- Verifier warnings (use Phase 0-Warn section)
- Minor documentation updates (existing phases cover it)

### THUNK Tracking Patterns

**Purpose**: Efficient access to task completion log without reading large files.

**The Problem**: `workers/ralph/THUNK.md` grows continuously. Reading the full file wastes tokens and time.

**Access Rules**:

| Operation | Command | Why |
|-----------|---------|-----|
| **Lookups** | `grep "keyword" workers/ralph/THUNK.md \| head -3` | Fast, targeted search |
| **Get next ID** | `tail -10 workers/ralph/THUNK.md \| grep "^\|" \| tail -1` | Only read last 10 lines |
| **Append entry** | Get ID once, then append | Single tail operation per task |
| **History search** | `bin/brain-search "keyword"` | Structured multi-source search |
| **Statistics** | `bin/thunk-parse --stats` | Dedicated tool, not raw parsing |

**Never Do**:

```bash
# ❌ BAD: Opens entire file
open_files(["workers/ralph/THUNK.md"])

# ❌ BAD: Multiple reads for same task
tail -10 workers/ralph/THUNK.md  # Get ID
# ... do work ...
tail -10 workers/ralph/THUNK.md  # Get ID again (wasteful)
```

**Correct Pattern**:

```bash
# ✅ GOOD: Get ID once, cache it, append once
NEXT_ID=$(tail -10 workers/ralph/THUNK.md | grep "^|" | tail -1 | awk -F'|' '{print $2+1}')

# ... implement task ...

# Append to THUNK (single operation)
echo "| $NEXT_ID | 35.1.3 | skills | Enhanced Ralph operational patterns..." >> workers/ralph/THUNK.md
```

**THUNK Entry Format**:

```text
| ID | Task | Scope | Description (max ~200 chars, truncate with ...) |
```

**Key Insights**:

- THUNK is append-only, so tail operations are safe
- Full file reads are wasteful after ~100 entries
- Dedicated tools (`brain-search`, `thunk-parse`) handle complex queries
- Only read THUNK when actually appending a completion

### Discovery-Defer Pattern

**Purpose**: Prevent "docs(plan): add new task" spam commits during BUILD mode.

**The Problem**: While fixing issues, Ralph often discovers additional related problems. Adding them to the plan immediately creates extra commits and interrupts BUILD focus.

**The Pattern**:

**During BUILD Mode**:

```bash
# Ralph fixes shellcheck issue SC2086 in loop.sh
# Ralph notices SC2034 (unused variable) in same file
# Ralph notices SC2162 (missing -r) in monitor.sh
```

**❌ Wrong Approach**:

```bash
# Fix SC2086
git add loop.sh
git commit -m "fix(ralph): resolve SC2086 in loop.sh"

# Update plan with new discoveries
find_and_replace_code("workers/IMPLEMENTATION_PLAN.md", ...)
git add workers/IMPLEMENTATION_PLAN.md
git commit -m "docs(plan): add SC2034 and SC2162 tasks"

# Continue to next task...
```

**✅ Correct Approach**:

```bash
# Fix SC2086 only
git add loop.sh workers/IMPLEMENTATION_PLAN.md workers/ralph/THUNK.md

# Note discoveries in commit body
git commit -m "fix(ralph): resolve SC2086 in loop.sh

Note: Also discovered SC2034 in loop.sh and SC2162 in monitor.sh
These will be added to plan during next PLAN phase."

# STOP - Do not add new tasks to plan yet
```

**During PLAN Mode**:

- Review commit messages for noted discoveries
- Add new tasks to appropriate phases in `workers/IMPLEMENTATION_PLAN.md`
- Group related discoveries into logical task structure

**Benefits**:

- Cleaner commit history (fewer noise commits)
- BUILD mode stays focused on assigned task
- PLAN mode has context to organize discoveries properly
- Reduces plan file churn

**When to Use**:

- During BUILD mode when discovering new issues
- When one fix reveals related problems
- When refactoring exposes additional opportunities

**When NOT to Use**:

- During PLAN mode (add tasks directly)
- For verifier warnings (add to Phase 0-Warn immediately)
- For critical blockers (document and stop)

## Troubleshooting Patterns

### Display Artifacts

**Symptom**: Ghost text, overlapping lines, corrupted display

**Root Cause**: Incremental updates with cursor positioning without proper clearing

**Solution**: Always full redraw (clear + rebuild)

```bash
# ❌ BAD: Incremental update without clearing
tput cup 10 0
echo "New line"

# ✅ GOOD: Full redraw
clear
rebuild_entire_display
```text

**When incremental is acceptable**: Append-only logs where previous content never changes (THUNK monitor tail-only parsing)

### File Watching Delays

**Symptom**: Monitor updates slowly (2-5 seconds after file change)

**Root Cause**: Long sleep interval or stat() caching

**Solution**: Short sleep + force stat refresh

```bash
# ✅ GOOD: Sub-second updates
sleep 0.5  # 500ms polling

# Portable stat (handles Linux + macOS)
stat -c %Y "$FILE" 2>/dev/null || stat -f %m "$FILE" 2>/dev/null
```text

### Parser Skipping Tasks

**Symptom**: Tasks visible in file but not in monitor

**Root Cause**: State machine doesn't account for subsection headers

**Solution**: Only exit task section on major headers

```bash
# ❌ BAD: Exit on any header
if [[ "$line" =~ ^###[[:space:]]+ ]]; then
    in_task_section=false
fi

# ✅ GOOD: Exit only on major sections (##), allow subsections (###, ####)
if [[ "$line" =~ ^##[[:space:]]+ ]] && [[ ! "$line_upper" =~ PRIORITY ]]; then
    in_task_section=false
fi
```text

### Terminal State Corruption

**Symptom**: Terminal behaves oddly after script exit (no echo, weird input)

**Root Cause**: Non-blocking stdin setup not cleaned up

**Solution**: Trap cleanup with stty restore

```bash
cleanup() {
    if [[ -t 0 ]]; then
        stty sane  # Restore terminal to sane state
    fi
    exit 0
}

trap cleanup EXIT INT TERM

# Enable non-blocking
stty -echo -icanon time 0 min 0
```text

## Best Practices

### Prompt Design

1. **Reading phase**: Request parallel subagents for speed
2. **Writing phase**: Specify single agent for safety
3. **Atomic tasks**: One task per BUILD iteration (no batching)
4. **Stop conditions**: Explicit `:::COMPLETE:::` signal

### Script Development

1. **File watching**: Use stat() mtime + short polling (0.5s)
2. **Display updates**: Prefer full redraw unless append-only
3. **State machines**: Explicit state tracking + clear transition rules
4. **Terminal control**: Always cleanup with trap + stty restore
5. **Performance**: Cache expensive operations (title generation, regex matching)

### Debugging

1. **Verbose mode**: Add `--verbose` flag to loop.sh to see tool activity
2. **Logs**: Check `ralph/logs/` for iteration transcripts
3. **Manual testing**: Run monitors standalone with test files
4. **State inspection**: Add debug output for state machine transitions

## Common Misconceptions

❌ "Ralph spawns subagents"
✅ "Ralph passes prompts to RovoDev, which spawns subagents as instructed"

❌ "Monitors must use incremental updates for performance"
✅ "Full redraw is often simpler and more reliable for human-scale data"

❌ "File watching requires inotify or fswatch"
✅ "Stat polling with 0.5s interval is sufficient and portable"

❌ "Cursor positioning eliminates all flicker"
✅ "Cursor positioning can cause artifacts; full clear is often cleaner"

## References

- **PROMPT.md**: Ralph's core instructions (BUILD vs PLAN modes)
- **AGENTS.md**: Validation commands and operational guide
- **current_ralph_tasks.sh**: Reference implementation for task parsing
- **thunk_ralph_tasks.sh**: Reference implementation for tail-only parsing
- **docs/HISTORY.md**: Monitor bug fixes and architecture evolution

## See Also

- **[Bootstrap Patterns](bootstrap-patterns.md)** - New project setup and template usage
- **[Cache Debugging](cache-debugging.md)** - Debug cache issues in Ralph loop
- **[Change Propagation](change-propagation.md)** - Ensure changes propagate to templates
- **[Code Hygiene](../code-quality/code-hygiene.md)** - Definition of Done checklist
- **[Shell Patterns](../languages/shell/README.md)** - Shell scripting best practices
