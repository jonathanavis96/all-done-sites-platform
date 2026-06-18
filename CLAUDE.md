# All Done Sites -- Claude Code Project Context

## Overview

All Done Sites is a website project built with Vite, React, and TypeScript using shadcn/ui components. The website is deployed to **Cloudflare Pages** (migrated off GitHub Pages 2026-06-13) on the custom domain `alldonesites.com`.

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **UI:** shadcn/ui, Tailwind CSS
- **Deploy:** **Cloudflare Pages** (project `alldonesites`). `.github/workflows/deploy.yml` builds the root site + the `legacy` branch at `/old`, then `npx wrangler pages deploy website/dist --project-name=alldonesites` on push to `main`. Repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (Jonathanavis96 CF account `1f95f998…`). DNS for `alldonesites.com` is on Cloudflare; apex + `www` are CNAME → `alldonesites.pages.dev`. (GitHub Pages retired as the deploy target — old Pages site is dormant.)
- **Domain:** `alldonesites.com` (+ `www`) — custom domains on the Pages project

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

## Client Sites & Off-site Footprint

> Durable rules. Credentials, listing IDs, and the canonical NAP live in the
> Obsidian vault note `Projects/AllDoneSites.md` (private) — never commit secrets
> to this file.

- **Client sites are separate repos** under `github.com/jonathanavis96`, not in
  this repo. Each is its own site with its own stack/deploy. Current map:
  - PC Quanti -> `pc_quanti` (Next static export, GH Pages)
  - ReachRight -> `reachright-marketing` (Vite SPA, GH Pages)
  - Deene Social -> `deene-social-presence` (Vite SPA, GH Pages, `website/`)
  - AI Focus (aifocus.work) -> `alan-breitler-affiliate-site` (Astro; Cloudflare
    Pages @ aifocus.work + GH Pages; repo name is leftover template)
  - Jacqui Chowles -> `jacqui-website` (Astro, GH Pages, `website/`)
  - Baobab Wines -> `baobab-wines` (Next.js + TinaCMS, GH Pages; live domain
    currently Squarespace)
  - RankSentinel -> `ranksentinel` (Next static export)
- **House default for client sites:** a discreet footer credit "Built and
  maintained by All Done Sites" -> `https://alldonesites.com` (dofollow, muted,
  matched to each site's own accent colour — not a fixed colour). Legal cover =
  the Credit/Attribution clause in the Master Agreement + `terms.txt`.
- **RankSentinel deploy gotcha:** its marketing site is served from a **VPS**
  (nginx docroot `website/out`) off the **`vps` branch**, NOT `main`/GH Pages
  (Pages is disabled there, so the GH Action 404s). To publish: edit on `vps`,
  then on the VPS `git pull && cd website && npm run build`.
- **Email:** `hello@alldonesites.com` is a **Zoho** mailbox (MX -> zoho.com), not
  Google Workspace. Directory/business accounts use the `alldonesites@gmail.com`
  Google account.
- **Browser/automation:** use the Playwright MCP browser signed in as
  `alldonesites@gmail.com` (authuser=1) for directory/business work; for plain
  screenshots use isolated headless Chrome (per global `CLAUDE.md`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
