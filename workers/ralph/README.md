# Ralph Worker Template

This directory contains template files for bootstrapping new Ralph worker instances in other repositories.

## Template Files

### Core Loop Files

- **loop.sh** - Main Ralph execution loop (PLAN/BUILD cycles)
- **verifier.sh** - Acceptance criteria validation
- **current_ralph_tasks.sh** - Real-time task monitor (pending tasks)
  - **Rule:** This is an interactive, continuously-refreshing monitor. **Do not pipe it** (no `| grep`, `| sed`, etc.). For snapshots/debugging use `timeout 2s bash current_ralph_tasks.sh --hide-completed`.
- **thunk_ralph_tasks.sh** - Real-time task monitor (completed tasks log)
- **sync_workers_plan_to_cortex.sh** - Copy workers plan to cortex for review/visibility
- **sync_brain_skills.sh** - Refresh vendored Brain knowledge at `./brain/skills/` (workspace-safe)
- **pr-batch.sh** - Batch PR creation script
- **init_verifier_baselines.sh** - Initialize verifier baseline hashes

### Configuration Files

- **PROMPT.md** - Ralph agent instructions
- **AGENTS.md** - Operational guide for Ralph
- **NEURONS.md** - Repository structure map template
- **THOUGHTS.md** - Project vision and goals template
- **VALIDATION_CRITERIA.project.md** - Acceptance criteria template
- **IMPLEMENTATION_PLAN.project.md** - Task backlog template
- **workers/ralph/THUNK.md** - Completed task log template

### Optional Utilities

- **render_ac_status.sh** - Generate human-readable verifier status dashboard from `.verify/latest.txt`
  - Usage: `./render_ac_status.sh` (stdout) or `./render_ac_status.sh --inline` (update IMPLEMENTATION_PLAN.md)
  - Requires markers `<!-- AC_STATUS_START -->` and `<!-- AC_STATUS_END -->` in workers/IMPLEMENTATION_PLAN.md for inline mode

### Template Sync Policy

**Files that SHOULD stay in sync** (copy workers/ralph/ → templates/ralph/ when changed):

- `verifier.sh` - Core verification logic
- `current_ralph_tasks.sh` - Monitor display (Phase detection may differ)
- `thunk_ralph_tasks.sh` - Monitor display
- `sync_workers_plan_to_cortex.sh` - Copy workers plan to cortex for review/visibility
- `pr-batch.sh` - PR automation
- `init_verifier_baselines.sh` - Baseline initialization

**Files that INTENTIONALLY differ** (brain-specific enhancements):

- **`loop.sh`** - Brain repository has additional features:
  - Cache library integration (`source ../shared/cache.sh`)
  - Verifier state injection into BUILD mode prompts (lines 881-892)
  - Auto-fix integration (`fix-markdown.sh`, `pre-commit`) (lines 921-930)
  - Cortex copy triggers (`sync_workers_plan_to_cortex.sh`) (lines 935-945)
  - Cache configuration flags (`--cache-skip`, `--force-no-cache`, `--cache-mode`, `--cache-scope`)
  - Enhanced cleanup trap handling
  - ITER_START/ITER_END event markers for RollFlow analysis

- **`current_ralph_tasks.sh`** - Brain repository has:
  - Phase-aware section detection (## Phase X: pattern matching)
  - Archive section detection to terminate task parsing
  - Enhanced priority section matching (excludes archived sections)

**Files unique to Brain (not shipped in templates):**

- `fix-markdown.sh` - Markdown auto-fix script (brain-specific tooling)
- `ralph.sh` - Brain repository convenience wrapper
- `new-project.sh` - Brain-only operator bootstrap tool (intentionally not shipped in downstream templates)
- `sync_completions_to_cortex.sh` - Deprecated (no longer used)

## Why Template Drift Exists

The brain repository serves as:

1. **Development sandbox** - New features are prototyped here first
2. **Self-improvement platform** - Ralph dogfoods on brain maintenance
3. **Reference implementation** - Most advanced Ralph deployment

When brain-specific features mature and prove valuable, they can be:

- Generalized and backported to templates
- Documented as optional enhancements
- Left as brain-specific if they depend on brain repository structure

## Sync Verification

The verifier includes template sync checks:

- `Template.1` - Checks that `current_ralph_tasks.sh` and `thunk_ralph_tasks.sh` match (or have approved waivers)
- `Hygiene.TemplateSync.1` - Checks `current_ralph_tasks.sh` sync
- `Hygiene.TemplateSync.2` - Checks `loop.sh` sync (expects waivers for intentional drift)

**If you need to sync a file:**

```bash
# From brain repository root
cp workers/ralph/<file> templates/ralph/<file>
git add templates/ralph/<file>
git commit -m "sync(templates): update <file> from workers/ralph"
```

**If drift is intentional:**

Request a waiver via `.verify/request_waiver.sh` with detailed justification explaining why the files differ.

## Using These Templates

1. Copy entire `templates/ralph/` directory to your project's `workers/ralph/` or equivalent
2. Customize `PROMPT.md`, `AGENTS.md`, `THOUGHTS.md` for your project
3. Initialize verifier baselines: `bash init_verifier_baselines.sh`
4. Create `rules/AC.rules` with your acceptance criteria
5. Run first iteration: `bash loop.sh`

See `docs/BOOTSTRAPPING.md` for detailed setup instructions.

## See Also

- [workers/ralph/README.md](../../workers/ralph/README.md) - Brain Ralph implementation documentation
- [docs/BOOTSTRAPPING.md](../../docs/BOOTSTRAPPING.md) - New project bootstrapping guide
- [skills/domains/ralph/ralph-patterns.md](../../skills/domains/ralph/ralph-patterns.md) - Ralph loop architecture
- [skills/domains/ralph/change-propagation.md](../../skills/domains/ralph/change-propagation.md) - Template sync patterns
