# Documentation Anti-Patterns

## Overview

Common documentation mistakes that reduce clarity, maintainability, and usefulness. These patterns emerge from code reviews, lint failures, and user feedback across the brain repository.

**Target Audience:** Technical writers, developers documenting code, Ralph loop agents

**Related:**

- [markdown-anti-patterns.md](markdown-anti-patterns.md) - Formatting issues
- [code-review-patterns.md](../code-quality/code-review-patterns.md) - Review checklist
- [code-hygiene.md](../code-quality/code-hygiene.md) - Code quality patterns

---

## Anti-Pattern 1: Broken or Stale Links

### Problem

Documentation contains links to files, sections, or external resources that no longer exist or have moved. This breaks navigation and erodes trust in the documentation.

**Common Causes:**

- File moved/renamed without updating references
- Section heading changed without updating anchor links
- External URL changed or removed
- Copy-paste documentation without verifying links

### Detection

```bash
# Run link validation
bash tools/validate_links.sh

# Manual check for common patterns
rg '\[.*\]\((?!http).*\.md\)' docs/ skills/ --type md
```

### Bad Example

Documentation references a file that doesn't exist, or uses outdated paths after reorganization.

**Why it's bad:** Reader clicks link, gets 404, loses trust in documentation.

### Good Example

Before adding links, verify the target exists:

```bash
ls docs/BOOTSTRAPPING.md  # Verify file exists first
```

Then reference it correctly from the current file's location.

### Prevention

- **Always verify links before committing:** `ls path/to/file.md`
- **Use relative paths from current file location**
- **Run `bash tools/validate_links.sh` before PR**
- **When moving files, search for references:** `rg "old-filename" --type md`

### Automated Check

- Tool: `tools/validate_links.sh`
- Gate: `QUALITY_GATES.md` → validate-links
- CI: Runs on every commit

---

## Anti-Pattern 2: Code Examples Missing Context

### Problem

Code snippets lack necessary imports, variable definitions, or setup code, making examples unrunnable without guessing missing parts.

**Common Causes:**

- Copying partial code from working file
- Assuming reader knows implicit context
- Removing "boring" imports to save space
- Not testing examples in isolation

### Detection

```bash
# Run example validation
python3 tools/validate_examples.py docs/ skills/

# Look for undefined variables in examples
rg '```python\n(?!.*import)' docs/ skills/ --type md
```

### Bad Example

```python
# Example from docs/TOOLS.md
result = parse_marker(content)
print(result['type'])
```

**Problem:** Where does `parse_marker` come from? What is `content`?

### Good Example

```python
# Example from docs/TOOLS.md
from tools.thunk_parser import parse_marker

content = "::TASK_START::{...}::TASK_END::"
result = parse_marker(content)
print(result['type'])  # Output: "TASK_START"
```

**Or explicitly mark user-provided values:**

```python
# Example from docs/TOOLS.md
from tools.thunk_parser import parse_marker

# User provides:
content = "<your marker string here>"

result = parse_marker(content)
print(result['type'])
```

### Prevention

- **Include all imports at top of example**
- **Define all variables before use, or mark as "user-provided"**
- **Test examples in clean Python session:** `python3 -c "..."`
- **Use comments to explain implicit context**

### Automated Check

- Tool: `tools/validate_examples.py`
- Checks: Undefined variables, missing imports, syntax errors
- Gate: `QUALITY_GATES.md` → validate-code-examples

---

## Anti-Pattern 3: Wall of Text (No Structure)

### Problem

Large blocks of unformatted text without headings, lists, or visual breaks. Readers cannot scan, skim, or find information quickly.

**Common Causes:**

- Stream-of-consciousness writing
- Converting verbal explanation to text without editing
- Fear of "too many headings"
- Not considering reader's scanning behavior

### Detection

**Manual review:**

- Paragraph longer than 8-10 lines → candidate for restructuring
- No headings for 50+ lines → missing structure
- Multiple topics in one paragraph → split needed

### Bad Example

```markdown
The Ralph loop is a self-improving AI agent system that runs in PLAN and BUILD modes. In PLAN mode it reads the current state and creates an implementation plan with prioritized tasks. In BUILD mode it picks the first unchecked task and implements it, then commits the changes and logs completion to workers/ralph/THUNK.md. The loop alternates between PLAN and BUILD modes every 3 iterations. It also runs a verifier after each BUILD iteration to check acceptance criteria. If the verifier fails the agent must fix the issues before continuing. The system uses hash guards to protect critical files from modification. If a protected file needs changes the agent creates a SPEC_CHANGE_REQUEST.md and stops. The loop continues until all tasks are complete and outputs a completion sentinel.
```

**Problem:** 9 sentences, 7 different topics, no visual structure.

### Good Example

```markdown
## Ralph Loop Overview

The Ralph loop is a self-improving AI agent system that runs in two modes:

**PLAN Mode (Iteration 1, 4, 7...):**

- Reads current state
- Creates implementation plan with prioritized tasks

**BUILD Mode (All other iterations):**

- Picks first unchecked task
- Implements changes
- Commits and logs to workers/ralph/THUNK.md

### Safety Features

- **Verifier:** Runs after each BUILD, checks acceptance criteria
- **Hash Guards:** Protects critical files from modification
- **Completion Sentinel:** Outputs `:::COMPLETE:::` when all tasks done

### Failure Handling

If verifier fails:

1. Agent must fix issues before continuing
2. If protected file needs changes → create `SPEC_CHANGE_REQUEST.md` and stop
```

### Prevention

- **Max paragraph length: 6-8 lines** (roughly 3-4 sentences)
- **Use headings liberally** - every major topic gets one
- **Convert long sentences to bullet lists**
- **Add visual breaks:** blank lines, horizontal rules, code blocks

---

## Anti-Pattern 4: Outdated Examples (Stale Code)

### Problem

Documentation shows code patterns, commands, or APIs that no longer match current implementation. Readers copy broken examples and waste time debugging.

**Common Causes:**

- Code refactored without updating docs
- API changed without doc sync
- Examples hard-coded in docs (not extracted from tests)
- No "last updated" date on technical docs

### Detection

```bash
# Find examples with deprecated patterns
rg 'old_function_name|deprecated_api' docs/ skills/ --type md

# Check for date indicators
rg '\(Last updated:.*202[0-4]\)' docs/ --type md
```

### Bad Example

```bash
# Example from docs/BOOTSTRAPPING.md (outdated)
bash scripts/new-project.sh my-project

# But new-project.sh was refactored to require --type flag
```

**Problem:** Command will fail with "missing --type argument" error.

### Good Example

```bash
# Example from docs/BOOTSTRAPPING.md
bash scripts/new-project.sh --type ralph my-project

# Or show help to discover current flags:
bash scripts/new-project.sh --help
```

**Or reference source of truth:**

```markdown
See `bash scripts/new-project.sh --help` for current options.
```

### Prevention

- **Extract examples from passing tests** (guarantees they work)
- **Add "last reviewed" date to technical docs**
- **When refactoring, search for doc references:** `rg "function_name" docs/ skills/`
- **Mark version-specific examples:** "As of v2.1.0..."

### Automated Check

Partial - `validate_examples.py` catches syntax errors but not semantic staleness.

**Manual check:** Review docs when:

- Major API changes land
- Commands get new required flags
- File paths restructure

---

## Anti-Pattern 5: Missing "Why" (No Context or Rationale)

### Problem

Documentation explains "what" and "how" but omits "why" - the reasoning, trade-offs, or problem being solved. Readers cannot adapt guidance to new situations.

**Common Causes:**

- Writing for "current self" (already has context)
- Focusing on mechanical steps only
- Assuming "obviously good practice"
- Time pressure (skip explanations)

### Detection

**Manual review:**

- Rule/pattern stated without explanation → missing "why"
- "Do X, not Y" without trade-off discussion → missing context
- Step-by-step without problem statement → missing rationale

### Bad Example

```markdown
## Commit Message Format

Use: `<type>(<scope>): <summary>`

Types: feat, fix, docs, refactor, chore, test
```

**Problem:** Why this format? What problem does it solve?

### Good Example

```markdown
## Commit Message Format

**Format:** `<type>(<scope>): <summary>`

**Why this format:**

- **Type prefix** enables automated changelog generation (feat → Features, fix → Bug Fixes)
- **Scope** allows filtering by component (e.g., `git log --grep="^fix(ralph)"`)
- **Imperative mood** matches Git's own messages ("Merge branch...", "Revert commit...")

**Types:**

- `feat` - New feature (triggers minor version bump)
- `fix` - Bug fix (triggers patch version bump)
- `docs` - Documentation only (no version bump)
- `refactor` - Code change without behavior change
- `chore` - Maintenance (deps, config)
- `test` - Test additions/fixes

**Example:**

```bash
git commit -m "fix(ralph): prevent duplicate THUNK entries

- Add deduplication check before appending
- Prevents ID collisions on loop restart"
```

### Prevention

- **Start sections with problem statement:** "This prevents X", "Without this, Y happens"
- **Explain trade-offs:** "We chose A over B because..."
- **Link to related decisions:** See `DECISIONS.md` for architectural choices
- **Add "Common Pitfalls" or "When to Use" subsections**

---

## Anti-Pattern 6: Unclear Audience or Purpose

### Problem

Documentation doesn't specify who it's for (human vs agent, beginner vs expert) or what problem it solves. Readers cannot determine if it's relevant to them.

**Common Causes:**

- Writing for "everyone" (ends up for no one)
- Mixing tutorial and reference content
- No purpose statement at top
- Assuming reader knows the use case

### Detection

**Manual review:**

- No "Overview" or "Purpose" section → missing context
- Mix of basic and advanced without labels → unclear audience
- No examples of when to use → unclear purpose

### Bad Example

```markdown
# Cache Debugging

Use cache.sh functions. Check cache hits. Clear on staleness.

Functions:
- cache_get
- cache_set
- cache_clear
```

**Problem:** For humans or agents? When would I need this? What's a "cache hit"?

### Good Example

```markdown
# Cache Debugging

**Purpose:** Diagnose and fix cache behavior issues in Ralph loop

**Target Audience:** Human developers debugging Ralph, advanced agent troubleshooting

**When to Use:**

- Ralph returns stale data after code changes
- Cache files grow unexpectedly large
- Need to verify cache invalidation logic

## Quick Diagnosis

```bash
# Check cache hit rate (should be 60-80%)
bash workers/shared/cache.sh stats

# Clear cache if stale
bash workers/shared/cache.sh clear
```

## Functions Reference

```bash
cache_get <key>    # Retrieve value (returns "" if miss)
cache_set <key> <value> <ttl>  # Store with TTL in seconds
cache_clear [key]  # Clear specific key or entire cache
```

**See Also:**

- [CACHE_DESIGN.md](../../../docs/CACHE_DESIGN.md) - Architecture details
- [skills/domains/ralph/cache-debugging.md](../ralph/cache-debugging.md) - Advanced patterns

```bash
# End of example
```

### Prevention

- **Always add "Purpose" and "Target Audience" at top**
- **Include "When to Use" or "Use Cases" section**
- **Separate tutorial from reference** (or label sections clearly)
- **Add skill level indicators:** `[Beginner]`, `[Advanced]`

---

## Anti-Pattern 7: Inconsistent Terminology

### Problem

Same concept called by different names throughout documentation (e.g., "task" vs "todo" vs "action item"). Readers cannot tell if they're different things or just inconsistent writing.

**Common Causes:**

- Multiple authors without style guide
- Copy-paste from different sources
- Evolving terminology without global update
- Mixing domain-specific terms

### Detection

```bash
# Find potential inconsistencies
rg "todo|task|action" docs/ skills/ --type md | rg -i "completion|done" | head -20

# Check for term variations
rg "(implementation plan|impl plan|task list)" docs/ --type md
```

### Bad Example

```markdown
<!-- File: AGENTS.md -->
Pick the first action from the todo list...

<!-- File: PROMPT.md -->
Complete tasks from workers/IMPLEMENTATION_PLAN.md...

<!-- File: workers/ralph/THUNK.md -->
| ID | Task | Priority | Work Item | Date |
```

**Problem:** "action", "todo", "task", "work item" - are these the same?

### Good Example

```markdown
<!-- Establish terms in glossary or README -->

## Terminology

- **Task:** Single unit of work in workers/IMPLEMENTATION_PLAN.md (e.g., "16.3.3")
- **Subtask:** Hierarchical breakdown (e.g., "1.1.1", "1.1.2")
- **Completion:** Task marked `[x]` after verifier confirms success

<!-- Then use consistently -->

Pick the first unchecked **task** from workers/IMPLEMENTATION_PLAN.md.
Complete the **task** and mark it `[x]`.
Log **task** completion to workers/ralph/THUNK.md.
```

### Prevention

- **Create glossary/terminology section** in main README
- **Use find-replace for global term changes:** `rg "old_term" --files-with-matches | xargs sed -i 's/old_term/new_term/g'`
- **Add terminology to style guide** (if exists)
- **Review PR diffs for new term introductions**

---

## Summary Checklist

Before committing documentation:

- [ ] **Links verified** - All file paths and anchors exist
- [ ] **Examples complete** - Imports, variables, context included
- [ ] **Structure clear** - Headings, lists, no walls of text
- [ ] **Examples current** - Tested against latest code
- [ ] **Rationale explained** - "Why" provided, not just "what"
- [ ] **Audience stated** - Purpose and target reader identified
- [ ] **Terminology consistent** - Same concepts use same terms

## Related Anti-Patterns

- [markdown-anti-patterns.md](markdown-anti-patterns.md) - Formatting issues (MD codes)
- [ralph-anti-patterns.md](ralph-anti-patterns.md) - Ralph loop-specific mistakes
- [shell-anti-patterns.md](shell-anti-patterns.md) - Shell scripting pitfalls

## Tools

- `tools/validate_links.sh` - Broken link detection
- `tools/validate_examples.py` - Code example validation
- `markdownlint` - Formatting consistency
- `rg` (ripgrep) - Fast pattern searching

## See Also

- [code-review-patterns.md](../code-quality/code-review-patterns.md) - Manual review checklist
- [code-hygiene.md](../code-quality/code-hygiene.md) - General quality patterns
- [QUALITY_GATES.md](../../../docs/QUALITY_GATES.md) - Automated validation
