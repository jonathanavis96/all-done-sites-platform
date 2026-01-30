---
name: business-ideas
description: "When the user wants to systematically generate and evaluate business ideas by finding real market gaps and mapping them to automatable solutions (especially suited to the Brain system: skill generation + autonomous workflows). Use when the user asks for 'business ideas', 'market gaps', 'opportunities', 'passive income ideas', or 'autonomous business model'."
---

# Skill: business-ideas

## 1) Intent (1 sentence)

Enable agents to reliably find, validate, and score business opportunities by researching real problems and translating them into automatable products/services.

## 2) Type

Procedure / Strategy

## 3) Trigger Conditions (When to use)

Use this skill when ANY of these are true:

- You need business ideas grounded in real demand (not brainstorming).
- You want to identify market gaps and underserved segments.
- You want ideas that can be run mostly or fully autonomously after setup.
- You want ideas that specifically exploit Brain’s strengths: (a) generate new skills quickly, (b) run scheduled workflows, (c) produce reports/artifacts.

## 4) Non-Goals (What NOT to do)

- Don’t “invent” ideas without sourcing evidence of a problem.
- Don’t pick ideas requiring heavy bespoke delivery or ongoing human judgment (unless autonomy requirement allows it).
- Don’t rely on a single source (triangulate).
- Don’t ignore legal/ethical constraints (scraping, data licensing, regulated advice).

## 5) Inputs Required (and how to confirm)

The agent must gather/confirm:

- **Autonomy target** (100% autonomous / mostly autonomous / semi-autonomous) (confirm: user chooses one).
- **Distribution channel preference** (SEO / marketplaces / B2B outbound / existing audience) (confirm: user chooses).
- **Constraints** (budget, time, scraping limits, regulated domains) (confirm: explicit list).
- **Success metric** (e.g., revenue/month, traffic/month, #customers) (confirm: numeric target).

## 6) Files / Sources to Study (DON'T SKIP)

Study these before acting:

- `skills/domains/code-quality/research-patterns.md` (research workflow + CRAAP test + triangulation)
- `skills/domains/code-quality/research-cheatsheet.md` (quick execution loop)
- `skills/domains/marketing/seo/programmatic-seo.md` (SEO-as-distribution and scalable pages)
- `skills/domains/marketing/growth/free-tool-strategy.md` (tool-based growth)

Rules:

- Local-first: search existing repo skills for relevant patterns before external research.
- Prefer sources with track record and low incentive to mislead (avoid pure hype/affiliate content).

## 7) Procedure (LLM Playbook)

Follow in order.

### Step 1: Orient (define the exact research question)

Write the research question in 1 sentence, for example:

- “What business models can be set up once and run autonomously using periodic data collection + report delivery?”
- “What recurring problems in [niche] can be automated into a monitoring/reporting subscription?”

Set a budget (time-box): e.g., 3–6 sources total, stop at saturation.

### Step 2: Local-first (what can Brain already do?)

List the native strengths you can exploit:

- Scheduled runs (cron-like workflows)
- Data ingestion (APIs, feeds, controlled scraping)
- Summarization + synthesis into artifacts (reports, dashboards)
- Skill generation (turn edge cases into new procedures)
- Validation loops (tests/lint/quality gates)

Translate strengths into business “primitives”:

- **Monitor → Diff → Alert**
- **Collect → Score → Recommend**
- **Generate → Publish** (content/tools/templates)

### Step 3: External research (source problems, not ideas)

Use multiple source types:

1. **Problem language**: forums/reviews/job posts (what people complain about, pay for, or do repeatedly).
2. **Market signal**: marketplaces (best sellers, recurring subscriptions, common categories).
3. **Distribution signal**: keyword patterns (long-tail, high intent, low competition).
4. **Willingness-to-pay proxies**: existing tools/pricing pages.

Apply CRAAP quickly to each source.

### Step 4: Convert problems into “automatable offers”

For each discovered problem, map:

- **Who** (segment)
- **Job to be done** (what outcome they want)
- **Trigger** (when they feel pain)
- **Current workaround** (manual steps)
- **Automation shape** (what Brain workflow can do)
- **Output artifact** (email report, dashboard, file, API)

Prefer recurring problems with clear measurable outputs.

### Step 5: Score ideas with an autonomy-first rubric

Score 0–5 on each dimension:

- **Automation completeness** (can it run end-to-end without judgment?)
- **Self-serve distribution** (SEO/marketplace viability)
- **Fulfillment cost** (near-zero marginal cost?)
- **Support burden** (predictable edge cases?)
- **Data durability** (inputs won’t break weekly?)
- **Legal risk** (low risk is higher score)

Compute a total score and keep the top 3–5.

### Step 6: Define the “MVP loop” for the top ideas

Even for autonomous businesses, validate cheaply:

- Build a thin pipeline that produces the output artifact once.
- Run it on 3–10 public examples (or your own targets).
- Check: does it produce value without manual interpretation?

### Step 7: Productize (make it set-and-forget)

Add the missing pieces that reduce human involvement:

- Self-serve onboarding (forms/config)
- Automated scheduling
- Automated delivery (email/webhook)
- Auto-retry + alerts on failure
- Documentation + FAQ

### Step 8: Record and turn the workflow into skills

For the chosen business, create/extend skills that cover:

- Data collection
- Scoring/heuristics
- Output templates
- Monitoring/alerts
- Edge case handling

This is Brain’s compounding advantage: each exception becomes a reusable skill.

## 8) Output / Deliverables

This skill is complete when these exist:

- A ranked list of 10–30 opportunities with evidence links and scores.
- A short list (top 3–5) with MVP definitions and automation plans.
- A decision recommendation (pick 1) with next actions.

## 9) Quick Reference Tables

### At a Glance

| Concept | Description | Example |
|---------|-------------|---------|
| `problem-first` | Source complaints/workarounds before proposing a solution | Pull 20 review snippets from a category, cluster themes |
| `automation-shape` | Match a problem to a workflow primitive | Monitor → Diff → Alert (competitor price changes) |
| `artifact-output` | The deliverable that customers pay for | Weekly email report + dashboard link |
| `autonomy-rubric` | Score ideas by how little human work they need | 6 dimensions, 0–5 each |
| `compounding-skills` | Turn exceptions into reusable skills | “New edge case → new playbook step” |

### Common Mistakes

| ❌ Don’t | ✅ Do | Why |
|----------|-------|-----|
| Start with “cool ideas” | Start with observable pain + evidence | Prevents building things nobody wants |
| Build a big SaaS first | Build a pipeline that outputs a valuable report first | Validates value cheaply |
| Use one source | Triangulate 2–3 independent sources | Reduces bias and stale info |
| Pick high-support offers | Prefer low-variance, templated outputs | Support kills autonomy |
| Ignore data rights | Prefer official APIs/feeds or clear permission | Prevents shutdown risk |

## 10) Gotchas / Failure Modes

| Failure Mode | Mitigation |
|--------------|------------|
| “Autonomous” idea still needs judgment | Redesign output into measurable checks + clear thresholds |
| Data source breaks (scraping) | Prefer APIs/feeds; add monitoring + fallback sources |
| No distribution channel | Choose SEO patterns or marketplaces with existing demand |
| Legal risk creep | Avoid regulated advice; document licensing and usage rights |

## 11) Minimal Example (repo-specific)

**Context:** Find an autonomous subscription idea Brain can run weekly.

**Steps taken:**

1. Use `research-patterns.md` to gather 3 sources on “finding startup ideas” and “product-market fit”.
2. Extract problem-first principles and define 3 workflow primitives Brain can automate.
3. Generate 15 ideas, score them with the autonomy rubric, select top 3.

**Result:**
A scored shortlist with clear MVP loops and an automation plan.

---

## Sources (starting set)

- Wikipedia: Product-market fit (definition) - <https://en.wikipedia.org/wiki/Product-market_fit>
- Wikipedia: Lean startup (validated learning framing) - <https://en.wikipedia.org/wiki/Lean_startup>
- Paul Graham: How to Get Startup Ideas (problem-first principle) - <https://www.paulgraham.com/startupideas.html>
