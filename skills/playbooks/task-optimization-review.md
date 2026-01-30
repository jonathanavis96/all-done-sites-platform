# Playbook: Task Optimization Review (Phase 9C)

**Purpose:** Periodic review of Ralph task metrics to identify batching and decomposition opportunities.

**Trigger:** Run after every 5 iterations OR when repeated failures occur on similar tasks.

---

## Quick Reference

| Step | Action | Output |
|------|--------|--------|
| 1 | Gather metrics | Task durations, failure patterns |
| 2 | Identify clusters | Similar tasks by error/dir/filetype |
| 3 | Propose batching | Combine 3+ similar tasks |
| 4 | Propose decomposition | Split tasks >2x median duration |
| 5 | Update plan | Add batched tasks below marker |

---

## Step 1: Gather Metrics

```bash
# Check recent iteration logs for markers
grep ":::ITER_START:::\|:::ITER_END:::" workers/ralph/logs/*.log | tail -20

# Get task completion times from workers/ralph/THUNK.md
tail -20 workers/ralph/workers/ralph/THUNK.md

# Check rollflow_analyze output (if available)
cat artifacts/review_packs/iter_latest.md
```

**Key metrics:**

- Average task duration (from `current_ralph_tasks.sh` ETA display)
- Pass/fail rate by task type
- Tool timing breakdowns (if markers present)

---

## Step 2: Identify Clusters

Look for patterns in pending tasks:

```bash
# Find similar pending tasks
grep "^\- \[ \]" workers/workers/IMPLEMENTATION_PLAN.md
```

**Clustering signals:**

- Same error code (MD040, SC2155, etc.)
- Same directory prefix (`skills/`, `templates/`)
- Same file type (`.md`, `.sh`)
- Same verifier rule failing

---

## Step 3: Propose Batching

**When to batch:** 3+ similar tasks exist

**Batch task template:**

```markdown
- [ ] **X.B1** BATCH: [Description] (combines A.1, A.2, A.3)
  - **Scope:** [Files/directories affected]
  - **Steps:**
    1. [First action]
    2. [Second action]
    3. [Verification]
  - **AC:** [How to verify completion]
  - **Replaces:** A.1, A.2, A.3
```

**Estimated savings:**

- Individual: N tasks × 300s = X min
- Batched: 1 task × 450s = Y min
- Savings: X - Y min

---

## Step 4: Propose Decomposition

**When to decompose:** Task takes >2x median duration OR causes repeated failures

**Decomposition template:**

```markdown
Original: X.Y "Large task"
Proposed:
- [ ] **X.Ya** Scan/identify (read-only, fast)
- [ ] **X.Yb** Apply changes (edit set)
- [ ] **X.Yc** Verify (tests/linters)
```

**Rationale:** Reduces failure cost, improves rollback, enables cache reuse.

---

## Step 5: Update Plan

**CRITICAL: Add new tasks BELOW the marker line**

```markdown
<!-- Cortex adds new Task Contracts below this line -->

## Phase 9C.2: Batched Tasks

- [ ] **9C.2.B1** BATCH: ...
```

**Never add tasks above the marker** - this breaks the plan-copy step (workers → cortex).

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Add tasks above marker line | Always add below `<!-- Cortex adds -->` |
| Implement tasks as Cortex | Write task contracts, let Ralph execute |
| Batch unrelated tasks | Only batch tasks with clear similarity |
| Decompose simple tasks | Only decompose if >2x median or failing |

---

## Verification

After proposing optimizations:

1. [ ] Tasks are below the marker line
2. [ ] Each batch lists what it replaces
3. [ ] Estimated savings documented
4. [ ] AC is verifiable

---

## Related Skills

- [Token Efficiency](../domains/code-quality/token-efficiency.md)
- [Testing Patterns](../domains/code-quality/testing-patterns.md)
- [Ralph Patterns](../domains/ralph/ralph-patterns.md)

---

## Appendix: Cortex Rule Reminder

**Cortex plans, Ralph executes.**

Cortex responsibilities:

- Analyze metrics
- Identify optimization opportunities
- Write task contracts with clear AC
- Add tasks below the marker line

Ralph responsibilities:

- Execute tasks
- Commit changes
- Report completion to workers/ralph/THUNK.md
