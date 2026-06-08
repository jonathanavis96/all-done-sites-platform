# DECISIONS.md - All Done Sites

**Purpose:** Architectural decisions and conventions for All Done Sites

**Last updated:** 2026-06-08 04:10:00

---

## Active Decisions

### DEC-2026-06-08-001: /guides is a data-driven, prerendered content section

**Date:** 2026-06-08 04:10:00

**Decision:** Build the SEO/AEO `/guides` section as a single data module
(`website/src/content/guides.tsx`) consumed by a `GuidesIndex` page and a dynamic
`GuideArticle` (`/guides/:slug`), with each guide route prerendered to its own
`dist/guides/.../index.html` (content + Article + FAQPage JSON-LD baked in).

**Rationale:**

- One source of truth (typed blocks + FAQs) drives the rendered article, the
  JSON-LD, the index cards, and the sitemap/llms entries — no duplication.
- Prerendering puts the article text + structured data in the raw HTML for search
  engines and AI crawlers that do not run JS (the whole point of the section).
- Reuses existing patterns (`PageShell`, `Seo`, `.adsx`/`.legal` styles), so it
  fits the redesigned site rather than inventing new chrome.

**Implementation:**

- `entry-server.tsx` extended: returns `headFull` (title + meta + canonical +
  JSON-LD) and exports `prerenderRoutes`; `scripts/prerender.js` loops those,
  stripping template default meta so guide pages get page-specific, deduped head.
  Homepage prerender path left untouched (no perf regression).
- Guides wired into nav + footer, `public/sitemap.xml`, `public/llms.txt`.

**Impact / gotcha:** Prerendered routes MUST be eager imports in `App.tsx` —
`renderToString` does not resolve `React.lazy` (it renders the Suspense null
fallback), so a lazy guide route prerenders an empty shell. Making the two guide
pages eager moved the homepage main chunk 104KB → 117KB gz (+13KB). Accepted
because hydration is deferred and the hero is preloaded, so the extra JS is off
the critical path (FCP/LCP unaffected). If perf needs it later, split SSR-eager /
client-lazy.

---

### DEC-2026-06-07-001: Retire Ralph; Cortex is the single planner+builder

**Date:** 2026-06-07 12:05:00

**Decision:** Move from the two-agent model (Cortex plans, Ralph executes an
autonomous loop) to a single-agent model where Cortex both plans and implements
directly inside Claude Code.

**Rationale:**

- The autonomous Ralph loop added overhead (task contracts, verifier, THUNK log)
  that is unnecessary for a small marketing/portfolio site.
- Working directly in Claude Code is faster and simpler for the current scope.
- Alternatives considered: keep the loop (rejected — too heavy), delete Ralph
  outright (rejected — lose reference/history). Chose to archive instead.

**Implementation:**

- `workers/` moved to `archive/workers/` (frozen, never modified).
- Core docs rewritten: `cortex/CORTEX_SYSTEM_PROMPT.md`, `cortex/AGENTS.md`,
  `CLAUDE.md`, `NEURONS.md`, `README.md`, `cortex/THOUGHTS.md`.
- `archive/README.md` explains the frozen runtime.

**Impact:** Simpler workflow; one agent owns plan → build → verify. The
`skills/` knowledge base still references Ralph patterns and is kept as-is
(useful generic knowledge); only core operating docs were updated.

---

## Decision Template

When adding decisions, use this format:

```markdown
### DEC-YYYY-MM-DD-NNN: Decision Title

**Date:** YYYY-MM-DD HH:MM:SS

**Decision:** What was decided?

**Rationale:**
- Why this approach?
- What alternatives were considered?
- What are the tradeoffs?

**Implementation:**
- How is this enforced?
- What files/patterns are affected?

**Impact:** Effect on project, team, or architecture
```text

---

## When to Add Decisions

**Do add:**

- Architectural patterns (MVC, microservices, event-driven)
- Technology choices (why FastAPI over Flask)
- Coding conventions (naming, structure, testing approach)
- Process decisions (branching strategy, deployment process)
- Resolving design debates (document why you chose X over Y)

**Don't add:**

- Temporary decisions (use `cortex/THOUGHTS.md` instead)
- Implementation details (use inline comments instead)
- Bug fixes (use commit messages instead)
- Personal preferences without rationale

**Review cadence:** During Cortex planning sessions, promote decisions from THOUGHTS.md → DECISIONS.md when patterns solidify

---

**Next review:** After Phase 1 completion
