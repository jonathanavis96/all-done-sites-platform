# Cortex Thoughts — All Done Sites

**Last Updated:** 2026-06-07 12:05:00

## Current Mission

Maintain and grow the All Done Sites marketing/portfolio website — a fast,
clear, conversion-focused site for service businesses, built with Vite + React +
TypeScript + shadcn/ui and deployed to GitHub Pages via a custom domain.

**Status:** Active, single-agent model (Cortex plans and builds).

---

## Agent Model

As of **2026-06-07** the project runs on a **single agent**: Cortex plans and
implements directly inside Claude Code. The previous two-agent setup (Cortex
planned; "Ralph" executed an autonomous BUILD loop) is retired. The Ralph
runtime is frozen under `archive/workers/` and is never modified.

---

## Strategic Context

**Type:** Marketing + portfolio website  
**Tech Stack:** Vite, React 18, TypeScript, shadcn/ui, Tailwind CSS, GitHub Pages

**Key Objectives:**

- Keep the portfolio current with live client work
- Maintain fast load times and good SEO (static pages generated at build)
- Clear pricing / how-it-works / contact flows
- Accessible, responsive design

---

## Recent Work

### 2026-06-07 — Portfolio additions + single-agent migration

- Added **AI Focus** (`aifocus.work`) to the portfolio as a **live** site.
- Added **Baobab Wines** (`baobab-wines` preview) as **work-in-progress** with
  an "In progress" badge.
- Captured new 3:2 hero screenshots for both via Playwright.
- Retired the Ralph executor: archived `workers/` → `archive/workers/`, and
  rewrote the core docs so Cortex is the sole planner+builder.

---

## Knowledge Gaps

(Captured as work progresses.)

---

## Success Metrics

- Portfolio reflects real, current client sites.
- `npm run build` succeeds and static SEO pages generate cleanly.
- Site stays fast and accessible.

---

## Notes for Future Sessions

- Update `NEURONS.md` as project structure evolves.
- Promote durable decisions into `DECISIONS.md`.
- Capture reusable patterns in `skills/`.
