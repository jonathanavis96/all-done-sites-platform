# Cortex Implementation Plan — All Done Sites

**Status:** Active (single-agent: Cortex plans and builds)  
**Branch:** `main`  
**Last Updated:** 2026-06-07 12:05:00 (by Cortex)

## Mission

From `THOUGHTS.md`: maintain and grow the All Done Sites marketing/portfolio
website — fast, clear, conversion-focused, deployed to GitHub Pages.

## How work happens

Cortex plans and implements directly in Claude Code. There is no separate
executor loop. For each piece of work:

1. Plan the change here (atomic, verifiable steps).
2. Implement it in `website/`.
3. Verify with `npm run build` (and `npm run lint`); check screenshots for
   visual/portfolio work.
4. Commit with a conventional message; log durable decisions in `DECISIONS.md`.

---

## Recently Completed

- [x] **Add AI Focus to portfolio (live)** — `aifocus.work`, with live badge.
- [x] **Add Baobab Wines to portfolio (WIP)** — preview link, "In progress" badge.
- [x] **Capture 3:2 hero screenshots** for both via Playwright.
- [x] **Retire Ralph** — archived `workers/` → `archive/workers/`; rewrote core
  docs to the single-agent model.

---

## Active / Upcoming

(No active tasks. Add atomic steps here as new work is planned.)

---

## Notes

- Verify before claiming done: `npm run build` must succeed.
- Keep `NEURONS.md`, `CLAUDE.md`, and `THOUGHTS.md` in sync with reality.
- Never modify `archive/` or `*/rovodev/` (frozen legacy runtimes).
