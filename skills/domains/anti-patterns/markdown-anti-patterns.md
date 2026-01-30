# Markdown Anti-Patterns

## Purpose

This document catalogs common markdown formatting mistakes observed in the brain repository's lint history, providing detection patterns, impact analysis, and correct alternatives.

## Quick Reference

| Code | Anti-Pattern | Fix | Frequency |
|------|-------------|-----|-----------|
| MD040 | Code fence without language tag | Add `bash`, `python`, etc. after ` ``` ` | ⭐⭐⭐ Very Common |
| MD024 | Duplicate heading text | Make headings unique or use `siblings_only` | ⭐⭐⭐ Very Common |
| MD032 | Missing blank lines around lists | Add blank line before and after lists | ⭐⭐ Common |
| MD031 | Missing blank lines around code fences | Add blank line before and after fences | ⭐⭐ Common |
| MD036 | Bold text used as heading | Convert `**Title**` to `## Title` | ⭐⭐ Common |
| MD056 | Table column count mismatch | Ensure all rows have same column count | ⭐ Occasional |
| MD050 | Inconsistent strong style | Use `**bold**` consistently, not `__bold__` | ⭐ Occasional |
| MD025 | Multiple H1 headings | Use only one `#` heading per file | ⭐ Rare |

---

## Anti-Pattern 1: Code Fence Without Language (MD040)

### ❌ Bad Pattern

````markdown
```
# Example script
```

```
Some output text
```

```
{
  "key": "value"
}
```
````

### Problem Context

- **What breaks:** Syntax highlighting, auto-formatters, code validators
- **Why it happens:** Copy-paste from terminals, rushing documentation
- **Detection:** `markdownlint` reports "MD040/fenced-code-language"
- **Real-world impact:** Code examples become unreadable, users can't identify language

### ✅ Correct Pattern

```bash
# Example script
echo "Hello"
```

```text
Some output text
```

```json
{
  "key": "value"
}
```

### Quick Fix Template

```bash
# Find all bare fences
rg '^\`\`\`$' --type md

# Common language tags
bash      # Shell commands, scripts
python    # Python code
text      # Output, logs, plain text
json      # JSON data
yaml      # YAML configs
markdown  # Markdown examples
sql       # SQL queries
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Code fence rules (MD040)
- **[fix-markdown-lint.md](../../playbooks/fix-markdown-lint.md)** - Systematic lint fixing

---

## Anti-Pattern 2: Duplicate Heading Text (MD024)

### ❌ Bad Pattern

```markdown
## Examples

Code examples here...

## Examples

More examples here...

## Examples

Even more examples...
```

### Problem Context

- **What breaks:** Table of contents links, screen reader navigation, document structure
- **Why it happens:** Copy-paste section templates, lack of heading uniqueness awareness
- **Detection:** `markdownlint` reports "MD024/no-duplicate-heading"
- **Real-world impact:** Broken anchor links, confused navigation, accessibility issues

### ✅ Correct Pattern

```markdown
## Examples: Basic Usage

Code examples here...

## Examples: Advanced Scenarios

More examples here...

## Examples: Edge Cases

Even more examples...
```

### Configuration Option

If duplicates are only in different sections:

```json
{
  "MD024": { "siblings_only": true }
}
```

### Quick Fix Template

```bash
# Find duplicate headings
rg '^#{1,6} (.+)$' --only-matching FILE.md | sort | uniq -d

# Make them unique by adding context
## Examples          → ## Examples: Basic Usage
## Installation      → ## Installation: Prerequisites
## Usage             → ## Usage: Command Line
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Heading uniqueness (MD024)

---

## Anti-Pattern 3: Missing Blank Lines Around Lists (MD032)

### ❌ Bad Pattern

```markdown
Here are the steps:
- Step 1
- Step 2
- Step 3
And then you...
```

### Problem Context

- **What breaks:** Markdown parsers misinterpret list boundaries, incorrect rendering
- **Why it happens:** Inline editing, not understanding markdown whitespace rules
- **Detection:** `markdownlint` reports "MD032/blanks-around-lists"
- **Real-world impact:** Lists merge with paragraphs, broken formatting

### ✅ Correct Pattern

```markdown
Here are the steps:

- Step 1
- Step 2
- Step 3

And then you...
```

### Quick Fix Template

```bash
# Auto-fix with markdownlint-cli
markdownlint --fix FILE.md

# Manual pattern
# BEFORE list: blank line
# AFTER list: blank line
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - List spacing (MD032)

---

## Anti-Pattern 4: Missing Blank Lines Around Code Fences (MD031)

### ❌ Bad Pattern

````markdown
Run this command:
```bash
echo "hello"
```
The output should be...
````

### Problem Context

- **What breaks:** Markdown renderers may not detect fence boundaries correctly
- **Why it happens:** Inline code examples, tight spacing to save visual space
- **Detection:** `markdownlint` reports "MD031/blanks-around-fences"
- **Real-world impact:** Code blocks merge with text, broken syntax highlighting

### ✅ Correct Pattern

````markdown
Run this command:

```bash
echo "hello"
```

The output should be...
````

### Quick Fix Template

```bash
# Auto-fix with markdownlint-cli
markdownlint --fix FILE.md

# Manual pattern
# BEFORE fence: blank line
# AFTER fence: blank line
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Fence spacing (MD031)

---

## Anti-Pattern 5: Bold Text Used as Heading (MD036)

### ❌ Bad Pattern

```markdown
## Section

**Subsection Title**

Some content here...

**Another Subsection**

More content...
```

### Problem Context

- **What breaks:** Document structure, SEO, table of contents, screen readers
- **Why it happens:** Visual styling without semantic structure awareness
- **Detection:** `markdownlint` reports "MD036/no-emphasis-as-heading"
- **Real-world impact:** Broken document hierarchy, missing TOC entries, accessibility failure

### ✅ Correct Pattern

```markdown
## Section

### Subsection Title

Some content here...

### Another Subsection

More content...
```

### Quick Fix Template

```bash
# Find bold lines that look like headings
rg '^\*\*[A-Z][^*]+\*\*$' --type md

# Convert to proper headings
**Installation** → ### Installation
**Usage**        → ### Usage
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Proper heading usage (MD036)

---

## Anti-Pattern 6: Table Column Count Mismatch (MD056)

### ❌ Bad Pattern

```markdown
| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |
| X    | Y    |         <!-- Missing column -->
| P    | Q    | R    | S |  <!-- Extra column -->
```

### Problem Context

- **What breaks:** Table rendering, column alignment, data readability
- **Why it happens:** Manual table editing, copy-paste errors, row truncation
- **Detection:** `markdownlint` reports "MD056/table-column-count"
- **Real-world impact:** Broken table layout, misaligned data, rendering errors

### ✅ Correct Pattern

```markdown
| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |
| X    | Y    | Z    |
| P    | Q    | R    |
```

### Quick Fix Template

```bash
# Count columns in table rows
rg '\|' FILE.md | awk '{print NF-1}'

# Ensure consistent column count
# Header: 3 pipes (4 columns)
# Separator: 3 pipes
# All rows: 3 pipes
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Table formatting

---

## Anti-Pattern 7: Inconsistent Strong Style (MD050)

### ❌ Bad Pattern

```markdown
Use **this style** for most text.

But __this style__ occasionally.

And **sometimes** __mix__ them.
```

### Problem Context

- **What breaks:** Style consistency, automated formatters may conflict
- **Why it happens:** Copy-paste from different sources, multiple authors
- **Detection:** `markdownlint` reports "MD050/strong-style"
- **Real-world impact:** Visual inconsistency, formatter conflicts

### ✅ Correct Pattern

```markdown
Use **this style** consistently.

And **this style** everywhere.

Never **mix** styles.
```

### Quick Fix Template

```bash
# Find double underscore usage
rg '__[^_]+__' --type md

# Convert to asterisks
__bold__ → **bold**
```

### Configuration

```json
{
  "MD050": { "style": "asterisk" }
}
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Emphasis consistency (MD050)

---

## Anti-Pattern 8: Multiple H1 Headings (MD025)

### ❌ Bad Pattern

```markdown
# Document Title

Content here...

# Another Top-Level Heading

More content...
```

### Problem Context

- **What breaks:** SEO, document hierarchy, single-page structure
- **Why it happens:** Merging multiple documents, misunderstanding heading levels
- **Detection:** `markdownlint` reports "MD025/single-title/single-h1"
- **Real-world impact:** Broken document structure, SEO penalties, confused navigation

### ✅ Correct Pattern

```markdown
# Document Title

Content here...

## Section Heading

More content...
```

### Quick Fix Template

```bash
# Find all H1 headings
rg '^# [^#]' --type md FILE.md

# Keep first H1, convert others to H2
# First:     # Title
# Remaining: ## Section
```

### Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Heading hierarchy

---

## Detection Commands

```bash
# Run all markdown linters
markdownlint **/*.md

# Check specific rules
markdownlint -r MD040,MD024,MD032 FILE.md

# Auto-fix common issues (MD031, MD032)
markdownlint --fix FILE.md

# Find bare code fences
rg '^\`\`\`$' --type md

# Find duplicate headings
rg '^#{1,6} (.+)$' --only-matching FILE.md | sort | uniq -d

# Find bold-as-heading pattern
rg '^\*\*[A-Z][^*]+\*\*$' --type md
```

---

## Prevention Strategy

### Pre-Commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/igorshubovych/markdownlint-cli
    rev: v0.33.0
    hooks:
      - id: markdownlint
        args: ['--fix']
```

### Editor Integration

```bash
# VS Code: markdownlint extension
# Vim: ale + markdownlint
# Emacs: flycheck-markdownlint
```

### Documentation Templates

Use templates with correct formatting:

- Always include language tags in fences
- Start with blank line after headings
- End lists with blank line
- Use proper heading hierarchy

---

## Related Skills

- **[markdown-patterns.md](../code-quality/markdown-patterns.md)** - Core markdown formatting rules
- **[fix-markdown-lint.md](../../playbooks/fix-markdown-lint.md)** - Systematic approach to resolving lint issues
- **[bulk-edit-patterns.md](../code-quality/bulk-edit-patterns.md)** - Efficient multi-file fixes
- **[code-hygiene.md](../code-quality/code-hygiene.md)** - General code quality practices

---

## See Also

- **[Markdown Guide](https://www.markdownguide.org/)** - Official markdown specification
- **[markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)** - Complete rule reference
- **Brain Repository:** Markdown lint history in `git log --grep="MD0"`
