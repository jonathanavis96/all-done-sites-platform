# Implementation Plan - [PROJECT_NAME]

Last updated: [YYYY-MM-DD HH:MM:SS]

## Maintenance Check (Planning Mode Only)

**When in planning mode**, run `bash .maintenance/verify-brain.sh` and review `.maintenance/MAINTENANCE.md`.
Incorporate any relevant maintenance items into the appropriate priority section below.

> **Note:** When maintenance items are completed:
>
> 1. Remove from `.maintenance/MAINTENANCE.md`
> 2. Log completion in `.maintenance/MAINTENANCE_LOG.md`
> 3. Remove from the MAINTENANCE section at the bottom of this plan

## Current State Summary

[REPLACE: Describe what exists today. What has been built so far? What works? What's incomplete?]

Example structure:

- **Feature X:** Status description
- **Module Y:** Status description
- **Infrastructure Z:** Status description

## Goal

[REPLACE: What is this implementation plan trying to achieve? What's the end state?]

<!-- Cortex adds new Task Contracts below this line -->

Example: "Build a complete [system/feature] that [specific outcome]"

## Prioritized Tasks

### High Priority

[REPLACE: Critical tasks that must be done first. These directly impact core functionality or unblock other work.]

- [ ] **Task 1:** [Task description]
  - [Detail or acceptance criteria]
  - [Detail or acceptance criteria]
  - Target: [Specific measurable outcome]

- [ ] **Task 2:** [Task description]
  - [Detail or acceptance criteria]
  - Target: [Specific measurable outcome]

### Medium Priority

[REPLACE: Important tasks that should be done soon but aren't blocking critical path.]

- [ ] **Task 3:** [Task description]
  - [Detail or acceptance criteria]
  - Target: [Specific measurable outcome]

- [ ] **Task 4:** [Task description]
  - [Detail or acceptance criteria]
  - Target: [Specific measurable outcome]

### Low Priority

[REPLACE: Nice-to-have tasks or optimizations that can wait until core functionality is stable.]

- [ ] **Task 5:** [Task description]
  - [Detail or acceptance criteria]
  - Target: [Specific measurable outcome]

## Discoveries & Notes

[REPLACE: Track important learnings, blockers, or decisions made during implementation.]

Example entries:

- **[Date] Discovery:** Found that X requires Y - added Task Z
- **[Date] Blocker:** Task A blocked by external dependency - documented workaround
- **[Date] Decision:** Chose approach X over Y because [reason]

---

## How to Use This File

**For Ralph (Planning Mode):**

- Analyze current state vs. goals from THOUGHTS.md
- Update task priorities based on dependencies
- Add newly discovered tasks
- Remove or archive completed tasks

**For Ralph (Building Mode):**

- Read this file FIRST every iteration
- Find the FIRST unchecked `[ ]` task (top to bottom through priorities)
- Implement ONLY that ONE task
- Mark completed: `[x]`
- Add discoveries under "Discoveries & Notes"
- Commit and STOP

**For Manual Review:**

- Check that priorities make sense (dependencies first, polish last)
- Verify task descriptions are actionable (not vague)
- Ensure completion criteria are clear

## Task Format Guidelines

**Good task format:**

```markdown
- [ ] **Task X:** Build authentication module
  - Implement JWT token generation and validation
  - Add middleware for protected routes
  - Create login/logout endpoints
  - Target: All auth endpoints working, tests pass
```text

**Bad task format:**

```markdown
- [ ] Make auth better (too vague)
- [ ] Fix everything (not actionable)
- [ ] Refactor (no scope or outcome defined)
```text

**Task Characteristics:**

- **Actionable:** Clear what needs to be done
- **Scoped:** One coherent unit of work
- **Measurable:** Obvious when it's complete
- **Independent:** Can be done in one iteration (or dependencies explicitly noted)

---

## MAINTENANCE

<!-- Auto-populated by verify-brain.sh - items below are consistency/housekeeping tasks -->
<!-- When completed, remove from here AND from .maintenance/MAINTENANCE.md -->

*No maintenance items currently pending.*
