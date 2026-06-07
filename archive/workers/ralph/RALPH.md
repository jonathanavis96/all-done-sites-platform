# Ralph Wiggum - Iterative Loop Runner

Ralph is a systematic, iterative development loop that alternates between planning and building phases.

## The Ralph Contract

### Phase 0: Initial Study (Before First Iteration)

**0a. Study THOUGHTS.md**  
Use parallel subagents (max 100) to read project vision, goals, and success criteria. Create minimal THOUGHTS.md if missing.

**0b. Identify source code location**  
Prefer `src/` directory. If different, document the actual location.

**0c. Study fix_plan.md**  
Read the current plan. If it doesn't exist or is empty, the first iteration must create it.

### The Loop

Ralph operates in two alternating phases:

#### 📋 PLAN Phase

See `PROMPT.md` (planning mode section) for full instructions.

**Goal**: Create or update `fix_plan.md` with a prioritized Top 10 checklist

**Frequency**:

- First iteration (if fix_plan.md missing/empty)
- Every N iterations (configurable, default: every 3)
- When explicitly requested

#### 🔨 BUILD Phase

See `PROMPT.md` (building mode section) for full instructions.

**Goal**: Implement the top item from `fix_plan.md`

**Process**:

1. Take top incomplete item from fix_plan.md
2. Implement the change
3. Run build/tests
4. Update fix_plan.md (mark completed ✅)
5. Append progress to progress.txt
6. **DO NOT COMMIT** - PLAN phase handles commits

### Parallelism Contract

**Reading/Searching** (max 100 parallel subagents):

- Studying specs, source code, documentation
- Searching for patterns, imports, references
- Analyzing KB files and best practices

**Building/Testing** (exactly 1 agent):

- Running build commands
- Executing tests and benchmarks
- Making file modifications
- Git operations (PLAN phase only)

### Completion Sentinel

When all work is complete, Ralph outputs:

```text
:::COMPLETE:::
```text

The loop runner detects this sentinel and stops iteration.

## Progress Tracking

All Ralph iterations are logged to `progress.txt` with:

- Timestamp
- Iteration number
- Phase (PLAN or BUILD)
- Actions taken
- Results and outcomes

## Git Commits

**Commits happen in PLAN phase only**, not after each BUILD iteration.

PLAN phase commits all accumulated changes from BUILD iterations:

```text
git add -A
git commit -m "Ralph Plan: [comprehensive summary of all changes]"
```text

This ensures:

- Fewer, more meaningful commits
- Comprehensive commit messages (Ralph has full context during PLAN)
- All related changes grouped together

## Knowledge Base Integration

Ralph can consult project-specific skills in the skills directory when it exists.

**Knowledge growth:**
When Ralph discovers new conventions or decisions specific to the project, it can create/update KB files in the skills directory.

## Running Ralph

### PowerShell

```powershell
.\workers\ralph\ralph.ps1 -Iterations 10 -PlanEvery 3
```text

### Manual (RovoDev CLI)

```powershell
# Ralph determines mode from iteration number
acli rovodev run "$(Get-Content workers\ralph\PROMPT.md -Raw)"
```text

## File Structure

```text
project-root/               ← Application code and config files
├── src/                    # Source code - ALWAYS in project root!
├── package.json            # Dependencies - in project root
├── tsconfig.json           # Config files - in project root
├── index.html              # Entry points - in project root
├── README.md               # Project readme
└── workers/
    └── ralph/                  # ALL Ralph-related files
        ├── RALPH.md            # This file - Ralph contract
        ├── PROMPT.md           # Unified prompt (mode detection)
        ├── workers/IMPLEMENTATION_PLAN.md  # Task tracking
        ├── VALIDATION_CRITERIA.md  # Quality gates
        ├── AGENTS.md           # Agent guidance for this project
        ├── THOUGHTS.md         # Project vision, goals, success criteria
        ├── NEURONS.md          # Codebase map (auto-generated)
        ├── loop.sh             # Loop runner script
        ├── logs/               # Iteration logs
        ├── skills/             # Project-specific knowledge base
        └── progress.txt        # Iteration log (appended)
```text

### ⚠️ CRITICAL: Source code goes in PROJECT ROOT, not Ralph directory

**The Ralph directory contains Ralph loop infrastructure AND project context files.**

- Source code → `src/` (project root)
- Config files → project root (`package.json`, `tsconfig.json`, etc.)
- Entry points → project root (`index.html`, `main.py`, etc.)
- Ralph files → Ralph directory (PROMPT.md, workers/IMPLEMENTATION_PLAN.md, AGENTS.md, THOUGHTS.md, NEURONS.md, skills/, logs/, etc.)

**NEVER put application code inside the Ralph directory.**

## Philosophy: Ralph Wiggum

Named after the Simpsons character who famously said "I'm helping!" Ralph embodies:

- **Simple and obvious** - No clever tricks, just systematic iteration
- **Persistent** - Keeps going until the job is done
- **Honest** - Logs everything, admits what it doesn't know
- **Helpful** - Focused on making progress, not being perfect

Ralph doesn't try to be smart. Ralph just follows the contract and gets the work done.
