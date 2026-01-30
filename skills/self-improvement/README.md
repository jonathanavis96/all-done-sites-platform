# Self-Improvement System

This folder contains the self-improvement protocol for the Ralph brain system.

## Purpose

Capture knowledge gaps discovered during work and promote clear, recurring gaps into reusable skill files.

## Files

| File | Purpose |
|------|---------|
| [GAP_CAPTURE_RULES.md](GAP_CAPTURE_RULES.md) | Mandatory rules for gap capture and promotion |
| [skills/self-improvement/GAP_BACKLOG.md](GAP_BACKLOG.md) | Raw capture log of all discovered gaps |
| [SKILL_BACKLOG.md](SKILL_BACKLOG.md) | Promotion queue for gaps ready to become skills |
| [SKILL_TEMPLATE.md](SKILL_TEMPLATE.md) | Template for creating new skill files |

## Workflow

1. **Discover gap** → Always log in `skills/self-improvement/GAP_BACKLOG.md`
2. **Evaluate** → Is it clear, specific, and recurring?
3. **Promote** → If yes, add to `SKILL_BACKLOG.md` and create skill file
4. **Place** → `skills/domains/<topic>/<skill>.md` or `skills/projects/<project>/<skill>.md`
5. **Index** → Update `skills/SUMMARY.md`

## Placement Rules

- **Broadly reusable** → `skills/domains/<topic>/<skill>.md`
- **Project-specific but reusable** → `skills/projects/<project>/<skill>.md`
- **Uncertain** → Default to `skills/domains/` with best-guess topic
- **Create folders as needed** (one file per skill)
