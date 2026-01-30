# Resolve Verifier Failures

## Goal

Systematically diagnose and resolve verifier failures by reading the injected verifier status, categorizing the failure type, and routing to the appropriate fix workflow or escalation path.

## When to Use

Use this playbook when:

- Header shows `# LAST_VERIFIER_RESULT: FAIL`
- Verifier status section shows `[FAIL]` lines
- BUILD iteration blocked by acceptance criteria failures
- Need to understand which failures require human intervention vs code fixes

## Prerequisites

Before starting, ensure you have:

- **Context:** Verifier status already injected in prompt header (DO NOT read `.verify/latest.txt`)
- **Files:** `rules/AC.rules` (acceptance criteria definitions)
- **Permissions:** Write access to fix non-protected files
- **Knowledge:** Understanding of verifier rule categories (Protected, Hygiene, AntiCheat, etc.)

## Steps

### Step 1: Read Injected Verifier Status

**Action:** Check the `# VERIFIER STATUS` section at the top of your prompt.

- Look for `# LAST_VERIFIER_RESULT: FAIL` or `WARN` in header
- Scan the `# Issues requiring attention:` section for `[FAIL]` entries
- Note the `# Details for failed checks:` section with specific error messages
- **DO NOT** run commands to read `.verify/latest.txt` - it's already in your context

**Example output:**

```text
# LAST_VERIFIER_RESULT: FAIL

# Issues requiring attention:
[FAIL] Hygiene.Shellcheck.2 (SC2155: declare and assign separately)
[FAIL] Hygiene.Markdown.1 (MD040: code fence missing language tag)
[WARN] Protected.1 (protected file changed - human review required)

# Details for failed checks:
Hygiene.Shellcheck.2: current_ralph_tasks.sh:42:11: warning: Declare and assign separately...
Hygiene.Markdown.1: skills/README.md:15 MD040/fenced-code-language...
```

**Checkpoint:** ✓ You have identified all failing rule IDs and their descriptions

### Step 2: Categorize Failure Type

**Action:** Determine the category of each failure to route to correct resolution path.

**Decision Tree:**

| Rule Pattern | Category | Resolution Path |
| ------------ | -------- | --------------- |
| `Protected.X` | Hash guard failure | **STOP** - Go to Step 3a (Human Required) |
| `Hygiene.Shellcheck.X` | ShellCheck violations | Go to Step 3b (ShellCheck Fix) |
| `Hygiene.Markdown.X` | Markdown lint issues | Go to Step 3c (Markdown Fix) |
| `Hygiene.TemplateSync.X` | Template out of sync | Go to Step 3d (Template Sync) |
| `AntiCheat.X` | Forbidden markers | Go to Step 3e (Remove Markers) |
| `Lint.X` | Linting issues | Go to Step 3b or 3c based on tool |
| `freshness_check`, `init_baselines` | Infrastructure | **STOP** - Go to Step 3a (Human Required) |

**Checkpoint:** ✓ Each failure is categorized with a clear resolution path

### Step 3a: Protected File Warnings (Human Review)

**Action:** If you see `Protected.X` warnings, acknowledge and continue.

- **YOU CANNOT FIX THESE** - Protected files are hash-guarded
- `.verify/*.sha256` files are human-only
- These are warnings, not blockers - continue with normal tasks

**What to do:**

1. Note the warning in your output
2. Continue with other planned tasks
3. Human will review the changes and regenerate hashes if intentional

**Anti-pattern:** ❌ Don't try to read/modify `.verify/*.sha256` files or "fix" the protected file to match baseline.

**Link to skill:** [Code Consistency](../domains/code-quality/code-consistency.md) - Protected file policy

### Step 3b: ShellCheck Failures

**Action:** Fix shell script issues by identifying SC codes and applying corrections.

**Quick reference:**

- `SC2034`: Unused variable - Remove or prefix with `_` if intentional
- `SC2155`: Declare and assign separately to avoid masking return values
- `SC2086`: Quote variables to prevent word splitting
- `SC2162`: Add `-r` flag to `read` commands
- `SC2002`: Useless cat - use `<` redirection instead

**Process:**

1. Note the SC code and file from verifier output
2. Open [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md) for SC2034, SC2155, SC2086
3. Open [Shell Common Pitfalls](../domains/languages/shell/common-pitfalls.md) for SC2162, SC2002
4. Apply the minimum fix from the skill document
5. Re-run shellcheck to verify: `shellcheck -e SC1091 path/to/file.sh`

**Link to playbook:** [Fix ShellCheck Failures](./fix-shellcheck-failures.md) - Full detailed workflow

**Checkpoint:** ✓ All SC codes resolved, shellcheck returns 0

### Step 3c: Markdown Failures

**Action:** Fix markdown lint issues by identifying MD codes and correcting formatting.

**Quick reference:**

- `MD040`: Add language tag after ` ``` ` (use `bash`, `python`, `text`, etc.)
- `MD032`: Add blank lines before and after lists
- `MD024`: Make duplicate headings unique
- `MD050`: Ensure consistent link style

**Process:**

1. Note the MD code and file/line from verifier output
2. Open [Markdown Patterns](../domains/code-quality/markdown-patterns.md) for details
3. Apply fix directly (these are usually formatting issues)
4. Re-run markdownlint to verify: `markdownlint path/to/file.md`

**Auto-fix option:** Many markdown issues are auto-fixable:

```bash
bash workers/ralph/fix-markdown.sh
```

**Link to playbook:** [Fix Markdown Lint](./fix-markdown-lint.md) - Full detailed workflow

**Checkpoint:** ✓ All MD codes resolved, markdownlint returns 0

### Step 3d: Template Sync Failures

**Action:** Determine if template drift is intentional or needs synchronization.

**Decision Point:** Is this file brain-specific or should it match the template?

**Brain-specific files (intentional drift - document, don't sync):**

- `workers/ralph/loop.sh` - Has verifier integration, auto-fix, Cortex sync
- `workers/ralph/verifier.sh` - Brain-specific checks
- `workers/ralph/current_ralph_tasks.sh` - Phase-aware section detection

**Template files (should sync):**

- Monitor scripts (`thunk_ralph_tasks.sh`)
- Utility scripts without brain-specific logic
- New project scaffolding

**If intentional drift:**

1. Request waiver via `.verify/request_waiver.sh`
2. Provide clear reason explaining brain-specific features

**If should sync:**

1. Copy from `workers/ralph/file.sh` to `templates/ralph/file.sh`
2. Verify with diff: `diff -u templates/ralph/file.sh workers/ralph/file.sh`
3. Run shellcheck on both versions

**Link to skill:** [Change Propagation](../domains/ralph/change-propagation.md) - Template sync policy

**Checkpoint:** ✓ Template drift resolved or documented with waiver

### Step 3e: AntiCheat Failures

**Action:** Remove forbidden patterns or markers from code.

**Common AntiCheat triggers:**

- `AntiCheat.1`: `:::COMPLETE:::` marker (reserved for loop.sh only)
- `AntiCheat.2`: Reading `.verify/latest.txt` directly (use injected header)
- `AntiCheat.3`: Attempting to modify `.verify/*.sha256` files
- `AntiCheat.4`: Output text that mimics verifier output format

**Process:**

1. Identify the forbidden pattern from verifier output
2. Search your code for the exact phrase/marker
3. Remove or replace with allowed alternative
4. Verify removal with grep: `grep -n "forbidden-pattern" file.sh`

**Example:**

```bash
# ❌ WRONG: Reserved for loop.sh
echo ":::COMPLETE:::"

# ✅ CORRECT: Use appropriate sentinel
echo ":::BUILD_READY:::"
```

**Checkpoint:** ✓ All forbidden patterns removed, AntiCheat checks pass

### Step 4: Verify Fix

**Action:** Confirm your fixes resolved the failures.

**Command:** The verifier runs automatically after your BUILD iteration completes. You'll see results in the next iteration's header.

**For immediate feedback during development:**

```bash
# Run specific checks manually (if needed during complex fixes)
shellcheck -e SC1091 path/to/file.sh
markdownlint path/to/file.md
```

**Expected result:** Commands return exit code 0 (no errors)

**Checkpoint:** ✓ Manual verification shows fixes are correct

### Step 5: Commit Fix

**Action:** Commit your changes with appropriate message format.

**Commit message format:**

```bash
git add -A && git commit -m "fix(ralph): resolve AC failure <RULE_ID>

- Fixed SC2155 in current_ralph_tasks.sh: split declare/assign
- Fixed MD040 in skills/README.md: added bash language tags

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>
Brain-Repo: ${BRAIN_REPO:-jonathanavis96/brain}"
```

**Then output:**

```bash
echo ":::BUILD_READY:::"
```

**Important:** Do NOT push commits - Ralph loop handles pushing in PLAN mode.

**Checkpoint:** ✓ Changes committed with proper message, BUILD_READY emitted

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Checkpoint 1:** Read verifier status from injected header (not file)
- [ ] **Checkpoint 2:** All failures categorized by rule pattern
- [ ] **Checkpoint 3:** Protected file failures identified (STOP if found)
- [ ] **Checkpoint 4:** Fixes applied based on failure category
- [ ] **Checkpoint 5:** Manual verification confirms fixes work
- [ ] **Checkpoint 6:** Changes committed with correct format
- [ ] **Checkpoint 7:** BUILD_READY emitted (no push)

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| "Can't find verifier output" | Trying to read file instead of header | Check `# VERIFIER STATUS` section at top of prompt |
| "Fix doesn't resolve failure" | Wrong rule ID or incomplete fix | Re-read verifier details, ensure exact SC/MD code matches |
| "Protected file won't fix" | Hash guard blocking changes | STOP - output HUMAN REQUIRED message, don't attempt fix |
| "Multiple related failures" | Same issue across multiple files | Fix all instances in ONE iteration (batch same-type fixes) |
| "Verifier still failing" | Didn't commit fix properly | Ensure git add + commit completed before BUILD_READY |
| "Don't know which skill to use" | Unfamiliar error code | Check [Skills Summary](../SUMMARY.md) → Error Quick Reference |

## Related Skills

Core skills referenced by this playbook:

- [Code Consistency](../domains/code-quality/code-consistency.md) - Protected files, template sync, terminology
- [Shell Variable Patterns](../domains/languages/shell/variable-patterns.md) - SC2034, SC2155, SC2086 fixes
- [Shell Common Pitfalls](../domains/languages/shell/common-pitfalls.md) - SC2162, SC2002, SC2126 fixes
- [Markdown Patterns](../domains/code-quality/markdown-patterns.md) - MD040, MD032, MD024 fixes
- [Change Propagation](../domains/ralph/change-propagation.md) - Template sync policy and waiver protocol
- [Code Hygiene](../domains/code-quality/code-hygiene.md) - Definition of Done checklist

## Related Playbooks

Other playbooks that connect to this workflow:

- [Fix ShellCheck Failures](./fix-shellcheck-failures.md) - Detailed SC code resolution
- [Fix Markdown Lint](./fix-markdown-lint.md) - Detailed MD code resolution
- [Safe Template Sync](./safe-template-sync.md) - Template synchronization workflow (when Phase 8.3 complete)

## Notes

**Iteration efficiency:**

- Read verifier status ONCE from header (never read the file)
- Batch same-type fixes in one iteration (e.g., 3 SC2162 fixes in different files)
- Use auto-fix first (`fix-markdown.sh`) before manual fixes
- Don't re-run same command hoping for different results

**Common variations:**

- Single failure: Simple fix → commit → done
- Multiple failures same file: Batch all fixes → single commit
- Multiple failures different files, same type: Batch all → single commit
- Protected + code failures: Report protected, move to next unrelated task

**When to escalate:**

- ANY `Protected.X` failure → HUMAN REQUIRED
- `freshness_check` or `init_baselines` failure → HUMAN REQUIRED
- Waiver needed for intentional violations → Request waiver, don't modify code
- Can't understand failure after consulting skills → Output details, request human review

**Warning priorities:**

- `[WARN]` with `(manual review)` tag → Ignore (human testing required)
- `[WARN]` with `(auto check failed)` tag → Fix like `[FAIL]` (real issues)
- Always add warnings to "## Phase 0-Warn: Verifier Warnings" section first

---

**Last Updated:** 2026-01-25

**Covers:** All verifier rule categories (Protected, Hygiene, AntiCheat, Lint), shellcheck codes, markdown lint codes, template sync, waiver protocol
