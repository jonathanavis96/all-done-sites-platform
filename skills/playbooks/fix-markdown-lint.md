# Fix Markdown Lint Failures

## Goal

Systematically resolve markdown linting issues in documentation files to ensure consistency, readability, and verifier compliance.

## When to Use

**Use this playbook when:**

- Verifier shows `Hygiene.Markdown.*` failures
- `markdownlint` reports errors when run manually
- You see MD-prefixed error codes (MD040, MD032, MD024, etc.)
- Pre-commit hooks fail on markdown files

**Symptoms:**

```text
[FAIL] Hygiene.Markdown.1 (MD040: missing fence language)
skills/README.md:45 MD032/blanks-around-lists Lists should be surrounded by blank lines
docs/SETUP.md:120 MD024/no-duplicate-heading Multiple headings with same content
```

## Prerequisites

- **Tools:**
  - `markdownlint-cli` installed (`npm install -g markdownlint-cli`)
  - `bash` (for auto-fix script)
- **Files:**
  - `.markdownlint.yaml` - Project linting configuration
  - `workers/ralph/fix-markdown.sh` - Auto-fix script
- **Knowledge:**
  - Basic markdown syntax
  - [Markdown Patterns](../domains/code-quality/markdown-patterns.md) skill

## Steps

### 1. Run Auto-Fix First (40-60% of issues)

**Action:** Use the auto-fix script to resolve common issues automatically.

```bash
# From repository root
bash workers/ralph/fix-markdown.sh .

# Or target specific file/directory
bash workers/ralph/fix-markdown.sh skills/
bash workers/ralph/fix-markdown.sh docs/SETUP.md
```

**What gets auto-fixed:**

- MD009: Trailing spaces
- MD010: Hard tabs
- MD012: Multiple consecutive blank lines
- MD031: Blanks around fenced code blocks
- MD032: Blanks around lists
- MD047: Files should end with a single newline

**Checkpoint:** Script outputs "Auto-fixed X issues" and shows remaining issues.

### 2. Identify Remaining Issues

**Action:** Parse the remaining errors by error code.

```bash
# Get full list of remaining issues
markdownlint . 2>&1 | grep "MD0"
```

**Common patterns:**

| Error Code | Description | Frequency |
|------------|-------------|-----------|
| MD040 | Missing fence language tag | HIGH |
| MD024 | Duplicate heading content | MEDIUM |
| MD036 | Emphasis instead of heading | LOW |
| MD060 | Table column style inconsistent | LOW |

**Decision Point:** If 10+ instances of same error → Consider bulk editing (see [Bulk Edit Patterns](../domains/code-quality/bulk-edit-patterns.md))

### 3. Fix MD040 (Missing Fence Language)

**Problem:** Code blocks missing language specifier.

**Wrong:**

````text
```
echo "hello"
```
````

**Right:**

````text
```bash
echo "hello"
```
````

**Common language tags:**

- `bash` - Shell commands
- `python` - Python code
- `javascript`, `typescript` - JS/TS code
- `json`, `yaml` - Config files
- `text` - Plain output, directory trees, logs
- `markdown` - Markdown examples

**Bulk fix command:**

```bash
# Find all files with bare fences
grep -rn "^\`\`\`$" skills/ docs/

# Manual edits required - no safe automated replacement
```

**Reference:** [Markdown Patterns - MD040](../domains/code-quality/markdown-patterns.md#md040-fenced-code-blocks-should-have-language)

### 4. Fix MD024 (Duplicate Headings)

**Problem:** Multiple headings with identical text confuse navigation.

**Wrong:**

```markdown
## Prerequisites
...
## Prerequisites  <!-- Duplicate! -->
```

**Right:**

```markdown
## Prerequisites - Setup
...
## Prerequisites - Validation
```

**Strategy:**

- Add context suffix (`- Setup`, `- Runtime`, `- Testing`)
- Rename to be more specific (`## Project Prerequisites` vs `## System Prerequisites`)
- Consider if sections should be merged

**Reference:** [Markdown Patterns - MD024](../domains/code-quality/markdown-patterns.md#md024-no-duplicate-headings)

### 5. Fix MD032 (Blanks Around Lists)

**Problem:** Lists must have blank lines before and after.

**Wrong:**

```markdown
Some text here
- List item 1
- List item 2
More text here
```

**Right:**

```markdown
Some text here

- List item 1
- List item 2

More text here
```

**Note:** Usually auto-fixed by `fix-markdown.sh`, but may require manual intervention if nested.

### 6. Fix MD036 (Emphasis vs Heading)

**Problem:** Bold text used instead of proper heading.

**Wrong:**

```markdown
**Section Title**

Content here...
```

**Right:**

```markdown
#### Section Title

Content here...
```

**Strategy:**

- Use `####` for minor section headings
- Use `**bold**` only for inline emphasis, not section titles

### 7. Fix MD060 (Table Column Style)

**Problem:** Table columns use compact style instead of expanded.

**Wrong:**

```markdown
|Column1|Column2|Column3|
|---|---|---|
|A|B|C|
```

**Right:**

```markdown
| Column1 | Column2 | Column3 |
|---------|---------|---------|
| A       | B       | C       |
```

**Note:** `.markdownlint.yaml` should configure this to "expanded" style.

**Reference:** [Markdown Patterns - MD060](../domains/code-quality/markdown-patterns.md#md060-table-column-style)

### 8. Verify Fixes

**Action:** Run markdownlint again to confirm all issues resolved.

```bash
# Verify all files
markdownlint .

# Should output nothing if all issues fixed
# Exit code 0 = success
echo $?
```

**Checkpoint:** Zero errors, exit code 0.

### 9. Commit Changes

**Action:** Commit with descriptive message indicating scope of fixes.

```bash
git add -A
git commit -m "docs(markdown): fix MD040/MD032/MD024 lint violations

- Added language tags to 15 code fences (MD040)
- Added blank lines around 8 lists (MD032)
- Renamed duplicate 'Prerequisites' headings (MD024)

All markdown files now pass markdownlint validation."
```

## Checkpoints

Verify progress at each stage:

- [ ] Auto-fix script completed successfully
- [ ] Remaining issues identified and categorized by error code
- [ ] All MD040 violations resolved (language tags added)
- [ ] All MD024 violations resolved (headings made unique)
- [ ] All MD032 violations resolved (blanks around lists)
- [ ] `markdownlint .` returns exit code 0
- [ ] Changes committed with descriptive message

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Auto-fix script not found | Wrong working directory | Run from repo root: `bash workers/ralph/fix-markdown.sh` |
| `markdownlint: command not found` | Tool not installed | Install: `npm install -g markdownlint-cli` |
| Same errors reappear after fix | `.markdownlint.yaml` mismatch | Check config file matches project standards |
| Too many MD040 errors (50+) | Missing batch fix | Use grep to find all, consider bulk editing patterns |
| Verifier still fails after fixes | Stale verifier cache | Wait for next verifier run or check for other file issues |

## Common Patterns

### Batch Finding MD040 Violations

```bash
# Find all markdown files with bare code fences
find . -name "*.md" -exec grep -l "^\`\`\`$" {} \;

# Show line numbers for context
grep -rn "^\`\`\`$" skills/ docs/ | head -20
```

### Quick Reference - Error Code Priority

**Fix in this order for maximum efficiency:**

1. **MD040** (missing fence language) - Most common, easiest to fix
2. **MD032** (blanks around lists) - Usually auto-fixed
3. **MD024** (duplicate headings) - Requires thought but straightforward
4. **MD036** (emphasis vs heading) - Rare, semantic fix
5. **MD060** (table style) - Rare, usually config issue

## Related Skills

- [Markdown Patterns](../domains/code-quality/markdown-patterns.md) - Full reference for all MD rules
- [Bulk Edit Patterns](../domains/code-quality/bulk-edit-patterns.md) - Efficient batch editing strategies
- [Code Consistency](../domains/code-quality/code-consistency.md) - Documentation accuracy and consistency
- [Code Hygiene](../domains/code-quality/code-hygiene.md) - General linting and formatting best practices

## Related Playbooks

- [Fix ShellCheck Failures](./fix-shellcheck-failures.md) - Similar workflow for shell scripts
- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Higher-level failure resolution workflow

## Design Notes

**Why auto-fix first:** Reduces manual work by 40-60%, reveals true scope of remaining issues.

**Why MD040 is most common:** Code examples often copied from terminals without language context.

**Why batch editing matters:** Fixing 50+ identical issues one-by-one wastes iterations - use grep patterns.
