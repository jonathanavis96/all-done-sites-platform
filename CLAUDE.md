# All Done Sites -- Claude Code Project Context

## Overview

All Done Sites is a website project built with Vite, React, and TypeScript using shadcn/ui components. The website is deployed via GitHub Pages with a custom domain (CNAME).

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **UI:** shadcn/ui, Tailwind CSS
- **Deploy:** GitHub Pages (static build to `dist/`)
- **Domain:** Custom CNAME

## Key Files

| File | Purpose |
|------|---------|
| `NEURONS.md` | Repository structure map |
| `cortex/THOUGHTS.md` | Strategic goals + status |
| `cortex/DECISIONS.md` | Architectural decisions |
| `workers/IMPLEMENTATION_PLAN.md` | Active task list for Ralph |

## Directory Structure

```text
alldonesites/
├── website/             # Vite/React source code
├── dist/                # Built static output
├── docs/                # Documentation
├── cortex/              # Cortex (planner)
├── workers/             # Ralph (executor)
│   ├── ralph/           # Ralph worker
│   └── shared/          # Shared utilities
├── skills/              # Knowledge base
├── tools/               # Utility tools
└── CLAUDE.md            # This file
```

## Environment

- **Platform:** WSL2 on Windows 11 with Ubuntu
- **Runtime:** Claude Code (primary), Rovo Dev (legacy, `*/rovodev/` frozen archives -- never modify)
- **Cortex:** `bash cortex/cortex-alldonesites.bash`

## Conventions

- **Timestamps:** Always `YYYY-MM-DD HH:MM:SS` with seconds
- **Markdown:** Language tags on ALL code fences, blank lines around fences/lists
- **Git commits:** Conventional messages (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- **Protected files:** `workers/ralph/PROMPT.md`, `loop.sh`, `verifier.sh`, `rules/AC.rules` -- human-only modifications
- **Frozen archives:** Never modify any `*/rovodev/` folder or file
