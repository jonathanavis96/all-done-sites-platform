# Fix ShellCheck Failures

## Goal

Systematically resolve ShellCheck warnings by identifying error codes, applying appropriate fixes from skill documentation, and verifying the resolution.

## When to Use

Use this playbook when:

- Verifier reports `Hygiene.Shellcheck.X` or `Lint.Shellcheck.*` failures
- Multiple SC2XXX errors are blocking a commit
- A new shell script needs validation before integration
- Pre-commit hooks fail with shellcheck warnings

## Prerequisites

Before starting, ensure you have:

- **Tools:** `shellcheck` installed and available in PATH
- **Files:** Shell scripts that need fixing (`.sh` files or executable scripts)
- **Permissions:** Write access to the repository
- **Knowledge:** Basic shell scripting concepts (variables, functions, exit codes)

## Steps

### Step 1: Identify All ShellCheck Errors

**Action:** Run shellcheck on the target file(s) to get a complete list of violations.

```bash
# Check a single file
shellcheck script.sh

# Check multiple files at once (more efficient)
shellcheck file1.sh file2.sh file3.sh

# Check all shell scripts in current directory
shellcheck *.sh

# Exclude specific rules if intentional (e.g., sourcing files)
shellcheck -e SC1091 script.sh
```

**Expected output:**

```text
In script.sh line 42:
local result=$(command)
      ^----^ SC2155: Declare and assign separately to avoid masking return values.

In script.sh line 67:
unused_var="value"
^--------^ SC2034: unused_var appears unused. Verify use (or export if used externally).
```

**Checkpoint:** ✓ You now have a complete list of SC error codes and line numbers

### Step 2: Group Errors by Type

**Action:** Categorize the errors to batch similar fixes together.

Common error groups:

- **SC2155** - Variable declaration with command substitution (masks exit codes)
- **SC2034** - Unused variables (dead code)
- **SC2086** - Unquoted variables (word splitting issues)
- **SC2162** - `read` without `-r` flag (backslash handling)
- **SC2002** - Useless use of `cat` (inefficient piping)
- **SC2046** - Unquoted command substitution
- **SC2006** - Deprecated backticks

**Decision Point:**

- If **5+ errors of same type**: Fix all instances together in one pass
- If **mixed error types**: Fix highest-severity first (SC2155, SC2086 > SC2034, SC2002)
- If **cross-file errors**: Batch by file for easier verification

### Step 3: Apply Fixes Using Skill Patterns

**Action:** For each error type, consult the appropriate skill and apply fixes.

#### SC2155: Masked Return Values

**Link to skill:** [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md) - See "SC2155: Separate Declaration from Assignment"

**Pattern:**

```bash
# WRONG - masks exit code
local result=$(command)

# CORRECT - split declaration and assignment
local result
result=$(command)
```

#### SC2034: Unused Variables

**Link to skill:** [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md) - See "SC2034: Unused Variables"

**Pattern:**

```bash
# Option 1: Remove if truly unused
# Delete: local unused_var="value"

# Option 2: Prefix with underscore if intentionally unused
local _reserved_var="value"

# Option 3: Use it somewhere in the code
echo "Value: $previously_unused_var"
```

#### SC2086: Unquoted Variables

**Link to skill:** [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md)

**Pattern:**

```bash
# WRONG - unquoted variable
rm $file_path

# CORRECT - quoted
rm "$file_path"
```

#### SC2162: Read Without -r

**Link to skill:** [Shell Common Pitfalls](../domains/languages/shell/common-pitfalls.md)

**Pattern:**

```bash
# WRONG - backslashes interpreted
while read line; do

# CORRECT - raw input
while read -r line; do
```

#### SC2002: Useless Cat

**Link to skill:** [Shell Common Pitfalls](../domains/languages/shell/common-pitfalls.md)

**Pattern:**

```bash
# WRONG - extra process
cat file.txt | grep pattern

# CORRECT - direct input
grep pattern file.txt

# Alternative with process substitution
while read -r line; do
    echo "$line"
done < file.txt
```

**Anti-pattern:** ❌ Don't fix errors without understanding them. ✅ Read the skill documentation for the specific SC code first.

### Step 4: Verify Fixes

**Action:** Re-run shellcheck to confirm all errors are resolved.

```bash
# Verify the fixed file(s)
shellcheck script.sh

# Expected output if successful:
# (no output = all checks passed)

# Or check multiple files
shellcheck file1.sh file2.sh file3.sh
```

**Checkpoint:** ✓ Shellcheck reports 0 errors on fixed files

**Additional verification:**

```bash
# Run the script to ensure functionality unchanged
bash script.sh --dry-run

# Check syntax explicitly
bash -n script.sh
```

### Step 5: Format and Commit

**Action:** Apply consistent formatting and commit with proper message.

```bash
# Optional: Apply shfmt formatting (only once, after all fixes)
shfmt -w -i 2 script.sh

# Stage and commit (single commit with all changes)
git add -A && git commit -m "fix(shell): resolve shellcheck warnings in script.sh

- SC2155: Split local variable declarations (lines 42, 67)
- SC2034: Remove unused variables (lines 89, 103)
- SC2162: Add -r flag to read commands (lines 125, 134)

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>
Brain-Repo: jonathanavis96/brain"
```

**Anti-pattern:** ❌ Don't make separate commits for "mark task complete" or "log to THUNK". ✅ Include workers/ralph/THUNK.md and workers/IMPLEMENTATION_PLAN.md updates in the same commit.

## Checkpoints

Use these to verify you're on track:

- [ ] **Identified all errors:** Shellcheck output captured with SC codes and line numbers
- [ ] **Grouped by type:** Similar errors batched for efficient fixing
- [ ] **Fixes applied:** Changes made using skill documentation patterns
- [ ] **Verification passed:** Shellcheck reports 0 errors
- [ ] **Committed properly:** Single commit with code + THUNK + PLAN updates

## Troubleshooting

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Fix doesn't resolve warning | Wrong error code identified or misread line number | Re-run shellcheck, verify exact SC code and line |
| New errors appear after fix | Introduced syntax error or broke shell logic | Revert change, re-read skill pattern, apply correctly |
| Shellcheck still fails with same SC code | Fixed wrong instance (multiple occurrences) | Run `shellcheck script.sh \| grep SC2XXX` to find all instances |
| Verifier shows error but shellcheck passes | File paths differ (workers/ralph/ vs templates/ralph/) | Check verifier output for exact file path being tested |
| Can't determine if variable is unused | Complex script with indirect usage | Search entire script for variable name: `grep -n "var_name" script.sh` |

## Related Skills

Core skills referenced by this playbook:

- [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md) - SC2155, SC2034, SC2086, quoting rules
- [Shell Common Pitfalls](../domains/languages/shell/common-pitfalls.md) - SC2002, SC2162, SC2046, useless use of cat
- [Shell Strict Mode](../domains/languages/shell/strict-mode.md) - SC2155 with pipefail, SC2181, SC2320
- [Shell Validation Patterns](../domains/languages/shell/validation-patterns.md) - Running shellcheck, excluding rules, CI integration
- [Code Hygiene](../domains/code-quality/code-hygiene.md) - Definition of Done checklist including shellcheck

## Related Playbooks

Other playbooks that connect to this workflow:

- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Use when verifier reports Hygiene.Shellcheck.* failures
- [Safe Template Sync](./safe-template-sync.md) - After fixing workers/ files, sync changes to templates/

## Notes

**Iteration efficiency:**

- Run shellcheck ONCE at start to get all errors
- Fix all instances of same SC code together (don't run shellcheck after each fix)
- Run shellcheck ONCE at end to verify all fixes
- Target: 3 shellcheck invocations per iteration (initial scan, verification, optional re-check)

**Batching rules:**

- **Same file, multiple errors:** Fix ALL errors in that file in one iteration
- **Same SC code, multiple files:** Fix ALL files with that SC code in one iteration
- **Example:** If 5 files have SC2162, fix all 5 files together

**When to escalate:**

- Shellcheck reports errors in protected files (loop.sh, verifier.sh, PROMPT.md with hash guards)
- Error requires architectural change (not just syntax fix)
- Unclear if "unused" variable is actually needed (consult human or check git history)

**Common shortcuts:**

```bash
# Find all SC2034 occurrences across repository
shellcheck **/*.sh 2>&1 | grep SC2034

# Count errors by type
shellcheck **/*.sh 2>&1 | grep -oP 'SC\d{4}' | sort | uniq -c | sort -rn

# Check only modified files (git)
git diff --name-only --diff-filter=AM | grep '\.sh$' | xargs shellcheck
```

---

**Last Updated:** 2026-01-25

**Covers:** SC2155, SC2034, SC2086, SC2162, SC2002, SC2046, SC2006, SC2001, shellcheck workflows, verifier integration
