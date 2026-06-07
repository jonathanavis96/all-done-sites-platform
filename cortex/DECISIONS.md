# DECISIONS.md - All Done Sites

**Purpose:** Architectural decisions and conventions for All Done Sites

**Last updated:** 2026-06-07 12:05:00

---

## Active Decisions

### DEC-2026-06-07-001: Retire Ralph; Cortex is the single planner+builder

**Date:** 2026-06-07 12:05:00

**Decision:** Move from the two-agent model (Cortex plans, Ralph executes an
autonomous loop) to a single-agent model where Cortex both plans and implements
directly inside Claude Code.

**Rationale:**

- The autonomous Ralph loop added overhead (task contracts, verifier, THUNK log)
  that is unnecessary for a small marketing/portfolio site.
- Working directly in Claude Code is faster and simpler for the current scope.
- Alternatives considered: keep the loop (rejected — too heavy), delete Ralph
  outright (rejected — lose reference/history). Chose to archive instead.

**Implementation:**

- `workers/` moved to `archive/workers/` (frozen, never modified).
- Core docs rewritten: `cortex/CORTEX_SYSTEM_PROMPT.md`, `cortex/AGENTS.md`,
  `CLAUDE.md`, `NEURONS.md`, `README.md`, `cortex/THOUGHTS.md`.
- `archive/README.md` explains the frozen runtime.

**Impact:** Simpler workflow; one agent owns plan → build → verify. The
`skills/` knowledge base still references Ralph patterns and is kept as-is
(useful generic knowledge); only core operating docs were updated.

---

## Decision Template

When adding decisions, use this format:

```markdown
### DEC-YYYY-MM-DD-NNN: Decision Title

**Date:** YYYY-MM-DD HH:MM:SS

**Decision:** What was decided?

**Rationale:**
- Why this approach?
- What alternatives were considered?
- What are the tradeoffs?

**Implementation:**
- How is this enforced?
- What files/patterns are affected?

**Impact:** Effect on project, team, or architecture
```text

---

## When to Add Decisions

**Do add:**

- Architectural patterns (MVC, microservices, event-driven)
- Technology choices (why FastAPI over Flask)
- Coding conventions (naming, structure, testing approach)
- Process decisions (branching strategy, deployment process)
- Resolving design debates (document why you chose X over Y)

**Don't add:**

- Temporary decisions (use `cortex/THOUGHTS.md` instead)
- Implementation details (use inline comments instead)
- Bug fixes (use commit messages instead)
- Personal preferences without rationale

**Review cadence:** During Cortex planning sessions, promote decisions from THOUGHTS.md → DECISIONS.md when patterns solidify

---

**Next review:** After Phase 1 completion
