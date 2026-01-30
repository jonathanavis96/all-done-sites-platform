# Markdown Patterns

<!-- covers: MD040, MD032, MD024, MD050, MD022, MD036, MD025, MD060 -->

> Best practices for writing consistent, lint-free markdown documentation.

## Quick Reference - Common Lint Rules

| Rule | Issue | Fix |
|------|-------|-----|
| MD040 | Code fence without language | Add ` ```bash ` not just ` ``` ` |
| MD024 | Duplicate headings | Rename to be unique |
| MD036 | Emphasis as heading | Use `## Heading` not `**Heading**` |
| MD050 | Inconsistent strong style | Pick `**` or `__` and stick to it |
| MD009 | Trailing spaces | Remove trailing whitespace |
| MD047 | No trailing newline | End file with single newline |

## Code Fences (MD040)

Always specify a language for syntax highlighting and accessibility.

```markdown
❌ Wrong - no language specified
​```
echo "hello"
​```

✅ Right - language specified
​```bash
echo "hello"
​```
```text

### Common Language Tags

| Content | Tag |
|---------|-----|
| Shell/Bash | `bash` or `shell` |
| Python | `python` |
| JavaScript | `javascript` or `js` |
| TypeScript | `typescript` or `ts` |
| JSON | `json` |
| YAML | `yaml` |
| Markdown | `markdown` |
| Plain text | `text` |
| Diff output | `diff` |

## Headings

### No Duplicate Headings (MD024)

```markdown
❌ Wrong - duplicate heading
## Configuration
... content ...
## Configuration
... more content ...

✅ Right - unique headings
## Configuration
... content ...
## Advanced Configuration
... more content ...
```text

### Heading Hierarchy (MD001)

```markdown
❌ Wrong - skipped level
# Title
### Subsection (skipped h2!)

✅ Right - proper hierarchy
# Title
## Section
### Subsection
```text

### Don't Use Emphasis as Headings (MD036)

```markdown
❌ Wrong - bold text pretending to be heading
**This looks like a heading**

Some content under it.

✅ Right - actual heading
## This Is a Heading

Some content under it.
```text

## Emphasis Consistency (MD049/MD050)

Pick one style and use it consistently throughout the file.

```markdown
❌ Wrong - mixed styles
This is **bold** and this is __also bold__.
This is *italic* and this is _also italic_.

✅ Right - consistent style (asterisks)
This is **bold** and this is **also bold**.
This is *italic* and this is *also italic*.
```text

## Lists

### Blank Lines Around Lists (MD032)

```markdown
❌ Wrong - no blank lines
Some text.
- Item 1
- Item 2
More text.

✅ Right - blank lines around
Some text.

- Item 1
- Item 2

More text.
```text

### Consistent List Markers (MD004)

```markdown
❌ Wrong - mixed markers
* Item 1
- Item 2
+ Item 3

✅ Right - consistent markers
- Item 1
- Item 2
- Item 3
```text

## Code Blocks

### Blank Lines Around Fences (MD031)

```markdown
❌ Wrong - no blank lines
Some text.
​```bash
echo "hello"
​```
More text.

✅ Right - blank lines around
Some text.

​```bash
echo "hello"
​```

More text.
```text

### No Spaces in Code Spans (MD038)

```markdown
❌ Wrong - spaces inside backticks
Use the ` config.yml ` file.
Run ` npm install `.

✅ Right - no extra spaces
Use the `config.yml` file.
Run `npm install`.
```text

## Links

### No Bare URLs (MD034)

```markdown
❌ Wrong - bare URL
Check out https://example.com for more info.

✅ Right - proper link
Check out [example.com](https://example.com) for more info.
```text

### No Empty Links (MD042)

```markdown
❌ Wrong - empty link text or URL
[](https://example.com)
[Click here]()

✅ Right - complete link
[Example Site](https://example.com)
```text

## Documentation Accuracy

### Comment Headers Must Match Behavior

```bash
# ❌ Wrong - header claims "display-only" but script writes files
#!/usr/bin/env bash
# display-only.sh - Read-only display of tasks
# 
# This script only displays information, never modifies files.

modify_file() {  # BUG: Contradicts header!
    echo "data" >> file.txt
}

# ✅ Right - header accurately describes behavior
#!/usr/bin/env bash
# task-manager.sh - Display and manage tasks
#
# This script displays tasks and can modify workers/ralph/THUNK.md via hotkeys.
```text

### Usage Comments Must Be Current

```bash
# ❌ Wrong - outdated script name in usage
#!/usr/bin/env bash
# Usage: old_script_name.sh [options]  # File is now new_name.sh!

# ✅ Right - matches actual filename
#!/usr/bin/env bash
# Usage: new_name.sh [options]
```text

## Terminology Consistency

When renaming concepts (e.g., `kb/` → `skills/`), update ALL references:

### Checklist for Term Migration

- [ ] Documentation files (README, AGENTS, NEURONS, etc.)
- [ ] Code comments and docstrings
- [ ] Help text and usage strings
- [ ] Directory structure descriptions
- [ ] Template files
- [ ] Error messages
- [ ] Variable names (if applicable)

### Search Pattern

```bash
# Find all remaining references to old term
grep -r "kb/" --include="*.md" --include="*.sh"
grep -r "knowledge base" --include="*.md" -i
```text

## Running Markdownlint

```bash
# Install
npm install -g markdownlint-cli

# Lint single file
markdownlint README.md

# Lint all markdown files
markdownlint "**/*.md"

# Fix auto-fixable issues
markdownlint --fix "**/*.md"

# Ignore specific rules
markdownlint -d MD013 "**/*.md"  # Ignore line length
```text

### Configuration File (.markdownlint.json)

```json
{
  "MD013": false,
  "MD033": false,
  "MD041": false,
  "MD024": { "siblings_only": true }
}
```text

## Common Mistakes Summary

| Mistake | Problem | Fix |
|---------|---------|-----|
| ` ``` ` without language | No syntax highlighting | Add ` ```bash ` etc. |
| `**Heading**` | Not a real heading | Use `## Heading` |
| Duplicate `## Setup` | Confuses navigation | Make headings unique |
| Mixed `**` and `__` | Inconsistent style | Pick one style |
| Stale usage comment | Misleads users | Keep comments current |
| Old terminology | Confuses readers | Update all references |

## Agent-Specific Patterns

### Cortex Writing Task Contracts

**Context:** When writing task contracts in workers/IMPLEMENTATION_PLAN.md, code fences are used to show example outputs, implementation snippets, and expected formats.

**Common mistake:** Forgetting language tags when focused on task structure

```markdown
❌ Wrong - bare code fence in task implementation
- [ ] **1.2** Add summary function
  - **Implementation:**
    - Output format:
      ```
      **Iteration 1 (BUILD)**
      Summary: ...
      ```

✅ Right - language tag specified
- [ ] **1.2** Add summary function
  - **Implementation:**
    - Output format:
      ```text
      **Iteration 1 (BUILD)**
      Summary: ...
      ```
```

**Decision tree for language tags:**

1. **Is it executable code?**
   - Shell/bash script → `bash`
   - Python code → `python`
   - JavaScript → `javascript`
   - JSON → `json`
   - YAML → `yaml`

2. **Is it example output or text?**
   - Log output → `text`
   - Error messages → `text`
   - Command output → `text`
   - Mixed/formatted text → `text`

3. **Not sure?**
   - Default to `text` (safe choice)

**Pre-commit checklist for workers/IMPLEMENTATION_PLAN.md:**

- [ ] Every ` ``` ` has a language tag
- [ ] Example outputs use `text` tag
- [ ] Code snippets use appropriate language tag
- [ ] Blank lines before/after code blocks
- [ ] Run `markdownlint workers/workers/IMPLEMENTATION_PLAN.md` before committing

**Prevention strategy:**

1. Add to CRITICAL 8 checklist: "Did I add language tags to ALL code fences?"
2. Use pre-commit hook: `cortex/docs/pre-commit-hook-markdown.sh`
3. Remember: Example output = `text` tag (most common case)

## Related Playbooks

- **[Fix Markdown Lint](../../playbooks/fix-markdown-lint.md)** - Systematic approach to resolving MD040, MD024, MD032, MD060, and other markdown linting issues

## See Also

- **[Code Hygiene](code-hygiene.md)** - Definition of Done checklist and quality gates
- **[Code Consistency](code-consistency.md)** - Documentation accuracy and terminology sync
- **[Bulk Edit Patterns](bulk-edit-patterns.md)** - Efficient markdown auto-fix strategies
- **[Shell Common Pitfalls](../languages/shell/common-pitfalls.md)** - Shell script documentation patterns
