# GAP_LOG and Auto-Skill Promotion System Specification

## Overview

This document specifies two interconnected enhancements to the Ralph self-improvement system:

1. **GAP_LOG.md** — An append-only historical record of all gap discoveries and updates
2. **Auto-Skill Promotion** — Automatic skill creation from qualified gaps when planned work is complete

These features work together to create a self-improving knowledge system that captures learning over time and converts recurring patterns into reusable skills.

---

## Part 1: GAP_LOG.md

### Purpose

Provide a complete, chronological history of all gap discoveries and updates. While `skills/self-improvement/GAP_BACKLOG.md` is the "current state" (consolidated, editable), `GAP_LOG.md` is the "event history" (append-only, immutable).

### Problem Being Solved

Current behavior: When Claude discovers more about an existing topic, it **updates** the existing `skills/self-improvement/GAP_BACKLOG.md` entry. This loses visibility into:

- When each piece of knowledge was learned
- The evolution of understanding over time
- Metrics on gap discovery frequency and patterns

### File Location

```text
brain/ralph/skills/self-improvement/GAP_LOG.md
```text

### Entry Format

Each entry includes:

- **Full timestamp** (date + time) — not just date
- **Gap name** — matches the name in skills/self-improvement/GAP_BACKLOG.md
- **Action type** — NEW or UPDATED
- **Content** — what was discovered/added

```markdown
### 2026-01-18 19:07 — Bash Terminal Control with tput (NEW)
- **Type:** Tooling / Knowledge
- **Summary:** Prevents screen flashing during display refreshes in interactive bash scripts
- **Key learning:** Use `tput cup 0 0` + `tput ed` instead of `clear` for flicker-free updates
- **Context:** Implementing cursor positioning for top-anchored display in current_ralph_tasks.sh

### 2026-01-18 21:30 — Bash Terminal Control with tput (UPDATED)
- **Addition:** Learned about alternate screen buffer using `tput smcup` (enter) and `tput rmcup` (exit)
- **Context:** Discovered while implementing full-screen TUI mode

### 2026-01-19 10:15 — Bash Terminal Control with tput (UPDATED)
- **Addition:** Color support via `tput colors` (query) and `tput setaf N` (set foreground)
- **Context:** Adding color coding to task status display
```text

### Capture Rules

**When to append to GAP_LOG.md:**

1. **New gap discovered** → Append entry with `(NEW)` suffix
2. **Existing gap updated** → Append entry with `(UPDATED)` suffix, describing only what was added

**Timing:** Logging happens at the moment of gap capture (Rule 2 in GAP_CAPTURE_RULES.md), not during review.

**Relationship to skills/self-improvement/GAP_BACKLOG.md:**

- `skills/self-improvement/GAP_BACKLOG.md` — Edit/update in place (consolidated view)
- `GAP_LOG.md` — Always append (historical view)
- Both are updated in the same operation

### What the Log Enables

- **Metrics:** "How many gaps discovered this week/month?"
- **Patterns:** "I keep hitting bash-related gaps — maybe need deeper bash skills"
- **Audit trail:** Full journey from discovery → updates → promotion
- **Clustering:** "5 gaps logged in one session suggests a knowledge area to focus on"

---

## Part 2: Auto-Skill Promotion System

### Purpose

Automatically create skill files from qualified gaps when all planned work is complete. This ensures skills get created organically without disrupting priority work.

### Problem Being Solved

Current state: The system defines promotion criteria but has no engine to drive reviews. Gaps accumulate in `skills/self-improvement/GAP_BACKLOG.md` and never get converted to skills unless manually triggered.

### Trigger Condition

Auto-skill promotion activates **only when all planned work is done**:

- All tasks in `workers/IMPLEMENTATION_PLAN.md` are marked complete
- No pending items remain in the current plan
- `loop.sh` has finished its planned iteration

### Processing Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    PLANNED WORK PHASE                        │
│  (Normal loop.sh execution of workers/IMPLEMENTATION_PLAN.md tasks) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    All planned tasks done?
                              │
                    ┌─────────┴─────────┐
                    │ NO                │ YES
                    ▼                   ▼
              Continue work    ┌───────────────────┐
                               │ SKILL REVIEW PHASE │
                               └───────────────────┘
                                        │
                                        ▼
                              Review skills/self-improvement/GAP_BACKLOG.md
                                        │
                                        ▼
                              Any gaps meet ALL 4 criteria?
                              (Clear, Specific, Recurring, LLM-executable)
                                        │
                              ┌─────────┴─────────┐
                              │ NO                │ YES
                              ▼                   ▼
                         TRULY DONE         Pick ONE gap
                                                  │
                                                  ▼
                                      Append skill creation tasks
                                      to workers/IMPLEMENTATION_PLAN.md
                                                  │
                                                  ▼
                                      Execute skill creation
                                                  │
                                                  ▼
                                      Loop back to review
                                      (check for more gaps)
```text

### Key Behaviors

1. **One at a time** — Only one gap is promoted per cycle
2. **Re-check after each** — After completing a skill, review again (new gaps may have been discovered during skill creation)
3. **No cap** — Process continues until no more gaps qualify
4. **Auto-append** — Tasks are automatically added to workers/IMPLEMENTATION_PLAN.md (user reviews before execution via normal loop.sh flow)

### Promotion Criteria (All Must Be True)

From `GAP_CAPTURE_RULES.md`:

| Criterion | Description | How to Evaluate |
|-----------|-------------|-----------------|
| **Clear** | Well-defined, not vague | Can you explain it in one sentence? |
| **Specific** | Actionable, not overly broad | Does it have concrete examples/evidence? |
| **Recurring** | Likely to help again | Would this help in future similar tasks? |
| **LLM-executable** | Can be expressed as triggers + steps + outputs | Can Claude follow this as a procedure? |

### Skill Creation Task Breakdown

When a gap qualifies for promotion, these tasks are appended to `workers/IMPLEMENTATION_PLAN.md`:

```markdown
## Phase N: Skill Creation — <Gap Name>

### Task N.1: Validate Promotion Criteria
- [ ] Confirm gap meets all 4 criteria (clear, specific, recurring, LLM-executable)
- [ ] Check for overlap with existing skills in `skills/`
- [ ] Determine appropriate scope (not too broad, not too narrow)

### Task N.2: Draft Skill File
- [ ] Use `SKILL_TEMPLATE.md` as base
- [ ] Write triggers (when does this skill apply?)
- [ ] Write steps (what actions to take?)
- [ ] Write outputs (what should result?)
- [ ] Include examples from gap evidence

### Task N.3: Place and Index
- [ ] Decide placement:
  - Broadly reusable → `skills/domains/<topic>/<skill>.md`
  - Project-specific → `skills/projects/<project>/<skill>.md`
- [ ] Create folder if needed
- [ ] Update `skills/SUMMARY.md` with new entry

### Task N.4: Update Backlogs
- [ ] Update `skills/self-improvement/GAP_BACKLOG.md` entry status to "Promoted to SKILL_BACKLOG"
- [ ] Add entry to `SKILL_BACKLOG.md` with status "Done" and link to skill file
- [ ] Append promotion event to `GAP_LOG.md`

### Task N.5: Check Operational Impact
- [ ] Does this skill change agent behavior? → Update `AGENTS.md`
- [ ] Does this skill affect prompts? → Update `PROMPT.md` or templates
- [ ] Does this skill affect validation? → Update `VALIDATION_CRITERIA.md`
```text

### Gap Selection Priority

When multiple gaps qualify, select based on:

1. **Priority field** — P0 > P1 > P2
2. **Age** — Older gaps first (FIFO within same priority)
3. **Evidence quality** — Gaps with richer evidence are easier to convert

---

## Part 3: Implementation Changes Required

### Files to Modify

| File | Change |
|------|--------|
| `loop.sh` | Add skill review phase after planned work completion |
| `GAP_CAPTURE_RULES.md` | Add Rule 6 for GAP_LOG.md logging |
| `AGENTS.md` | Document the auto-skill promotion behavior |

### Files to Create

| File | Purpose |
|------|---------|
| `GAP_LOG.md` | New append-only historical log |

### loop.sh Changes

Add logic at end of main loop:

```text
After all workers/IMPLEMENTATION_PLAN.md tasks complete:
1. Read skills/self-improvement/GAP_BACKLOG.md
2. For each gap with Status: Identified
   - Evaluate against 4 promotion criteria
   - If ALL criteria met, select this gap (respect priority order)
   - Break after first selection
3. If gap selected:
   - Generate skill creation tasks (see breakdown above)
   - Append to workers/IMPLEMENTATION_PLAN.md as new phase
   - Continue loop (execute new tasks)
4. If no gap selected:
   - Log "No gaps ready for promotion"
   - Exit loop (truly done)
```text

### GAP_CAPTURE_RULES.md Addition

Add new rule:

```markdown
## Rule 6: Historical Logging

Every gap capture or update must also append to `GAP_LOG.md`:

1. **New gap** → Append with `(NEW)` suffix and full details
2. **Updated gap** → Append with `(UPDATED)` suffix describing only what was added
3. Include timestamp with date AND time (YYYY-MM-DD HH:MM)
4. Never edit or remove entries from GAP_LOG.md
```text

---

## Part 4: Example Scenarios

### Scenario A: Normal Work with Gap Discovery

1. User provides task: "Optimize the bash script for performance"
2. Claude works on task, discovers caching pattern isn't documented
3. Claude logs to `skills/self-improvement/GAP_BACKLOG.md` (new entry)
4. Claude **also** appends to `GAP_LOG.md` with timestamp and `(NEW)`
5. Claude completes the optimization task
6. All planned work done → skill review triggers
7. Caching pattern gap evaluated → meets all 4 criteria
8. Skill creation tasks appended to plan
9. Claude creates the skill file
10. Review again → no more qualifying gaps
11. Truly done

### Scenario B: Gap Updated During Work

1. Gap "Bash Terminal Control" already exists from yesterday
2. Today, Claude learns about color support while working
3. Claude updates `skills/self-improvement/GAP_BACKLOG.md` entry (adds color info)
4. Claude **also** appends to `GAP_LOG.md` with `(UPDATED)` showing only the new color info
5. Historical record preserved

### Scenario C: Multiple Gaps, Prioritized Processing

1. Planned work completes
2. skills/self-improvement/GAP_BACKLOG.md has 3 qualifying gaps: P2, P1, P2
3. P1 gap selected first (highest priority)
4. Skill created for P1 gap
5. Review again → 2 gaps remain (both P2)
6. Older P2 gap selected (FIFO)
7. Skill created
8. Review again → 1 gap remains
9. Last gap processed
10. Review again → no more qualifying gaps
11. Truly done

### Scenario D: New Gap During Skill Creation

1. Planned work completes, 1 qualifying gap exists
2. Skill creation begins for that gap
3. During skill creation, Claude discovers another gap → logs it
4. First skill completed
5. Review again → new gap evaluated
6. If new gap qualifies, it gets processed next
7. System remains responsive to new discoveries

---

## Part 5: Success Metrics

After implementation, track:

- **Gap capture rate** — How many gaps logged per week?
- **Promotion rate** — What % of gaps become skills?
- **Time to promotion** — Average days from discovery to skill creation
- **Skill reuse** — Are created skills actually being referenced?

These can be derived from `GAP_LOG.md` timestamps and `SKILL_BACKLOG.md` entries.

---

## Part 6: Open Questions / Future Considerations

1. **Manual override** — Should user be able to force-promote a gap regardless of criteria?
2. **Gap archival** — Should old, never-promoted gaps be archived after N days?
3. **Skill deprecation** — What happens when a skill becomes outdated?
4. **Cross-project gaps** — How to handle gaps discovered in one project that apply to another?

These are not in scope for initial implementation but noted for future consideration.

---

## Summary

| Component | Purpose | Key Behavior |
|-----------|---------|--------------|
| `GAP_LOG.md` | Historical record | Append-only, timestamped, captures all discoveries and updates |
| Auto-skill promotion | Convert gaps to skills | Triggers after planned work, one at a time, no cap, re-checks after each |
| `loop.sh` changes | Drive the process | Adds skill review phase at end of planned work |
| `GAP_CAPTURE_RULES.md` | Document rules | New Rule 6 for historical logging |

This system creates a virtuous cycle: work generates gaps → gaps become skills → skills improve future work.
