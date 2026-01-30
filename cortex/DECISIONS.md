# DECISIONS.md - {{PROJECT_NAME}}

**Purpose:** Architectural decisions and conventions for {{PROJECT_NAME}}

**Last updated:** {{TIMESTAMP}}

---

## Active Decisions

(No decisions yet - project just bootstrapped)

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
