# Bulk Edit Patterns

<!-- covers: find-and-replace, sed, batch-editing -->

Efficient patterns for making multiple changes to files.

## Problem: Excessive API Calls

Making 30+ individual `find_and_replace_code` calls to fix formatting issues is:

- **Slow**: Each call has network latency
- **Wasteful**: Burns tokens on repeated file reads
- **Fragile**: Earlier changes can invalidate later find strings
- **Expensive**: API rate limits and costs

## Solution: Use Tools First, Then Targeted Edits

### Rule: Auto-Fix Before Manual Fix

For markdown files, **always run the auto-fix script first**:

```bash
bash workers/ralph/fix-markdown.sh <file_or_directory>
```text

This handles ~40-60% of common issues automatically:

- MD009: Trailing spaces
- MD012: Multiple blank lines
- MD031: Blanks around fenced code blocks
- MD032: Blanks around lists
- MD047: File should end with newline

### Issues Requiring Manual Fixes

After running auto-fix, only these typically remain:

| Rule | Issue | Fix Pattern |
| ---- | ----- | ----------- |
| MD040 | Missing code fence language | Add `bash`, `python`, etc. after ``` |
| MD060 | Table spacing | Add spaces: `\| col \|` → `\| col \|` |
| MD024 | Duplicate headings | Make heading text unique |
| MD036 | Bold as heading | Convert `**Title**` to `#### Title` |

### Efficient Manual Fix Pattern

When manual fixes are needed, batch them efficiently:

```markdown
❌ BAD: 30 separate find_and_replace calls

✅ GOOD: 
1. Read file once with open_files
2. Identify ALL issues to fix
3. Make ONE comprehensive find_and_replace per logical section
   - Or use bash/sed for pattern-based fixes
```text

### Example: Fixing Multiple Tables

Instead of fixing each table cell individually:

```bash
# Fix all table spacing in one command
sed -i 's/|\([^|]*[^ |]\)|/| \1 |/g' file.md
```text

Or use a single find_and_replace that captures a whole table.

## Decision Tree

```text
Markdown lint errors?
├── Run: bash workers/ralph/fix-markdown.sh <path>
├── Check remaining errors
│   ├── 0 errors → Done!
│   ├── <5 errors → Individual find_and_replace OK
│   └── 5+ errors → Batch fixes (sed or section replacement)
```

## Verifier-First Workflow

**Auto-fix runs automatically** before every BUILD iteration in Ralph loop:

1. `fix-markdown.sh` - fixes ~40-60% of markdown issues
2. `pre-commit run --all-files` - fixes shell/python/yaml issues  
3. `verifier.sh` - checks current state

**You receive verifier output in context.** Focus ONLY on remaining `[WARN]` and `[FAIL]` items.

**If verifier shows all passing:** Skip lint tasks, work on feature tasks instead.

**Only these need manual fixes (not auto-fixable):**

| Rule | Fix |
| ---- | --- |
| MD040 | Add language after ``` (e.g., ```bash) |
| MD060 | Add spaces around table pipes |
| MD024 | Make duplicate headings unique |
| MD036 | Convert **bold** to #### heading |

**Anti-pattern:** Making 30+ individual `find_and_replace_code` calls - batch remaining fixes efficiently.text

## Anti-Patterns

### ❌ One Call Per Line

```text
find_and_replace: line 10
find_and_replace: line 11  
find_and_replace: line 12
... (28 more calls)
```text

### ❌ Ignoring Auto-Fix Tools

Manually fixing MD031/MD032 when `--fix` handles them automatically.

### ❌ Find Strings That Change

Earlier replacements invalidate later find strings, causing failures.

## See Also

- `workers/ralph/fix-markdown.sh` - Auto-fix script
- `skills/domains/code-quality/markdown-patterns.md` - Markdown conventions
- `.markdownlint.yaml` - Lint configuration
