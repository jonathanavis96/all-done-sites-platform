# Safe Template Sync

## Goal

Systematically synchronize changes between `workers/ralph/` (working implementation) and `templates/ralph/` (project scaffolding templates) while preserving intentional brain-specific enhancements and avoiding false sync conflicts.

## When to Use

Symptoms or scenarios that indicate you should use this playbook:

- **Verifier reports:** `Template.1`, `Hygiene.TemplateSync.1`, or `Hygiene.TemplateSync.2` warnings/failures
- **After fixing bugs** in `workers/ralph/` that should propagate to new projects
- **After adding features** to `workers/ralph/` that are generally useful (not brain-specific)
- **During code review:** Reviewer asks "Should this change sync to templates?"

## Prerequisites

Before starting, ensure you have:

- **Tools:** `diff`, `git`, `shellcheck` (for shell scripts), `markdownlint` (for docs)
- **Files:** Both `workers/ralph/<file>` and `templates/ralph/<file>` must exist
- **Permissions:** Write access to brain repository
- **Knowledge:** Understanding of brain repository vs new project differences (see `templates/ralph/README.md`)

## Steps

### Step 1: Identify Drift

**Action:** Determine which file(s) have diverged between workers/ and templates/.

**Run verifier to see sync warnings:**

```bash
# Verifier status is injected in header - check for Template.X or Hygiene.TemplateSync.X warnings
# Or run manually from workers/ralph/
bash verifier.sh
```

**Or manually check specific files:**

```bash
# From brain repository root
diff workers/ralph/current_ralph_tasks.sh templates/ralph/current_ralph_tasks.sh
diff workers/ralph/loop.sh templates/ralph/loop.sh
```

**Decision Point:**

- **If diff shows no differences** → Verifier false positive → Request waiver (skip to Step 5)
- **If diff shows differences** → Continue to Step 2

**Link to skill:** [Change Propagation](../domains/ralph/change-propagation.md) - Template sync patterns

### Step 2: Categorize the Drift

**Action:** Determine if the drift is intentional (brain-specific) or should be synced.

**Consult the sync policy:**

Open `templates/ralph/README.md` and check the **Template Sync Policy** section.

**Files that SHOULD sync** (copy workers → templates):

- `verifier.sh` - Core verification logic
- `current_ralph_tasks.sh` - Monitor display (minor differences allowed)
- `thunk_ralph_tasks.sh` - Monitor display
- `sync_workers_plan_to_cortex.sh` - Plan copy (workers → cortex)
- `pr-batch.sh` - PR automation
- `init_verifier_baselines.sh` - Baseline initialization

**Files that INTENTIONALLY differ** (brain-specific features):

- `loop.sh` - Brain has cache integration, verifier injection, auto-fix, Cortex sync
- `current_ralph_tasks.sh` - Brain has Phase-aware section detection (`## Phase X:` patterns)

**Decision Point:**

- **If file SHOULD sync and changes are bug fixes/general improvements** → Continue to Step 3 (sync)
- **If file INTENTIONALLY differs** → Go to Step 4 (document or request waiver)
- **If unsure** → Check recent workers/ralph/THUNK.md entries or ask: "Does this change depend on brain repo structure?"

**Checkpoint:** ✓ You've determined whether to sync, document, or request waiver

### Step 3: Execute Sync

**Action:** Copy the file from workers/ralph/ to templates/ralph/ and validate.

**Copy the file:**

```bash
# From brain repository root
cp workers/ralph/<filename> templates/ralph/<filename>
```

**Validate the synced file:**

```bash
# For shell scripts
shellcheck -e SC1091 templates/ralph/<filename>

# For markdown
markdownlint templates/ralph/<filename>
```

**Anti-pattern:** ❌ Don't manually edit the template file to "fix" differences. Instead: ✅ Fix in workers/ralph/ first, then sync.

**Checkpoint:** ✓ File copied successfully, validation passes

**Link to skill:** [Shell Validation Patterns](../domains/languages/shell/validation-patterns.md) - Shellcheck usage

### Step 4: Document Intentional Drift (Alternative Path)

**Action:** If drift is intentional, update `templates/ralph/README.md` to document the difference.

**When to use this step:**

- The file in workers/ralph/ has brain-specific enhancements
- The difference is not a bug, but a deliberate feature
- New projects should NOT have this feature by default

**Update README.md:**

Add or update the entry in the **"Files that INTENTIONALLY differ"** section:

```markdown
- **`filename.sh`** - Brain repository has:
  - Feature 1 description (lines X-Y)
  - Feature 2 description (lines A-B)
  - Why this is brain-specific (e.g., "depends on brain repo Phase structure")
```

**Then request a waiver:**

```bash
# From brain repository root
bash .verify/request_waiver.sh
# Follow prompts to create waiver for Template.X or Hygiene.TemplateSync.X
```

**Example waiver reason:**

```text
workers/ralph/loop.sh intentionally differs from templates/ralph/loop.sh:
- Lines 881-892: Verifier state injection (brain-specific workflow)
- Lines 921-930: Auto-fix integration (brain-specific tools)
- Lines 935-945: Cortex sync triggers (brain-specific architecture)
These features require brain repository structure and are not suitable for new projects.
```

**Checkpoint:** ✓ Drift documented in README.md, waiver requested

### Step 5: Verify Sync

**Action:** Confirm the sync resolved the verifier warning or that drift is properly documented.

**Run verifier:**

```bash
# From workers/ralph/
bash verifier.sh

# Check output for:
# - [PASS] Template.1 (if thunk_ralph_tasks.sh)
# - [PASS] Hygiene.TemplateSync.1 (if current_ralph_tasks.sh)
# - [PASS] or [WARN] with approved waiver for Hygiene.TemplateSync.2 (if loop.sh)
```

**Expected results:**

- **If synced:** Verifier shows `[PASS]` for relevant Template.X check
- **If waiver requested:** Verifier shows `[WARN]` but not `[FAIL]` (human must approve waiver)

**Anti-pattern:** ❌ Don't mark task complete until verifier confirms. Instead: ✅ Mark `[?]` (proposed done), let verifier confirm `[x]`.

### Step 6: Commit Changes

**Action:** Commit the sync or documentation changes with proper message format.

**For sync commits:**

```bash
git add templates/ralph/<filename>
git add workers/workers/IMPLEMENTATION_PLAN.md workers/ralph/workers/ralph/THUNK.md
git commit -m "sync(templates): update <filename> from workers/ralph

- <Brief description of what changed>
- <Why this change should propagate to new projects>
- Resolves Template.X or Hygiene.TemplateSync.X warning

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>
Brain-Repo: jonathanavis96/brain"
```

**For intentional drift commits:**

```bash
git add templates/ralph/README.md .verify/waiver_requests/WVR-*.json
git add workers/workers/IMPLEMENTATION_PLAN.md workers/ralph/workers/ralph/THUNK.md
git commit -m "docs(templates): document intentional drift in <filename>

- Updated README.md to explain brain-specific features
- Requested waiver for Hygiene.TemplateSync.X
- Drift reasons: <list key differences>

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>
Brain-Repo: jonathanavis96/brain"
```

**Checkpoint:** ✓ Changes committed with proper message format

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Checkpoint 1:** Identified which file(s) have drift using verifier or manual diff
- [ ] **Checkpoint 2:** Categorized drift as "should sync" or "intentional" using README.md policy
- [ ] **Checkpoint 3:** Executed sync (Step 3) OR documented drift (Step 4)
- [ ] **Checkpoint 4:** Verifier confirms fix (PASS) or waiver requested (WARN with justification)
- [ ] **Checkpoint 5:** Changes committed with correct message format and co-author

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Verifier still shows Template.X after sync | File paths wrong, sync didn't complete | Re-run `diff workers/ralph/<file> templates/ralph/<file>` - should show no output. If still differs, check file permissions or git status. |
| "Should I sync or document?" unclear | File has both generic and brain-specific changes | Separate the changes: sync generic improvements to templates/, document brain-specific parts in README.md. Consider refactoring to isolate brain-specific code. |
| Waiver request not stopping [FAIL] | Waiver format incorrect or not processed | Check `.verify/waiver_requests/WVR-*.json` has correct `rule_id`, `reason`, and `affected_files`. Waivers only convert FAIL→WARN, human must approve for PASS. |
| Multiple files drift at once | Related changes across files | Sync them together in ONE commit. Batch fixes that are part of same feature/bugfix. Don't create separate commits for each file unless they're unrelated changes. |
| Diff shows whitespace-only changes | Line endings (CRLF vs LF) or formatting | Run `git diff --ignore-all-space` to confirm. If only whitespace: not a real drift, request waiver. If mixed with real changes: fix whitespace in workers/ first, then sync. |

## Related Skills

Core skills referenced by this playbook:

- [Change Propagation](../domains/ralph/change-propagation.md) - Template sync patterns and drift management
- [Shell Validation Patterns](../domains/languages/shell/validation-patterns.md) - Shellcheck usage for script validation
- [Markdown Patterns](../domains/code-quality/markdown-patterns.md) - Markdown linting for documentation
- [Code Hygiene](../domains/code-quality/code-hygiene.md) - General code quality checks

## Related Playbooks

Other playbooks that connect to this workflow:

- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Use when verifier reports Template.X failures
- [Bootstrap New Project](./bootstrap-new-project.md) - Understanding what templates are used for helps decide what to sync

## Notes

**Iteration efficiency:**

- Don't run `diff` multiple times on same file - capture output once
- Batch multiple file syncs into ONE commit if they're related
- Use verifier status from injected header, don't read `.verify/latest.txt` separately

**Common variations:**

- **Partial sync:** If only part of a change should sync, refactor workers/ralph/ first to isolate brain-specific code
- **New file in workers/ralph/:** Check if it's brain-specific (e.g., `fix-markdown.sh`) or generally useful. If generally useful, copy to templates/ with documentation.
- **Deleted file in workers/ralph/:** If template still has it, consider if new projects need it. Document decision in README.md.

**When to escalate:**

- **Protected file hash mismatch:** If verifier shows `Protected.X` failures on loop.sh/verifier.sh/PROMPT.md, STOP - human must regenerate hash baselines
- **Uncertain if feature is brain-specific:** Ask in commit message or create SPEC_CHANGE_REQUEST.md for review
- **Complex refactoring needed:** If changes span many files and require architectural decisions, escalate to Cortex for planning

---

**Last Updated:** 2026-01-25

**Covers:** Template.1, Hygiene.TemplateSync.1, Hygiene.TemplateSync.2, template synchronization, intentional drift documentation, waiver protocol
