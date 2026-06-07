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
| `cortex/IMPLEMENTATION_PLAN.md` | Active plan |

## Agent Model

A single agent — **Cortex** — both plans and builds this project directly in
Claude Code. The former two-agent model (Cortex planned, "Ralph" executed an
autonomous loop) was retired on 2026-06-07. The Ralph runtime is frozen under
`archive/workers/` and must never be modified.

## Directory Structure

```text
alldonesites/
├── website/             # Vite/React source code
├── dist/                # Built static output
├── docs/                # Documentation
├── cortex/              # Cortex (plans + docs)
├── skills/              # Knowledge base
├── tools/               # Utility tools
├── archive/             # Frozen legacy runtimes (Ralph) -- never modify
│   └── workers/         # Retired Ralph executor
└── CLAUDE.md            # This file
```

## Environment

- **Platform:** WSL2 on Windows 11 with Ubuntu
- **Runtime:** Claude Code
- **Legacy:** Rovo Dev and Ralph are retired; frozen under `*/rovodev/` and `archive/` -- never modify

## Conventions

- **Timestamps:** Always `YYYY-MM-DD HH:MM:SS` with seconds
- **Markdown:** Language tags on ALL code fences, blank lines around fences/lists
- **Git commits:** Conventional messages (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- **Verify before done:** Run `npm run build` and `npm run lint`
- **Frozen archives:** Never modify any `archive/` or `*/rovodev/` folder or file
