# Playbook: Decompose Large Tasks

## Goal

Break down oversized tasks into smaller, atomic subtasks that can be completed in single BUILD iterations. This improves iteration success rate, enables better caching, reduces rollback cost, and provides clearer progress tracking.

## When to Use

Use this playbook when:

- Task duration exceeds 2x median (warning shown in `current_ralph_tasks.sh` footer)
- Task repeatedly fails or requires multiple attempts
- Task involves multiple unrelated concerns (e.g., "fix all issues in module")
- Task requires extensive investigation before implementation
- Task combines read-only analysis with destructive changes

## Prerequisites

Before decomposing:

- **Tools:** Access to `current_ralph_tasks.sh` for ETA tracking
- **Files:** `workers/workers/IMPLEMENTATION_PLAN.md`, `workers/ralph/workers/ralph/THUNK.md`
- **Knowledge:** Understanding of the original task's acceptance criteria
- **Context:** Recent iteration logs showing task durations

## Steps

### Step 1: Analyze the Task

**Action:** Examine why the task is oversized.

- Read the task description and acceptance criteria
- Check `workers/ralph/workers/ralph/THUNK.md` for similar past tasks and their durations
- Identify distinct phases within the task (scan → modify → verify)
- Look for multiple concerns bundled together

**Decision Point:** If task combines investigation + implementation, split into read-only scan task and write task.

**Example patterns that indicate decomposition needed:**

```markdown
# ❌ Too large - multiple concerns
- [ ] **X.1** Implement caching system with Redis, add tests, update docs

# ✅ Decomposed properly
- [ ] **X.1a** [S] Research Redis client libraries and document options
- [ ] **X.1b** [M] Implement cache layer with Redis client
- [ ] **X.1c** [S] Add unit tests for cache layer
- [ ] **X.1d** [S] Update documentation with caching examples
```

### Step 2: Identify Natural Boundaries

**Action:** Find logical breakpoints where work can be safely paused.

Common decomposition patterns:

| Pattern | When to Use | Example Split |
| ------- | ----------- | ------------- |
| **Scan → Modify** | Task requires investigation first | X.1a: Scan for violations → X.1b: Apply fixes |
| **Phase-based** | Multi-stage workflow | X.1a: Setup → X.1b: Implementation → X.1c: Cleanup |
| **File-based** | Changes to multiple independent files | X.1a: Fix module A → X.1b: Fix module B |
| **Concern-based** | Multiple unrelated requirements | X.1a: Feature logic → X.1b: Tests → X.1c: Docs |
| **Verification-based** | Complex validation needed | X.1a: Make changes → X.1b: Run test suite → X.1c: Update baselines |

**Checkpoint:** ✓ You should now have 2-4 logical subtasks identified

### Step 3: Define Subtask Contracts

**Action:** Write clear task contracts for each subtask.

Each subtask must have:

- **Clear scope:** What files/functions will be modified
- **Concrete AC:** How to verify completion
- **Dependencies:** What must be done first (if any)
- **Complexity tag:** [S/M/L] based on estimated duration

**Template:**

```markdown
- [ ] **X.Ya** [S/M/L] [Action verb] [specific scope]
  - **Goal:** Single-sentence objective
  - **Scope:** List of files/directories affected
  - **AC:** Verifiable completion criteria
  - **Depends:** X.Yb (if applicable)
```

**Example:**

```markdown
Original large task:
- [ ] **3.5** Fix all markdown issues in skills/

Decomposed:
- [ ] **3.5a** [S] Scan skills/ for MD040 violations and list affected files
  - **Goal:** Identify all code blocks missing language tags
  - **Scope:** skills/**/*.md (read-only)
  - **AC:** List of files + line numbers in THUNK entry
  
- [ ] **3.5b** [M] Add language tags to code blocks in skills/
  - **Goal:** Fix all MD040 violations found in 3.5a
  - **Scope:** Files listed in 3.5a (write)
  - **AC:** markdownlint reports 0 MD040 errors
  - **Depends:** 3.5a
```

### Step 4: Validate Decomposition Quality

**Action:** Check that decomposition follows best practices.

Quality checklist:

- [ ] **Each subtask is atomic:** Can be completed in one BUILD iteration (~5-15 minutes)
- [ ] **Clear boundaries:** Each subtask has distinct input/output
- [ ] **Testable AC:** Completion can be objectively verified
- [ ] **Dependency order:** Subtasks can be done sequentially without backtracking
- [ ] **No duplication:** Subtasks don't overlap in scope

**Anti-patterns to avoid:**

| ❌ Anti-pattern | ✅ Better Approach |
| --------------- | ------------------ |
| Too fine-grained (10+ subtasks) | Group related micro-tasks |
| Subtasks have circular dependencies | Reorder to linear flow |
| Vague AC ("improve module") | Specific AC ("function passes test X") |
| Mixed read-write in subtask | Separate scan from modify |

### Step 5: Update Implementation Plan

**Action:** Replace the large task with decomposed subtasks.

**Format:**

```markdown
## Phase X: [Phase Name]

- [x] **X.Y** [Original large task] - DECOMPOSED (see X.Ya-X.Yc)
  - **Decomposition rationale:** [Why this was split]
  
- [ ] **X.Ya** [S] [First subtask]
  - [Details...]
  
- [ ] **X.Yb** [M] [Second subtask]
  - [Details...]
  
- [ ] **X.Yc** [S] [Third subtask]
  - [Details...]
```

**Important:** Mark original task `[x]` with note "DECOMPOSED" so Ralph skips it and works on subtasks instead.

### Step 6: Update workers/ralph/THUNK.md

**Action:** Log the decomposition decision.

```markdown
| THUNK # | Original # | Priority | Description | Completed |
|---------|------------|----------|-------------|-----------|
| NNN | X.Y | HIGH | **X.Y** [Original task description] - DECOMPOSED into X.Ya-X.Yc ([rationale]) | YYYY-MM-DD |
```

### Step 7: Commit the Decomposition

**Action:** Commit the plan changes.

```bash
git add -A && git commit -m "docs(plan): decompose task X.Y into X.Ya-X.Yc

- Rationale: [Why decomposition was needed]
- Subtasks: X.Ya (scan), X.Yb (modify), X.Yc (verify)
- Expected savings: Reduced rollback risk, better caching

Co-authored-by: cortex <cortex@users.noreply.github.com>
Brain-Repo: jonathanavis96/brain"
```

## Checkpoints

Use these to verify decomposition quality:

- [ ] **Original task analyzed:** Clear understanding of why it's oversized
- [ ] **2-4 subtasks identified:** Not too fine, not too coarse
- [ ] **Each subtask has clear AC:** Verifiable completion criteria
- [ ] **Dependencies are linear:** No circular dependencies
- [ ] **Plan updated:** Original task marked DECOMPOSED, subtasks listed
- [ ] **THUNK logged:** Decomposition decision documented
- [ ] **Changes committed:** Plan changes in version control

## Troubleshooting

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Can't identify natural boundaries | Task is truly atomic | Don't decompose - focus on improving guidance/AC |
| Too many subtasks (10+) | Over-decomposition | Group related micro-tasks into single subtask |
| Subtasks still taking too long | Boundaries not at right level | Re-decompose with different split points |
| Ralph skips subtasks | Original task not marked `[x]` | Mark original task complete with DECOMPOSED note |
| Circular dependencies | Wrong decomposition strategy | Use scan → modify → verify pattern |

## Related Skills

- [Token Efficiency](../domains/code-quality/token-efficiency.md) - Minimize tool calls
- [Task Complexity Tags](../../cortex/docs/PROMPT_REFERENCE.md#task-complexity-tags) - [S/M/L] estimation
- [Ralph Patterns](../domains/ralph/ralph-patterns.md) - Ralph workflow architecture

## Related Playbooks

- [Task Optimization Review](./task-optimization-review.md) - When to batch vs decompose
- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Handling failure cascades

## Notes

**Iteration efficiency:**

- Decomposition itself is a PLAN-mode activity (don't decompose during BUILD)
- Each subtask should complete in one BUILD iteration
- Use `current_ralph_tasks.sh` ETA to validate decomposition effectiveness

**When NOT to decompose:**

- Task is genuinely atomic (single file, single concern, clear path)
- Task is already [S] complexity but just slow (infrastructure issue, not task issue)
- Decomposition would create more overhead than benefit

**When to escalate:**

- Task repeatedly fails even after decomposition → investigate infrastructure/tooling issues
- Decomposition creates 10+ subtasks → task might be too large for single phase, escalate to Cortex for phase restructuring

---

**Last Updated:** 2026-01-25

**Covers:** Task decomposition, iteration optimization, complexity management, Phase 9C workflows
