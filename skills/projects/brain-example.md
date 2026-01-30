# Brain Repository Project

<!-- This is an EXAMPLE skill file demonstrating project-specific knowledge.
     It shows how to document conventions, decisions, and context for a specific project. -->

## Why This Exists

The brain repository is a unique project that serves as both a knowledge base AND uses itself for self-improvement via the Ralph loop. This creates special considerations that differ from typical projects. This skill file documents brain-specific conventions, Ralph loop usage, and structural decisions that agents need to understand when working on the brain itself.

**Problem solved:** Without this documentation, agents working on the brain repository might not understand the distinction between local paths (for brain's own Ralph) vs relative paths (for project templates), or how the brain uses Ralph to improve itself.

## When to Use It

Reference this skill file when:

- Working on the brain repository itself (not a project created from brain)
- Running the brain's own Ralph loop (`loop.sh`)
- Creating or modifying templates in `templates/`
- Adding new skill files or updating the knowledge base structure
- Updating validation scripts or bootstrap scripts
- Troubleshooting brain-specific issues

**Specific triggers:**

- Editing files in `brain/templates/`
- Modifying `brain/` Ralph prompts (PROMPT.md, loop.sh)
- Running `brain/loop.sh`
- Updating `brain/workers/IMPLEMENTATION_PLAN.md`
- Contributing to the knowledge base

## Details

### Brain Repository Structure

The brain repository has a unique dual role:

```text
brain/
├── skills/                # Knowledge base (the "source code" for knowledge)
├── references/            # Read-only reference materials (45 React rules)
├── templates/             # Bootstrap templates for new projects
├── loop.sh                # Brain's OWN Ralph loop for self-improvement
├── workers/IMPLEMENTATION_PLAN.md # Brain's OWN improvement backlog
├── scripts/new-project.sh # Bootstrap script
├── verifier.sh            # Validation script
└── AGENTS.md              # Guidance for agents working ON brain
```text

**Key insight:** The brain repository IS a project itself, and uses Ralph to evolve.

### Path Conventions: Brain vs Projects

This is critical to understand:

**When working IN the brain repository:**

- Skill references use **local paths**: `skills/SUMMARY.md`, `references/react-best-practices/HOTLIST.md`
- Brain's Ralph prompts use **local paths**: `skills/SUMMARY.md`
- AGENTS.md references are **local**: `skills/conventions.md`

**When in templates (for NEW projects):**

- Skill references use **relative paths from project root**: `../brain/skills/SUMMARY.md`
- Templates assume project is sibling to brain: `../brain/`
- Template prompts use **relative paths**: `../../brain/skills/SUMMARY.md`

**Example:**

```markdown
<!-- In brain/AGENTS.md (local paths) -->
Read [conventions](../conventions.md)

<!-- In brain/templates/AGENTS.project.md (relative paths) -->
Read [conventions](../conventions.md)

<!-- In brain/PROMPT.md (local paths, brain's own Ralph) -->
Read `skills/SUMMARY.md`

<!-- In brain/templates/ralph/PROMPT.md (relative paths, for projects) -->
Read `../../brain/skills/SUMMARY.md`
```text

### Brain Self-Improvement with Ralph

The brain repository has its own Ralph loop at `loop.sh`:

**How it works:**

1. Brain's `workers/IMPLEMENTATION_PLAN.md` contains improvement tasks for the brain itself
2. Running `loop.sh` executes the brain's Ralph loop
3. Ralph reads brain's skills (local paths), implements top task from workers/IMPLEMENTATION_PLAN.md
4. Changes are validated with `verifier.sh`
5. Progress logged to `workers/ralph/THUNK.md`

**What Ralph considers "source code" for the brain:**

- Templates in `templates/`
- Skill files in `skills/`
- Scripts: `new-project.sh`, `verifier.sh`, `loop.sh`
- Documentation: `AGENTS.md`, `README.md`
- Ralph infrastructure: root directory files

**Brain's Ralph does NOT modify:**

- `references/react-best-practices/rules/` (45 files, read-only reference material)

### Skill File Categories

The brain organizes knowledge into two categories:

**Domains (`skills/domains/`):**

- Reusable technical patterns
- Cross-project knowledge
- Technology-specific patterns
- Example: `auth-patterns.md`, `caching-patterns.md`

**Projects (`skills/projects/`):**

- Project-specific conventions
- Single-project context
- Deployment specifics
- Example: `brain-example.md` (this file)

### Validation Script

The brain includes `verifier.sh` to ensure integrity:

**What it checks:**

- Acceptance criteria from `rules/AC.rules`
- Protected file hashes (loop.sh, verifier.sh, PROMPT.md, rules/AC.rules)
- Shellcheck hygiene gates
- Markdown formatting
- Template hash baselines

**Usage:**

```bash
./verifier.sh          # Run validation
```text

### Bootstrap Script

The `new-project.sh` script creates new projects with intelligent generator inference:

**Enhanced features:**

- Pre-flight checks (templates exist, name valid, directory available)
- Tech stack inference from project idea file
- Automatic generation of NEURONS.md, THOUGHTS.md, workers/IMPLEMENTATION_PLAN.md
- GitHub repository creation integration
- Post-creation validation

**Usage:**

```bash
bash scripts/new-project.sh my-project-idea.md    # Create project from idea file
```text

### Template Maintenance

When updating templates, ensure consistency:

**Path patterns:**

- Templates use local paths (copied into project)
- Skill references remain relative to brain repository

**Progressive disclosure order:**

1. `../brain/skills/SUMMARY.md`
2. `../brain/references/react-best-practices/HOTLIST.md`
3. `../brain/references/react-best-practices/INDEX.md` (only if needed)
4. `../brain/references/react-best-practices/rules/*` (only specific rules)

**Required sections in skill files:**

- `## Why This Exists`
- `## When to Use It`
- `## Details`

### Common Brain-Specific Tasks

**Adding a new skill file:**

1. Create file in `skills/domains/` or `skills/projects/`
2. Follow Why/When/Details structure
3. Update `skills/SUMMARY.md` and `skills/index.md` with link
4. Run `./verifier.sh` to verify

**Updating templates:**

1. Edit files in `templates/`
2. Ensure template integrity maintained
3. Test with generators if applicable
4. Run `./verifier.sh`

**Running brain's Ralph loop:**

1. Add tasks to `workers/IMPLEMENTATION_PLAN.md`
2. Run `./loop.sh --iterations 10`
3. Ralph implements tasks, validates with `verifier.sh`
4. Check `workers/ralph/THUNK.md` for completed task log

### Brain-Specific Gotchas

❌ **Don't modify `references/react-best-practices/rules/`** - These 45 files are read-only reference material  
❌ **Don't modify protected files** - rules/AC.rules, verifier.sh, loop.sh, PROMPT.md are hash-protected  
❌ **Don't skip validation** - Always run `./verifier.sh` after changes  
❌ **Don't batch multiple tasks** - Ralph does exactly one task per BUILD iteration

### Decision History

**Why templates are copied to projects:**

- Projects are self-contained with their own Ralph infrastructure
- Generators intelligently adapt templates to project type
- Each project has customized NEURONS.md, THOUGHTS.md, workers/IMPLEMENTATION_PLAN.md

**Why brain has its own Ralph loop:**

- Brain needs to evolve and improve itself
- Meta-approach: brain uses its own tools for self-improvement
- workers/IMPLEMENTATION_PLAN.md tracks brain's own improvement tasks

**Why validation script is necessary:**

- Ensures acceptance criteria pass before commits
- Protects critical files with hash verification
- Catches hygiene issues (shellcheck, markdown formatting)
- Verifies references directory unchanged (45 rules - complete Vercel Engineering set)

### Integration with Other Skill Files

- Related: `../conventions.md` - Skill file authoring guidelines
- Related: `../domains/README.md` - Domain skill explanation
- Related: `README.md` - Project skill explanation
- See: `../../AGENTS.md` - Agent guidance for brain repository
- See: `../../README.md` - Developer onboarding guide

### Testing Changes to Brain

Before committing changes to brain repository:

1. **Validate structure:** `./verifier.sh`
2. **Test bootstrap:** `bash scripts/new-project.sh` with a test idea file
3. **Check skill links:** Verify all links in `skills/SUMMARY.md` and `skills/index.md` work
4. **Review integrity:** Ensure protected files not modified
5. **Run brain's Ralph:** Test self-improvement loop works

### Contributing to Brain

When contributing new features to brain:

1. **Add task to workers/IMPLEMENTATION_PLAN.md** with rationale and relevant rules
2. **Run brain's Ralph loop** to implement the task
3. **Validate changes** with `./verifier.sh`
4. **Update documentation** (AGENTS.md, README.md, etc.)
5. **Create skill files** if new patterns discovered

## References

- [AGENTS.md](../../AGENTS.md) - Agent guidance for brain repository
- [README.md](../../README.md) - Developer onboarding and quickstart guide
- [conventions.md](../conventions.md) - Skill file authoring conventions
- [templates/ralph/IMPLEMENTATION_PLAN.project.md](../../templates/ralph/IMPLEMENTATION_PLAN.project.md) - Implementation plan template
