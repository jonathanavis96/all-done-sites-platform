# Agent Playbooks

## Purpose

Playbooks are curated multi-skill workflows that guide agents through common complex tasks. Unlike atomic skills (which document single concepts), playbooks chain multiple skills into actionable end-to-end guides.

## When to Use a Playbook vs a Skill

**Use a skill when:**

- You need to understand a single concept (e.g., "How do I fix SC2155?")
- You're looking for quick reference material
- You need pattern examples for a specific technology

**Use a playbook when:**

- You're tackling a multi-step process (e.g., "How do I resolve verifier failures?")
- The task requires decision points or conditional logic
- You need orchestration across multiple skills/tools
- You're debugging a complex issue

## Playbook Format

All playbooks follow this structure:

```markdown
# [Playbook Title]

## Goal

What this playbook helps you accomplish.

## When to Use

Symptoms or scenarios that indicate you should use this playbook.

## Prerequisites

- Required tools/permissions
- Files that must exist
- Knowledge you should have

## Steps

1. **Step name** - Action description
   - Sub-action or detail
   - Decision point: "If X, then Y"
   - Link to relevant skill: `[Skill Name](../domains/category/skill.md)`

2. **Next step** - Continue the workflow

## Checkpoints

How to verify you're on track:

- [ ] Checkpoint 1
- [ ] Checkpoint 2

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Issue description | Why it happens | How to fix |

## Related Skills

- [Skill 1](../domains/category/skill.md)
- [Skill 2](../domains/category/skill.md)

## Related Playbooks

- [Other Playbook](./other-playbook.md)
```

## Available Playbooks

### Core Workflows (Shell/Linting)

- [Fix ShellCheck Failures](./fix-shellcheck-failures.md) - Systematic approach to resolving shellcheck warnings
- [Fix Markdown Lint](./fix-markdown-lint.md) - Resolve markdown linting issues
- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Handle verifier check failures

### Template & Sync Workflows

- [Safe Template Sync](./safe-template-sync.md) - Synchronize changes between workers/ and templates/
- [Bootstrap New Project](./bootstrap-new-project.md) - Set up a new project from templates

### Debugging Workflows

- [Debug Ralph Stuck](./debug-ralph-stuck.md) - Troubleshoot Ralph loop issues
- [Investigate Test Failures](./investigate-test-failures.md) - Systematic test failure resolution

### Task Management Workflows

- [Task Optimization Review](./task-optimization-review.md) - Identify batching and decomposition opportunities
- [Decompose Large Tasks](./decompose-large-tasks.md) - Break down oversized tasks into atomic subtasks

## Contributing

New playbooks should:

1. Follow the template structure in `PLAYBOOK_TEMPLATE.md`
2. Link to at least 2 existing skills
3. Include decision points for complex scenarios
4. Provide concrete checkpoint criteria
5. Add entry to this README's "Available Playbooks" section

## Design Philosophy

- **Action-oriented:** Start with the problem, guide to solution
- **Decision-aware:** Include conditional logic and branching
- **Skill-referencing:** Link to atomic skills for deep dives
- **Checkpoint-driven:** Clear verification points throughout
- **Ralph-friendly:** Simple, obvious, no surprises
