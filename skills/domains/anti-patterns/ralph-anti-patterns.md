# Ralph Anti-Patterns

## Overview

This document captures anti-patterns specific to Ralph loop execution. These patterns break the Ralph workflow, cause infinite loops, violate safety rules, or create maintenance burdens.

**Use this when:**

- Writing or debugging Ralph prompts
- Implementing Ralph-like automation systems
- Troubleshooting Ralph execution issues
- Training agents on Ralph best practices

**Related:**

- [Ralph Patterns](../ralph/ralph-patterns.md) - Architecture and correct patterns
- [Shell Anti-Patterns](./shell-anti-patterns.md) - General shell mistakes
- [Markdown Anti-Patterns](./markdown-anti-patterns.md) - Documentation issues

---

## Anti-Pattern 1: Modifying Protected Files

### ❌ BAD: Editing Hash-Guarded Files

**Problem:** Attempting to modify files protected by hash guards causes verifier failures and blocks progress.

```bash
# DON'T: Edit protected files directly
vim workers/ralph/rules/AC.rules
echo "new rule" >> workers/ralph/rules/AC.rules

# DON'T: Update hash files manually
sha256sum workers/ralph/rules/AC.rules > .verify/ac.sha256
```

### Why It's Bad

- Hash guards detect unauthorized changes (Protected.1 verifier failure)
- Agent cannot fix hash mismatches (human-only operation)
- Creates false sense of completion when hash is out of sync
- Breaks validation pipeline integrity

### ✅ GOOD: Request Spec Change

```bash
# DO: Document the needed change and stop
cat > SPEC_CHANGE_REQUEST.md << 'EOF'
# Spec Change Request

## Requested Change
Need to add new acceptance criterion for XYZ.

## File to Modify
workers/ralph/rules/AC.rules

## Rationale
Current AC doesn't cover edge case discovered in task 16.3.2.

## Proposed Addition
[gate:hygiene] [check:auto] [severity:block]
...
EOF

# Output human intervention notice
echo "⚠️ HUMAN INTERVENTION REQUIRED"
echo "Cannot modify protected file: rules/AC.rules"
echo "Created SPEC_CHANGE_REQUEST.md - awaiting human review"
```

### Related Patterns

- Protected files: `AC.rules`, `verifier.sh`, `loop.sh`, `PROMPT.md`, `.verify/*.sha256`
- See `docs/WAIVER_PROTOCOL.md` for false positive handling

---

## Anti-Pattern 2: Outputting `:::COMPLETE:::`

### ❌ BAD: Agent Outputs Completion Sentinel

**Problem:** Only `loop.sh` should output `:::COMPLETE:::`. Agent output breaks loop control.

```text
DON'T: End your response with
All tasks complete!
:::COMPLETE:::
```

### Why It's Bad

- Loop control relies on exact sentinel detection
- Agent-generated sentinel stops loop prematurely
- Breaks task-per-iteration contract
- Causes confusion about who controls completion

### ✅ GOOD: Use Mode-Specific Sentinels

```text
# DO: Use correct mode sentinel
PLANNING mode ends with:
:::PLAN_READY:::

BUILD mode ends with:
:::BUILD_READY:::

# Only loop.sh outputs :::COMPLETE::: after verifier passes
```

### Related Patterns

- `:::PLAN_READY:::` - Planning iteration complete
- `:::BUILD_READY:::` - Build iteration complete, triggers verifier
- `:::COMPLETE:::` - Reserved for loop.sh when ALL tasks done

---

## Anti-Pattern 3: Batching Multiple Tasks

### ❌ BAD: Completing Multiple Tasks in One Iteration

**Problem:** Doing more than one task breaks atomicity, debugging, and rollback capabilities.

```bash
# DON'T: "While I'm here" syndrome
# Task 16.3.2: Create ralph-anti-patterns.md
# Also fixed: shell-anti-patterns.md typo
# Also updated: skills/index.md
# Also cleaned up: old temp files

git add -A
git commit -m "feat(skills): add ralph anti-patterns + misc fixes"
```

### Why It's Bad

- Breaks git bisect debugging (multiple changes in one commit)
- Violates one-task-per-iteration contract
- Makes rollback ambiguous (which change caused the issue?)
- THUNK log becomes inaccurate (only logs primary task)
- Wastes iterations on "bonus" work instead of systematic progress

### ✅ GOOD: Strictly One Task Per Iteration

```bash
# DO: Complete exactly the assigned task
# Task 16.3.2: Create ralph-anti-patterns.md

# Create the file
cat > skills/domains/anti-patterns/ralph-anti-patterns.md << 'EOF'
...
EOF

# Log completion (append to current era table)
echo "| 500 | 16.3.2 | MEDIUM | Create ralph-anti-patterns.md - 7 anti-patterns documented | $(date +%Y-%m-%d) |" >> workers/ralph/workers/ralph/THUNK.md

# Mark task complete
sed -i 's/- \[ \] \*\*16.3.2\*\*/- [x] **16.3.2**/' workers/workers/IMPLEMENTATION_PLAN.md

# Single atomic commit
git add -A && git commit -m "feat(skills): add ralph-anti-patterns.md

- Documents 7 Ralph-specific anti-patterns
- Covers protected files, completion sentinels, batching, force push, etc.
- Includes bad/good examples for each pattern

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>
Brain-Repo: jonathanavis96/brain"

# STOP - do not continue to next task
```

### Exception: Same-File Warnings

**Only exception:** Multiple verifier warnings in the SAME file can be batched:

```bash
# OK: Fix all SC2162 warnings in loop.sh (same file, same fix type)
# Fix line 45: add -r to read
# Fix line 89: add -r to read
# Fix line 134: add -r to read
git commit -m "fix(ralph): resolve SC2162 warnings in loop.sh"

# OK: Fix all markdown issues in same file
# Add MD040 language tags + fix MD031 blank lines in skills/README.md
git commit -m "fix(docs): resolve markdown lint in skills/README.md"
```

### Related Patterns

- Discovery-defer rule: Note new issues in commit message, add to plan later
- Cross-file batching: Same fix type across multiple files = one iteration

---

## Anti-Pattern 4: Force Push Without Permission

### ❌ BAD: Using Force Push Commands

**Problem:** Force push destroys history and breaks collaboration.

```bash
# DON'T: Force push
git push --force
git push --force-with-lease
git push -f

# DON'T: Rewrite public history
git rebase -i HEAD~5
git push --force
```

### Why It's Bad

- Destroys commits others may have pulled
- Breaks collaborative workflows (Cortex, other agents)
- Prevents rollback to previous states
- Violates safety contract in Ralph prompt

### ✅ GOOD: Linear History with Regular Push

```bash
# DO: Always use regular push
git push

# If push rejected, pull and merge (don't rebase)
git pull --no-rebase
git push

# Only force push when EXPLICITLY instructed by human
# (e.g., "Force push to recover from XYZ incident")
```

### Related Patterns

- Loop rollback: `bash loop.sh --rollback N` for safe undo
- Protected branches: Configure branch protection rules to block force push

---

## Anti-Pattern 5: Destructive Commands Without Explicit Instruction

### ❌ BAD: Deleting Directories or Files Impulsively

**Problem:** Irreversible deletion without explicit task instruction.

```bash
# DON'T: Delete without task saying so
rm -rf skills/domains/deprecated/
rm -rf .verify/

# DON'T: Clean up "while I'm here"
find . -name "*.tmp" -delete
rm -f *.log
```

### Why It's Bad

- Irreversible data loss
- Violates principle of surprise (user didn't ask for it)
- May delete files needed by other systems
- Breaks rollback capability (deleted files not in git)

### ✅ GOOD: Delete Only When Task Explicitly Says So

```bash
# DO: Only if task says "Delete X"
# Task 16.3.2: "Create ralph-anti-patterns.md and delete old draft"
rm -f skills/domains/ralph/anti-patterns-draft.md

# DO: Propose deletion in PLAN mode if needed
cat >> workers/workers/IMPLEMENTATION_PLAN.md << 'EOF'
- [ ] **16.5.1** Clean up deprecated skills/domains/deprecated/ directory [LOW]
  - Goal: Remove obsolete patterns documented in Phase 14
  - AC: Directory deleted, skills/index.md updated
EOF
```

### Exception: Temporary Test Files

**Only exception:** Cleaning up temporary files YOU created THIS iteration:

```bash
# OK: Clean up your own temp files from this iteration
cat > tmp_rovodev_test.sh << 'EOF'
#!/bin/bash
echo "test"
EOF
bash tmp_rovodev_test.sh
rm -f tmp_rovodev_test.sh  # OK - you created it this iteration
```

### Related Patterns

- Temp file naming: Use `tmp_rovodev_*` prefix for easy identification
- Git ignore: Add temp patterns to `.gitignore`

---

## Anti-Pattern 6: Reading Verifier Output from File

### ❌ BAD: Trying to Read `.verify/latest.txt`

**Problem:** Verifier status is already injected in prompt header. Reading the file wastes tool calls.

```bash
# DON'T: Try to read verifier output
cat .verify/latest.txt
cat ../.verify/latest.txt
bash -c "cat .verify/latest.txt"

# DON'T: Run verifier manually in BUILD mode
bash verifier.sh
```

### Why It's Bad

- Verifier status already in your context (check the header!)
- Wastes tool calls on duplicate information
- Breaks token efficiency principle
- Loop.sh runs verifier automatically after BUILD

### ✅ GOOD: Use Injected Header Status

```text
# DO: Check the header you already received
Look for the section:
# ═══════════════════════════════════════════════════════════════
# VERIFIER STATUS (injected by loop.sh - DO NOT read .verify/latest.txt)
# ═══════════════════════════════════════════════════════════════

SUMMARY
  PASS: 58
  FAIL: 0
  WARN: 0

# Use this information directly - no file reads needed
```

### Related Patterns

- Context you already have: Never repeat pwd, git branch, verifier status
- Token efficiency: Prefer grep/head/sed over reading full files

---

## Anti-Pattern 7: Opening Large Files at Startup

### ❌ BAD: Opening Full Context Files at Start

**Problem:** Opening large files wastes tokens when grep/sed would suffice.

```bash
# DON'T: Open large files at startup
open_files(["NEURONS.md", "THOUGHTS.md", "workers/workers/IMPLEMENTATION_PLAN.md", "workers/ralph/workers/ralph/THUNK.md"])

# DON'T: Read full files to find one task
cat workers/workers/IMPLEMENTATION_PLAN.md | grep "[ ]"
```

### Why It's Bad

- NEURONS.md (800+ lines): Wastes 10k+ tokens when `ls skills/` suffices
- workers/IMPLEMENTATION_PLAN.md: Full file is 600+ lines, need only 10-20 lines
- workers/ralph/THUNK.md: Grows indefinitely, only need tail or grep
- Violates "cheap first" startup principle

### ✅ GOOD: Use Grep/Sed for Targeted Context

```bash
# DO: Find your task efficiently
grep -n "^- \[ \]" workers/workers/IMPLEMENTATION_PLAN.md | head -10

# DO: Slice only the section you need
sed -n '465,480p' workers/workers/IMPLEMENTATION_PLAN.md

# DO: Use ls/find instead of NEURONS.md
ls skills/domains/
find bin/ -maxdepth 1 -type f

# DO: Use tail for THUNK lookups
tail -20 workers/ralph/workers/ralph/THUNK.md | grep "^|" | tail -1
```

### Related Patterns

- Mandatory startup procedure: grep → slice → search before open
- Constrain searches: Avoid grep explosion with path filters
- THUNK lookup path: Use bin/thunk-parse or tail, not full file read

---

## Quick Reference

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Modify protected files | Hash guard violation | Create SPEC_CHANGE_REQUEST.md |
| Output `:::COMPLETE:::` | Breaks loop control | Use `:::BUILD_READY:::` or `:::PLAN_READY:::` |
| Batch multiple tasks | Breaks atomicity | One task per iteration (except same-file warnings) |
| Force push | Destroys history | Regular push only, unless explicitly instructed |
| Destructive commands | Data loss | Delete only when task explicitly says so |
| Read verifier file | Duplicate info | Use injected header status |
| Open large files | Token waste | Use grep/sed/tail for targeted context |

---

## See Also

- [Ralph Patterns](../ralph/ralph-patterns.md) - Correct Ralph architecture patterns
- [Shell Anti-Patterns](./shell-anti-patterns.md) - General shell mistakes
- [Code Hygiene](../code-quality/code-hygiene.md) - Definition of done checklist
- [Token Efficiency](../code-quality/token-efficiency.md) - Optimization strategies
