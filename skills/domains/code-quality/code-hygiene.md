# Code Hygiene Skill

<!-- covers: dead-code, unused-imports, linting, formatting -->

## 🚨 Quick Reference (Check Before Completing Any Task!)

**Use this checklist before writing `:::BUILD_READY:::`**

| Check                    | Command/Action                                                   | What It Catches                 |
|--------------------------|------------------------------------------------------------------|---------------------------------|
| **Documentation Sync**   | `rg "function_name\|FeatureName" --include='*.md' -l`            | Stale docs after code changes   |
| **Comprehensive Search** | `rg "old_term" -n .` before AND after change                     | Incomplete renames/refactors    |
| **Dead Code Sweep**      | `rg "old_function\|OLD_VAR" --include='*.sh' --include='*.md' -n`| Unused code after removal       |
| **Template Sync**        | `diff file.sh templates/ralph/file.sh`                           | Template divergence             |
| **Markdown Validation**  | `grep -E '^#{1,3} ' file.md \| sort \| uniq -d`                  | Duplicate headings              |
| **Fence Language Tags**  | `grep -n '\`\`\`$' file.md`                                      | Missing code fence tags         |
| **Shellcheck**           | `shellcheck script.sh`                                           | SC2034, SC2155, SC2086          |
| **Status Consistency**   | `rg "Status:\|commits ahead" workers/IMPLEMENTATION_PLAN.md`             | Inconsistent status text        |

**Common Fixes:**

- Add fence tags: ` ```bash`, ` ```markdown`, ` ```text`
- Split declare/assign: `local var; var=$(cmd)`
- Remove unused vars or prefix with `_unused_`
- Update ALL docs in same commit as code change

---

## Purpose

Prevent recurring mistakes where Ralph fixes code but forgets related documentation, leaves dead code behind, or makes incomplete refactoring changes.

**Trigger:** Every BUILD iteration, before marking task complete.

---

## 1. Documentation Sync Protocol

**When:** Any bug fix, behavior change, or feature modification.

**Procedure:**

1. **Identify all docs that reference this behavior:**

   ```bash
   rg "function_name|FeatureName|behavior_keyword" --include='*.md' -l
   ```

2. **Required doc files to check:**
   - `AGENTS.md` - operational commands, hotkeys, features
   - `NEURONS.md` - codebase structure, file counts, paths
   - `README.md` - user-facing documentation
   - `PROMPT.md` - if it references the changed behavior
   - Inline comments in the modified code

3. **Update all in same commit** - never leave docs stale.

4. **Status consistency check:**
   - If you update overview/status in one place, grep for ALL status mentions:

     ```bash
     rg "Status:|Branch status:|commits ahead|up to date" workers/IMPLEMENTATION_PLAN.md
     ```

   - Update ALL occurrences to match.

---

## 2. Comprehensive Search Before Change

**When:** Renaming, changing terminology, updating paths, or refactoring patterns.

**Procedure:**

1. **Before making the change:**

   ```bash
   rg "old_term" -n .
   rg "old/path" -n .
   ```

2. **List ALL files that need updating.**

3. **Update ALL files in single commit.**

4. **After the change, verify no instances remain:**

   ```bash
   rg "old_term" -n . | grep -v "\\.git"
   ```

**Anti-pattern:** Fixing one file and assuming others are fine.

---

## 3. Dead Code Sweep

**When:** After removing or changing a feature, variable, or function.

**Procedure:**

1. **Grep for the old symbol across ALL files:**

   ```bash
   rg "old_function_name|OLD_VARIABLE" --include='*.sh' --include='*.md' -n
   ```

2. **Remove any:**
   - Unused variable declarations
   - Unused function definitions
   - Stale comments referencing removed code

3. **Run shellcheck on modified bash scripts:**

   ```bash
   shellcheck script.sh
   ```

4. **Common shellcheck issues to catch:**
   - SC2034: Variable set but never used
   - SC2155: `local var=$(cmd)` masks return value - split declaration
   - SC2086: Quote variable expansions

---

## 4. Template Sync Check

**When:** Any change to a file that has a corresponding template.

**Procedure:**

1. **Identify if file has a template:**
   - `loop.sh` ↔ `templates/ralph/loop.sh`
   - `current_ralph_tasks.sh` ↔ `templates/ralph/current_ralph_tasks.sh`
   - `thunk_ralph_tasks.sh` ↔ `templates/ralph/thunk_ralph_tasks.sh`
   - `PROMPT.md` ↔ `templates/ralph/PROMPT.md`

2. **If template exists, update BOTH files** (unless difference is intentional).

3. **Verify sync:**

   ```bash
   diff file.sh templates/ralph/file.sh
   ```

4. **If intentional divergence, document why in commit message.**

---

## 5. Markdown Validation

**When:** Any `.md` file is modified.

**Procedure:**

1. **Check for broken tables:**
   - Ensure all rows have same number of `|` separators
   - No rows split across multiple lines

2. **Check for duplicate headings:**

   ```bash
   grep -E '^#{1,3} ' file.md | sort | uniq -d
   ```

3. **Check for missing fence language tags:**

   ```bash
   grep -n '```$' file.md  # Should show only closing fences
   ```

4. **Fix common issues:**
   - Add language tags: ` ```bash`, ` ```markdown`, ` ```text`
   - Use `#### Heading` instead of `**Heading:**` for structure
   - Hyphenate compound adjectives: "LOW-priority" not "LOW priority"

---

## 6. Pre-Completion Checklist

**Before writing `:::BUILD_READY:::`:**

- [ ] Ran repo-wide search for changed terminology/paths/symbols
- [ ] Updated ALL documentation that references changed behavior
- [ ] Removed dead code introduced then abandoned
- [ ] Template synced (if applicable)
- [ ] Markdown validates (tables, headings, fences)
- [ ] Status text consistent across all mentions
- [ ] shellcheck passes on modified `.sh` files

---

## Common Anti-Patterns to Avoid

| Anti-Pattern                                 | Correct Approach                       |
|----------------------------------------------|----------------------------------------|
| Fix bug, leave docs stale                    | Update docs in same commit             |
| Rename in one file                           | `rg` for all occurrences first         |
| Add variable, remove feature, leave variable | Grep for symbol after removal          |
| Update overview, forget Phase summary        | Search for ALL status text             |
| Change main file, forget template            | Check templates/ for counterpart       |
| Add code block without language tag          | Always specify: bash, markdown, text   |

---

## Automated Gates

These checks are enforced by `verifier.sh` via `rules/AC.rules`:

| Gate                   | What it catches                          |
|------------------------|------------------------------------------|
| `Hygiene.Shellcheck`   | Unused vars, SC2155 issues               |
| `Hygiene.TermSync`     | Stale kb/ references after skills migration |
| `Hygiene.DocSync`      | Code changed but docs unchanged          |
| `Hygiene.TemplateSync` | Main file differs from template          |
| `Hygiene.Markdown`     | Broken tables, duplicate headings        |

If a gate fails, fix the issue before proceeding.

---

## See Also

- **[Ralph Patterns](../ralph/ralph-patterns.md)** - Ralph-specific workflows and troubleshooting
- **[Markdown Patterns](markdown-patterns.md)** - Markdown linting rules and fixes
- **[Code Consistency](code-consistency.md)** - Documentation accuracy and terminology sync
- **[Testing Patterns](testing-patterns.md)** - Test quality and coverage standards
- **[Token Efficiency](token-efficiency.md)** - Optimize tool calls and iteration speed
- **[Bulk Edit Patterns](bulk-edit-patterns.md)** - Efficient multi-file editing strategies
