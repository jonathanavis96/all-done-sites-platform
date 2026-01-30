# Change Propagation Patterns

> Rules for ensuring changes propagate to all required locations.

## Integrity Rules (Canonical Source: `cortex/CORTEX_SYSTEM_PROMPT.md`)

| Rule | Description |
|------|-------------|
| **Say-Do Rule** | NEVER claim "I updated X" without actually writing to a file. Show file and line numbers. |
| **Propagation Rule** | When updating any file, check if `templates/` needs the same update. |
| **Templates First Rule** | Before making any change, run `ls templates/` to see what might need sync. |
| **Link Integrity Rule** | When creating/updating files, verify all referenced paths exist. |
| **Verify Before Done Rule** | Before saying "complete", run syntax checks, link checks, confirm changes exist. |
| **Rule Proposal Rule** | When you notice repeated user feedback, ASK if it should become a rule. |

## Quick Reference

| Change Type | Must Also Update |
|-------------|------------------|
| `cortex/rovo/*.md` | `templates/cortex/*.md` (if pattern applies to all projects) |
| `cortex/rovo/loop.sh` | `templates/ralph/loop.sh` |
| `workers/ralph/*.sh` | `templates/ralph/*.sh` |
| `cortex/AGENTS.md` | Document in `skills/` if it's a reusable pattern |
| Any "knowledge" claim | Write it to a file (AGENTS.md, DECISIONS.md, or skills/) |

## Anti-Pattern: Claiming Without Writing

```markdown
❌ WRONG - Said "I updated my knowledge" without writing anywhere
Agent: "I've updated my knowledge that one-shot.sh is Cortex-only"
Reality: Never wrote this to any file

✅ RIGHT - Write to persistent location
Agent: "I've documented this in cortex/AGENTS.md lines 145-155"
Then actually write it to the file
```text

## Verification Checklist

Before marking any change complete:

1. **Templates First** - Run `ls templates/` - what needs sync?
2. **Propagation** - Did I update all related templates?
3. **Skills?** - Is this a reusable pattern for `skills/domains/`?
4. **Link Integrity** - Do all file references exist?
5. **Verify** - Run `bash -n`, `python -m py_compile`, link checks
6. **Written Proof** - Show file:lines for each claim

## Template Sync Rule

**When updating project-specific files, always check if the template needs the same update.**

```bash
# Before ANY change:
ls templates/

# Example: Updated cortex/rovo/loop.sh with context injection
# Must also update:
templates/ralph/loop.sh

# Example: Updated cortex/rovo/AGENTS.md with lean format
# Must also update:
templates/cortex/AGENTS.project.md  # (if it's a pattern for all projects)
```text

## The "Say-Do" Rule

**Never say you did something without doing it.**

```markdown
❌ "I've updated my knowledge" → but no file was written
❌ "I've fixed the templates" → but templates unchanged
❌ "Task complete" → but verification skipped

✅ "I've written this to cortex/AGENTS.md lines 145-155"
✅ "I've updated templates/ralph/loop.sh with the same change"
✅ "Task complete - verified with: bash -n loop.sh"
```text

## Acceptance Criteria Pattern

When given a task, define AC that includes propagation:

```markdown
- [ ] **1.1** Add context injection to loop.sh
  - **AC:**
    - [ ] cortex/rovo/loop.sh updated
    - [ ] templates/ralph/loop.sh updated (same change)
    - [ ] Both pass syntax check: `bash -n`
    - [ ] Pattern documented in skills/ if reusable
```text

## Why This Matters

- **Templates drift** - New projects won't have improvements
- **Knowledge is lost** - "I know X" means nothing if not written
- **Maintenance burden** - Manual sync is error-prone
- **Trust erodes** - Claiming completion without verification

## See Also

- **[Ralph Patterns](ralph-patterns.md)** - Ralph loop architecture and workflow
- **[Bootstrap Patterns](bootstrap-patterns.md)** - Template usage and new project setup
- **[Code Hygiene](../code-quality/code-hygiene.md)** - Verification checklist and quality gates
- **[Code Consistency](../code-quality/code-consistency.md)** - Maintaining consistency across codebase
