# Bootstrap New Project

## Goal

Set up a new project with complete Ralph infrastructure, GitHub integration, and AI-assisted development environment using the brain repository's intelligent generators.

## When to Use

Use this playbook when:

- Starting a new project from scratch
- You want Ralph loop infrastructure for AI-assisted development
- You need GitHub repo creation with PR workflow setup
- You want intelligent scaffolding based on tech stack (web app, API, CLI, etc.)

## Prerequisites

Before starting, ensure you have:

- **Tools:**
  - git (required)
  - gh CLI (optional, for GitHub integration)
  - bash (WSL on Windows 11, or native Linux/macOS)
- **Files:**
  - Access to brain repository with `new-project.sh` and generators
  - Project idea defined (or use template)
- **Permissions:**
  - Write access to target project directory
  - GitHub authentication (if creating remote repo)
- **Knowledge:**
  - Project name, tech stack, and goals
  - Basic understanding of Ralph loop workflow

## Steps

### Step 1: Create Project Idea File

**Action:** Define your project requirements using the template.

- Copy the template to start: `cp templates/NEW_PROJECT_IDEA.template.md my-project-idea.md`
- Fill in required fields:
  - **Project:** Name of your project (used for repo name)
  - **Location:** Absolute path where project should be created (optional - defaults to brain sibling)
  - **Purpose:** Brief description of what the project does
  - **Tech Stack:** Technologies (e.g., "Next.js, TypeScript, PostgreSQL")
  - **Goals:** Key objectives and success criteria
- Optional sections: Detailed Description, Success Criteria, Technical Requirements, Notes

**Example:**

```markdown
# Project: Widget Dashboard

Location: /home/user/projects/widget-dashboard
Purpose: Admin dashboard for widget inventory management
Tech Stack: Next.js, React, TypeScript, Tailwind CSS, PostgreSQL
Goals: User authentication, CRUD for widgets, search/filter, export reports, responsive design

## Detailed Description

Dashboard for managing widget inventory with role-based access control.
Admins can manage widgets, regular users can view only.
```

**Decision Point:** If you have an existing project structure, consider manual generator usage instead (see Step 7).

**Link to skill:** [Project Template Structure](../../templates/README.md)

### Step 2: Run Bootstrap Script

**Action:** Execute new-project.sh with your project idea file.

- Navigate to brain repository root
- Run: `bash scripts/new-project.sh my-project-idea.md`
- Script will display project summary - review carefully
- **Command example:**

  ```bash
  cd /path/to/brain
  bash scripts/new-project.sh my-project-idea.md
  ```

**Checkpoint:** ✓ Script shows correct project name, location, tech stack, and goals

### Step 3: GitHub Repository Setup (Interactive)

**Action:** Respond to interactive prompts for GitHub integration.

**Prompt 1: "Create GitHub repository? (y/n)"**

- **If Yes:** Proceed to GitHub setup (requires gh CLI)
- **If No:** Skip to local-only mode (Step 4)

**Prompt 2: "GitHub username [detected]:"** (if creating repo)

- Accept detected username or provide your own
- Username is saved to `~/.ralph/config` for future use

**Prompt 3: "Repository name [suggested]:"**

- Accept sanitized suggestion or provide custom name
- Work branch will be: `{repo-name}-work`

**Prompt 4: "Proceed with this configuration? (y/n)"**

- Review summary: repository path, work branch, location
- Confirm to proceed

**Decision Point:**

- **If gh CLI not installed/authenticated:** Script offers local-only mode
- **If repository name conflict:** Script prompts for alternative name or local-only
- **If network/auth failure:** Script falls back to local-only mode gracefully

**Anti-pattern:** ❌ Don't force GitHub creation if offline or unauthenticated. Instead: ✅ Accept local-only mode and connect later.

### Step 4: Local-Only Mode (Fallback Path)

**Action:** If skipping GitHub or if connection fails, project is created locally.

- Git repository initialized with main branch
- Local work branch created: `{repo-name}-work`
- No remote origin configured
- Script provides commands to connect GitHub later:

  ```bash
  gh repo create repo-name --public --source=. --remote=origin
  git push -u origin main
  git checkout -b repo-name-work
  git push -u origin repo-name-work
  ```

**Checkpoint:** ✓ Local git repository created, on work branch, files committed

### Step 5: Verify Generated Structure

**Action:** Review the generated project structure and files.

- Navigate to project location: `cd /path/to/project`
- Verify directory structure:

  ```text
  project/
  ├── ralph/             # Ralph loop infrastructure
  │   ├── AGENTS.md       # Operational guide for agents
  │   ├── PROMPT.md       # Ralph prompt with context
  │   ├── THOUGHTS.md     # Generated from idea (goals, success criteria)
  │   ├── NEURONS.md      # Generated codebase map
  │   ├── workers/IMPLEMENTATION_PLAN.md  # Generated task breakdown
  │   ├── workers/ralph/THUNK.md        # Task completion log
  │   ├── VALIDATION_CRITERIA.md  # Quality gates
  │   ├── loop.sh         # Ralph execution loop
  │   ├── verifier.sh     # Acceptance criteria checker
  │   ├── current_ralph_tasks.sh  # Task monitor
  │   ├── thunk_ralph_tasks.sh    # Completion monitor
  │   ├── pr-batch.sh     # PR creation helper
  │   └── logs/           # Iteration logs
  ├── skills/             # Project-specific skills (empty initially)
  ├── src/                # Source code (empty initially)
  ├── docs/               # Documentation + archived IDEA file
  ├── .gitignore          # Standard ignores for Ralph
  └── README.md           # Generated project README
  ```

**Checkpoint:** ✓ All core files exist, executables have +x permissions

### Step 6: Customize Generated Files

**Action:** Review and adjust generated files to match your specific needs.

**THOUGHTS.md customization:**

- Verify "What We're Building" section matches your vision
- Review "Success Criteria" - add/remove as needed
- Check "Skills & Patterns" references match your tech stack
- Update "Definition of Done" criteria

**NEURONS.md customization:**

- Review inferred directory structure (based on tech stack)
- Adjust paths if different from conventions
- Add project-specific file location notes
- Update validation commands section

**workers/IMPLEMENTATION_PLAN.md customization:**

- Review generated phases (Setup → Core → Features → Polish → Deploy)
- Reorder tasks by priority
- Break down complex tasks into subtasks
- Add tech-specific acceptance criteria

**Example customization:**

```bash
cd ralph
vim THOUGHTS.md      # Review goals, add project-specific context
vim NEURONS.md       # Verify directory structure matches conventions
vim workers/IMPLEMENTATION_PLAN.md  # Prioritize phases, add subtasks
```

**Anti-pattern:** ❌ Don't run loop.sh without reviewing generated files. Instead: ✅ Customize THOUGHTS/NEURONS/PLAN first.

**Link to skill:** [Project Structure Conventions](../../docs/BOOTSTRAPPING.md)

### Step 7: First Ralph Run

**Action:** Start the Ralph loop to begin AI-assisted development.

- Navigate to ralph directory: `cd ralph`
- Run loop with limited iterations for testing: `bash loop.sh --iterations 3`
- Monitor output for PLAN mode → BUILD mode progression
- Verify workers/ralph/THUNK.md tracks completed tasks
- Check logs directory for iteration logs

**Command:**

```bash
cd ralph
bash loop.sh --iterations 3
```

**Checkpoint:** ✓ Loop completes 3 iterations, tasks logged to workers/ralph/THUNK.md, no critical errors

### Step 8: Monitor Task Progress

**Action:** Use monitor scripts to track Ralph's progress in real-time.

- **Current tasks:** `bash current_ralph_tasks.sh` - Shows pending tasks from workers/IMPLEMENTATION_PLAN.md
- **Completed tasks:** `bash thunk_ralph_tasks.sh` - Shows task log from workers/ralph/THUNK.md
- Both monitors support hotkeys:
  - `r` - Refresh display
  - `q` - Quit
  - `f` - Force refresh (thunk monitor only)

**Example:**

```bash
# In separate terminal windows
cd ralph
bash current_ralph_tasks.sh    # Watch pending tasks

# In another terminal
bash thunk_ralph_tasks.sh      # Watch completions
```

**Link to skill:** [Ralph Monitor Scripts](../../workers/ralph/README.md)

### Step 9: Create Pull Request (When Ready)

**Action:** Use pr-batch.sh to create PR from work branch to main.

- Ensure you're on work branch: `git branch --show-current`
- Run pr-batch script: `bash pr-batch.sh`
- Script will:
  - Push work branch to origin
  - Create PR titled: `feat: {repo-name} - Iteration batch {date}`
  - Output PR URL for review

**Command:**

```bash
cd ralph
bash pr-batch.sh
```

**Decision Point:** Only create PR when a logical batch of work is complete (not after every iteration).

**Checkpoint:** ✓ PR created, work branch pushed, main remains clean

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Project idea file created** with all required fields (Project, Purpose, Tech Stack, Goals)
- [ ] **new-project.sh completed** without errors, summary displayed correctly
- [ ] **GitHub repo created** (or local-only mode confirmed)
- [ ] **Project structure verified** - all ralph/ files present, executables have +x
- [ ] **Generated files customized** - THOUGHTS/NEURONS/PLAN reviewed and adjusted
- [ ] **First Ralph run successful** - 3 iterations complete, workers/ralph/THUNK.md updated
- [ ] **Monitors working** - current_ralph_tasks.sh and thunk_ralph_tasks.sh display correctly
- [ ] **PR workflow tested** - pr-batch.sh creates PR successfully (if using GitHub)

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| "Could not extract project name" | Missing `Project:` field in IDEA file | Add `# Project: Name` or `Project: Name` line |
| "Target location already exists" | Directory conflict | Choose different location or delete existing directory |
| "gh CLI not installed" | Missing GitHub CLI tool | Install from <https://cli.github.com/> or use local-only mode |
| "gh not authenticated" | Not logged into GitHub | Run `gh auth login` or use local-only mode |
| "Repository name not available" | GitHub name conflict | Provide alternative name when prompted or use local-only |
| "loop.sh fails to start" | Missing executable permissions | Run `chmod +x ralph/loop.sh ralph/*.sh` |
| "Generators produce empty files" | Missing required fields in IDEA | Ensure Purpose, Tech Stack, Goals are all present |
| "NEURONS.md has wrong structure" | Tech stack not recognized | Manually edit NEURONS.md or update Tech Stack field |

## Related Skills

Core skills referenced by this playbook:

- [Project Templates](../../templates/README.md) - Template structure and usage
- [Bootstrapping Guide](../../docs/BOOTSTRAPPING.md) - Generator details and manual usage
- [Ralph Loop Architecture](../domains/ralph/ralph-patterns.md) - How Ralph works
- [Project Structure Conventions](../../NEURONS.md) - Brain repository structure
- [Git Workflow Patterns](../domains/infrastructure/deployment-patterns.md) - Branch strategies

## Related Playbooks

Other playbooks that connect to this workflow:

- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Use when verifier reports failures
- [Safe Template Sync](./safe-template-sync.md) - Update project templates from brain
- [Debug Ralph Stuck](./debug-ralph-stuck.md) - Troubleshoot Ralph loop issues

## Notes

**Iteration efficiency:**

- Run bootstrap once, verify structure before starting loop (saves iterations)
- Customize THOUGHTS/NEURONS/PLAN in one pass (don't iterate on these)
- Use `--iterations 3` for first run to test setup (not full `--iterations 10`)

**Common variations:**

- **Existing project:** Use manual generators instead of new-project.sh (see BOOTSTRAPPING.md)
- **No GitHub:** Local-only mode works fully, connect later if needed
- **Custom template:** Copy templates/ralph/ files manually, run generators for THOUGHTS/NEURONS/PLAN

**When to escalate:**

- Generator produces malformed output → Check IDEA file format, ensure all required fields present
- Loop.sh fails repeatedly → Review logs in ralph/logs/, check PROMPT.md context
- GitHub connection issues → Use local-only mode, connect manually later

**Manual generator usage (advanced):**

If new-project.sh doesn't fit (existing repo, custom setup):

```bash
# Generate individual files
bash generators/generate-thoughts.sh idea.md project/ralph/THOUGHTS.md
bash generators/generate-neurons.sh idea.md project/ralph/NEURONS.md
bash generators/generate-implementation-plan.sh idea.md project/workers/IMPLEMENTATION_PLAN.md

# Copy template files manually
cp -r templates/ralph/* project/ralph/
```

---

**Last Updated:** 2026-01-25

**Covers:** Project bootstrapping, new-project.sh, GitHub integration, Ralph setup, template usage, generator scripts
