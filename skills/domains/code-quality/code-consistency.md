# Code Consistency Patterns

> Best practices for maintaining consistency across codebases.

## Quick Reference

| Issue | Problem | Fix |
|-------|---------|-----|
| Duplicate logic | Functions diverge over time | Extract to shared module |
| Stale comments | Headers don't match behavior | Audit comments when changing code |
| Mixed terminology | "kb" and "skills" both used | Search-replace all references |
| Inconsistent parsing | archive() differs from extract() | Use same boundary detection |

## Documentation Accuracy

### Comment Headers Must Match Behavior

```bash
# ❌ Wrong - header claims "display-only" but script writes files
#!/usr/bin/env bash
# thunk_monitor.sh - Display-only THUNK viewer
#
# Read-only display of THUNK entries. Does not modify any files.

create_new_era() {
    echo "## Era: $1" >> workers/ralph/THUNK.md  # BUG: Modifies file!
}

# ✅ Right - header accurately describes behavior
#!/usr/bin/env bash
# thunk_monitor.sh - THUNK viewer and manager
#
# Displays THUNK entries. Press 'e' to create new era (modifies THUNK.md).
```text

### Usage Comments Must Match Script Name

```bash
# ❌ Wrong - stale script name
#!/usr/bin/env bash
# Usage: old_name.sh [options]
#        ^^^^^^^^^^ File is now new_name.sh!

# ✅ Right - current script name
#!/usr/bin/env bash
# Usage: new_name.sh [options]

# ✅ Better - dynamic (can't go stale)
#!/usr/bin/env bash
# Usage: $(basename "$0") [options]
```text

### Audit Comments When Changing Code

When modifying functionality:

1. **Read the file header** - does it still describe the script?
2. **Check function docstrings** - do they match new behavior?
3. **Update usage examples** - are they still valid?
4. **Review inline comments** - do they explain current logic?

## Terminology Consistency

### Migration Checklist

When renaming a concept (e.g., `kb/` → `skills/`):

```bash
# Find all occurrences
grep -r "kb/" --include="*.md" --include="*.sh" .
grep -r "knowledge base" --include="*.md" -i .
grep -r "KB" --include="*.md" .

# Files to check:
# - README.md, AGENTS.md, NEURONS.md, THOUGHTS.md
# - Help text in scripts (--help, usage())
# - Directory structure diagrams in docs
# - Template files that generate new projects
# - Error messages and user-facing strings
# - Variable names (consider renaming KB_PATH → SKILLS_PATH)
```text

### Consistency Verification Script

```bash
#!/usr/bin/env bash
# check_terminology.sh - Find inconsistent terminology

OLD_TERM="kb"
NEW_TERM="skills"

echo "=== Checking for stale '$OLD_TERM' references ==="

# Find in markdown
echo -e "\n## Markdown files:"
grep -rn "$OLD_TERM" --include="*.md" . | grep -v "\.git"

# Find in shell scripts
echo -e "\n## Shell scripts:"
grep -rn "$OLD_TERM" --include="*.sh" . | grep -v "\.git"

# Find in help text
echo -e "\n## Help/usage text:"
grep -rn "usage\|Usage\|USAGE" --include="*.sh" -A5 . | grep -i "$OLD_TERM"
```text

## Parsing Consistency

### Same Logic Across Related Functions

```bash
# ❌ Wrong - extract_tasks and archive_tasks use different boundary detection

extract_tasks() {
    # Uses ## headers as boundaries
    if [[ "$line" =~ ^##[[:space:]]+ ]]; then
        in_section=false
    fi
}

archive_tasks() {
    # Uses ### headers as boundaries - INCONSISTENT!
    if [[ "$line" =~ ^###[[:space:]]+ ]]; then
        in_section=false
    fi
}

# ✅ Right - extract boundary detection to shared function

is_section_boundary() {
    local line="$1"
    # Only ## headers end sections, not ### subsections
    [[ "$line" =~ ^##[[:space:]]+ ]] && [[ ! "$line" =~ Priority ]]
}

extract_tasks() {
    if is_section_boundary "$line"; then
        in_section=false
    fi
}

archive_tasks() {
    if is_section_boundary "$line"; then
        in_section=false
    fi
}
```text

### Cache Key Collisions

```bash
# ❌ Wrong - cache key doesn't include enough context
# Same description in different sections = collision!
local cache_key=$(echo -n "$task_desc" | md5sum | cut -d' ' -f1)

# ✅ Right - include section in cache key
local cache_key=$(echo -n "${section}:${task_desc}" | md5sum | cut -d' ' -f1)

# ✅ Better - include full context
local cache_key=$(printf '%s' "$section|$task_label|$task_desc" | md5sum | cut -d' ' -f1)
```text

## Format Consistency

### Date Formats

```bash
# ❌ Wrong - mixed formats across files
# workers/ralph/THUNK.md:    2026/01/20
# NEURONS.md:  20 Jan 2026
# THOUGHTS.md: January 20, 2026

# ✅ Right - consistent ISO 8601 everywhere
# All files:   2026-01-20

# Enforce in scripts:
DATE_FORMAT="%Y-%m-%d"
current_date=$(date +"$DATE_FORMAT")
```text

### Shebang Lines

```bash
# ❌ Wrong - inconsistent shebangs
#!/bin/bash           # Hardcoded path
#!/usr/bin/bash       # Different hardcoded path
#!/usr/bin/env sh     # Wrong shell

# ✅ Right - consistent portable shebang
#!/usr/bin/env bash   # All bash scripts
#!/usr/bin/env python3  # All Python scripts
```text

### Quoting Style

```bash
# ❌ Wrong - inconsistent quoting
echo $variable
echo "$variable"
echo "${variable}"

# ✅ Right - always quote, use ${} for clarity
echo "${variable}"
echo "${array[@]}"
```text

## Code Duplication

### Signs of Problematic Duplication

| Smell | Risk | Action |
|-------|------|--------|
| Same function in 2+ files | Fixes applied inconsistently | Extract to shared lib |
| Copy-paste with minor tweaks | Logic diverges over time | Parameterize and extract |
| 50+ lines identical | Maintenance nightmare | Must extract |
| Same bug fixed twice | Will happen again | Single source of truth |

### Extract to Shared Library

```bash
# lib/parsing.sh - Shared parsing utilities

# Prevent double-sourcing
[[ -n "${_PARSING_SH:-}" ]] && return
readonly _PARSING_SH=1

# Shared function used by multiple scripts
is_task_line() {
    local line="$1"
    [[ "$line" =~ ^[[:space:]]*-[[:space:]]*\[([ x?])\] ]]
}

is_section_header() {
    local line="$1"
    [[ "$line" =~ ^##[[:space:]]+ ]]
}

# ... other shared functions
```text

```bash
# current_ralph_tasks.sh
source "${SCRIPT_DIR}/lib/parsing.sh"

# thunk_ralph_tasks.sh  
source "${SCRIPT_DIR}/lib/parsing.sh"
```text

## Verification Checklist

Before committing changes:

- [ ] **Headers match behavior** - Script description is accurate
- [ ] **Usage is current** - Help text shows correct script name/options
- [ ] **Terminology consistent** - No old terms mixed with new
- [ ] **Parsing aligned** - Related functions use same logic
- [ ] **Formats uniform** - Dates, shebangs, quoting consistent
- [ ] **No diverged duplicates** - Shared code is actually shared

## Common Mistakes Summary

| Mistake | Problem | Fix |
|---------|---------|-----|
| "Display-only" but writes | Misleads users | Update header accurately |
| Old script name in usage | Confuses users | Match actual filename |
| "kb" and "skills" mixed | Inconsistent UX | Search-replace all |
| extract() vs archive() differ | Bugs in one, not other | Share boundary logic |
| Cache key too simple | Collisions across sections | Include full context |
| Mixed date formats | Hard to parse/sort | Use ISO 8601 everywhere |

## See Also

- **[Code Hygiene](code-hygiene.md)** - Definition of Done checklists and quality standards
- **[Markdown Patterns](markdown-patterns.md)** - Documentation consistency and linting rules
- **[Shell Common Pitfalls](../languages/shell/common-pitfalls.md)** - Code duplication and DRY principles
- **[Change Propagation](../ralph/change-propagation.md)** - Template sync and knowledge persistence
