# Skill Template (LLM-Optimized)

Use this template when creating new skill files. Copy and fill in all sections.

**Key principle:** Section 9 (Quick Reference Tables) is the most important section for usability.
Tables enable fast scanning without reading prose. Always include:

- An "At a Glance" table with key concepts
- A "Common Mistakes" table with ❌/✅ patterns

---

# Skill: <skill-short-name>

## 1) Intent (1 sentence)

What this skill enables the agent to do reliably.

## 2) Type

Choose one:

- Knowledge / Procedure / Tooling / Pattern / Debugging / Reference

## 3) Trigger Conditions (When to use)

Use this skill when ANY of these are true:

- <trigger 1>
- <trigger 2>
- <trigger 3>

## 4) Non-Goals (What NOT to do)

- <non-goal 1>
- <non-goal 2>

## 5) Inputs Required (and how to confirm)

The agent must gather/confirm:

- <input 1> (where to find it; how to validate)
- <input 2> (where to find it; how to validate)

## 6) Files / Sources to Study (DON'T SKIP)

Study these before acting:

- <path/file 1>
- <path/file 2>

Rules:

- Don't assume not implemented. Confirm with repo search.
- Prefer existing repo conventions/patterns over inventing new ones.

## 7) Procedure (LLM Playbook)

Follow in order:

### Step 1: Orient

- Study relevant docs/specs/code paths.
- Define the smallest viable outcome.

### Step 2: Decide

- Choose the simplest approach that matches existing patterns.
- If multiple approaches exist, pick the one that reduces future work.

### Step 3: Execute

- Keep changes minimal.
- Use consistent naming, paths, and conventions.

### Step 4: Validate

- Run the repo's standard checks/tests/build steps if any.
- If failures occur, fix them or document the failure + cause.

### Step 5: Record

- Update operational signs if needed (AGENTS.md, prompts, conventions).
- Update skills index (SUMMARY.md).

## 8) Output / Deliverables

This skill is complete when these exist:

- <deliverable 1>
- <deliverable 2>

## 9) Quick Reference Tables

### At a Glance

| Concept | Description | Example |
| --------- | ------------- | --------- |
| `<key-concept-1>` | <what it means> | <brief example> |
| `<key-concept-2>` | <what it means> | <brief example> |

### Common Mistakes

| ❌ Don't | ✅ Do | Why |
| ---------- | ------- | ----- |
| <bad pattern> | <good pattern> | <brief explanation> |
| <bad pattern> | <good pattern> | <brief explanation> |

## 10) Gotchas / Failure Modes

Common ways the agent fails here:

| Failure Mode | Mitigation |
| -------------- | ------------ |
| <failure mode 1> | <how to avoid/fix> |
| <failure mode 2> | <how to avoid/fix> |

## 11) Minimal Example (repo-specific)

**Context:**
<describe the situation>

**Steps taken:**

1. <step 1>

2. <step 2>

**Result:**
<what was produced>

---

## Pre-Commit Checklist (REQUIRED)

Before committing any new markdown file, verify:

- [ ] **Code blocks have language tags** - Use ` ```bash `, ` ```python `, ` ```text `, etc. Never bare ` ``` `
- [ ] **Blank line before/after code blocks** - Required by MD031
- [ ] **Blank line before/after lists** - Required by MD032
- [ ] **Blank line after headings** - Required by MD022
- [ ] **Run lint check** - `markdownlint <file>` shows no errors

**Common language tags:**

| Content Type | Tag |
|--------------|-----|
| Shell commands | `bash` |
| Python code | `python` |
| JSON/config | `json` |
| Directory trees | `text` |
| Generic output | `text` |
| Markdown examples | `markdown` |
