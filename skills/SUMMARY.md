# Skills Summary

## 🚨 Error Quick Reference (Check Here First When Errors Occur!)

**When any command/tool fails during your iteration, consult this table immediately.**

### Verifier Rule Failures

| Failed Rule Pattern | What It Means | Where to Find Fix |
|---------------------|---------------|-------------------|
| `Protected.*` | Protected file hash mismatch (loop.sh, verifier.sh, PROMPT.md modified) | **HUMAN INTERVENTION REQUIRED** - You cannot fix this. Report to human. |
| `Hygiene.Shellcheck.1` | SC2034: Unused variables in current_ralph_tasks.sh | [Shell Variable Patterns](domains/languages/shell/variable-patterns.md) - See "SC2034: Unused Variable" |
| `Hygiene.Shellcheck.2` | SC2155: Declare and assign separately in current_ralph_tasks.sh | [Shell Variable Patterns](domains/languages/shell/variable-patterns.md) - See "SC2155: Masked Return Values" |
| `Hygiene.Shellcheck.3` | SC2034: Unused variables in thunk_ralph_tasks.sh | [Shell Variable Patterns](domains/languages/shell/variable-patterns.md) |
| `Hygiene.Shellcheck.4` | SC2155: Declare and assign separately in thunk_ralph_tasks.sh | [Shell Variable Patterns](domains/languages/shell/variable-patterns.md) |
| `Hygiene.Markdown.*` | Missing code fence language tags, duplicate headings | [Markdown Patterns](domains/code-quality/markdown-patterns.md) - See MD040, MD024 |
| `Hygiene.TermSync.*` | Terminology inconsistency in documentation | [Code Consistency](domains/code-quality/code-consistency.md) |
| `Hygiene.TemplateSync.*` | Template files out of sync | [Code Consistency](domains/code-quality/code-consistency.md) |
| `AntiCheat.*` | Forbidden pattern/marker detected in code | **Remove the flagged marker/phrase from your code** |
| `freshness_check` | Verifier infrastructure issue (run_id mismatch) | **HUMAN INTERVENTION REQUIRED** - Report to human |
| `init_baselines` | Verifier baseline initialization failed | **HUMAN INTERVENTION REQUIRED** - Report to human |

### Common Runtime Errors

| Error Type | Symptoms | Skill Reference |
|------------|----------|-----------------|
| **Shell/Bash errors** | Command not found, syntax errors, exit code != 0 | [Shell README](domains/languages/shell/README.md), [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| **ShellCheck warnings** | SC2034, SC2155, SC2086, etc. | [Variable Patterns](domains/languages/shell/variable-patterns.md), [Strict Mode](domains/languages/shell/strict-mode.md) |
| **Python errors** | ImportError, AttributeError, TypeError, scope errors ("cannot access local variable") | [Python Patterns](domains/languages/python/python-patterns.md) |
| **API/HTTP errors** | 401, 403, 429, 500, timeout | [Error Handling Patterns](domains/backend/error-handling-patterns.md), [API Design Patterns](domains/backend/api-design-patterns.md) |
| **Git errors** | Merge conflicts, detached HEAD, push rejected | [Deployment Patterns](domains/infrastructure/deployment-patterns.md) |
| **JSON/Config errors** | Parse errors, missing keys, invalid values | [Config Patterns](domains/backend/config-patterns.md) |
| **Test failures** | Assert errors, mock issues, timeout | [Testing Patterns](domains/code-quality/testing-patterns.md) |
| **Build/compile errors** | Missing dependencies, syntax errors | Check project-specific docs in [Projects](projects/) |

### Error Code Index

**ShellCheck (SC\*) Errors:**

| Error Code | Description | Skill Reference |
|------------|-------------|-----------------|
| SC1091 | Sourcing file not found | [Validation Patterns](domains/languages/shell/validation-patterns.md) |
| SC2002 | Useless cat | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2004 | $/${} arithmetic deprecation | [Variable Patterns](domains/languages/shell/variable-patterns.md) |
| SC2006 | Backticks deprecated | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2009 | pgrep instead of ps \| grep | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2012 | Use find instead of ls | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2034 | Unused variable | [Variable Patterns](domains/languages/shell/variable-patterns.md) |
| SC2039 | POSIX compliance issues | [Validation Patterns](domains/languages/shell/validation-patterns.md) |
| SC2046 | Quote to prevent word splitting | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2064 | Quote trap commands | [Cleanup Patterns](domains/languages/shell/cleanup-patterns.md) |
| SC2086 | Quote variables to prevent globbing | [Variable Patterns](domains/languages/shell/variable-patterns.md), [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2126 | grep -c instead of grep \| wc -l | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2148 | Missing shebang | [Validation Patterns](domains/languages/shell/validation-patterns.md) |
| SC2153 | Variable name typo | [Variable Patterns](domains/languages/shell/variable-patterns.md) |
| SC2154 | Variable not assigned | [Variable Patterns](domains/languages/shell/variable-patterns.md) |
| SC2155 | Declare and assign separately | [Variable Patterns](domains/languages/shell/variable-patterns.md), [Strict Mode](domains/languages/shell/strict-mode.md) |
| SC2162 | read without -r | [Common Pitfalls](domains/languages/shell/common-pitfalls.md) |
| SC2181 | Check exit code directly | [Strict Mode](domains/languages/shell/strict-mode.md) |
| SC2317 | Unreachable command | [Cleanup Patterns](domains/languages/shell/cleanup-patterns.md) |
| SC2320 | set -e and command substitution | [Strict Mode](domains/languages/shell/strict-mode.md) |

**Markdown Lint (MD\*) Errors:**

| Error Code | Description | Skill Reference |
|------------|-------------|-----------------|
| MD022 | Headings need blank lines | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD024 | Duplicate heading names | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD025 | Multiple top-level headings | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD032 | Blanks around lists | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD036 | Emphasis instead of heading | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD040 | Missing code fence language | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD050 | Strong style consistency | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |
| MD060 | Table spacing | [Markdown Patterns](domains/code-quality/markdown-patterns.md) |

**Python Errors:**

| Error Code | Description | Skill Reference |
|------------|-------------|-----------------|
| E0601 | Using variable before assignment | [Python Patterns](domains/languages/python/python-patterns.md) |
| E0602 | Undefined variable | [Python Patterns](domains/languages/python/python-patterns.md) |
| E1101 | No member (attribute) | [Python Patterns](domains/languages/python/python-patterns.md) |
| F821 | Undefined name | [Python Patterns](domains/languages/python/python-patterns.md) |
| UnboundLocalError | Local variable referenced before assignment | [Python Patterns](domains/languages/python/python-patterns.md) |

**HTTP Status Codes:**

| Status Code | Description | Skill Reference |
|-------------|-------------|-----------------|
| 400 | Bad Request | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 401 | Unauthorized | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 403 | Forbidden | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 404 | Not Found | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 429 | Too Many Requests | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 500 | Internal Server Error | [API Design Patterns](domains/backend/api-design-patterns.md) |
| 503 | Service Unavailable | [API Design Patterns](domains/backend/api-design-patterns.md) |

**Testing Errors:**

| Error Type | Description | Skill Reference |
|------------|-------------|-----------------|
| AssertionError | Test assertion failed | [Testing Patterns](domains/code-quality/testing-patterns.md) |
| pytest.fail | Explicit test failure | [Testing Patterns](domains/code-quality/testing-patterns.md) |
| jest.fail | Explicit test failure (JS) | [Testing Patterns](domains/code-quality/testing-patterns.md) |
| testing.T.Errorf | Go test failure | [Testing Patterns](domains/code-quality/testing-patterns.md) |

**Cache/Performance Issues:**

| Issue Type | Description | Skill Reference |
|------------|-------------|-----------------|
| cache-miss | Cache lookup failed | [Caching Patterns](domains/backend/caching-patterns.md) |
| cache-invalidation | Stale cache data | [Caching Patterns](domains/backend/caching-patterns.md) |
| stale-cache | Cache not updating | [Caching Patterns](domains/backend/caching-patterns.md) |
| TTL | Time-to-live expiration | [Caching Patterns](domains/backend/caching-patterns.md) |

**Code Quality Issues:**

| Issue Type | Description | Skill Reference |
|------------|-------------|-----------------|
| dead-code | Unused code | [Code Hygiene](domains/code-quality/code-hygiene.md) |
| unused-imports | Unused dependencies | [Code Hygiene](domains/code-quality/code-hygiene.md) |
| linting | Code style violations | [Code Hygiene](domains/code-quality/code-hygiene.md) |
| formatting | Code formatting issues | [Code Hygiene](domains/code-quality/code-hygiene.md) |
| find-and-replace | Bulk editing needed | [Bulk Edit Patterns](domains/code-quality/bulk-edit-patterns.md) |
| sed | Stream editing needed | [Bulk Edit Patterns](domains/code-quality/bulk-edit-patterns.md) |
| batch-editing | Mass changes needed | [Bulk Edit Patterns](domains/code-quality/bulk-edit-patterns.md) |
| semantic-analysis | Logic bugs beyond syntax | [Semantic Code Review](domains/code-quality/semantic-code-review.md) |
| llm-code-review | LLM-based code checking | [Semantic Code Review](domains/code-quality/semantic-code-review.md) |
| code-intent-checking | Verify code matches description | [Semantic Code Review](domains/code-quality/semantic-code-review.md) |

**Generic Error Handling:**

| Issue Type | Description | Skill Reference |
|------------|-------------|-----------------|
| Error | Generic error | [Error Handling Patterns](domains/backend/error-handling-patterns.md) |
| Exception | Exception thrown | [Error Handling Patterns](domains/backend/error-handling-patterns.md) |
| try-catch | Exception handling | [Error Handling Patterns](domains/backend/error-handling-patterns.md) |
| panic-recover | Go panic handling | [Error Handling Patterns](domains/backend/error-handling-patterns.md) |

### Quick Action Guide

**If you see a verifier failure (LAST_VERIFIER_RESULT: FAIL):**

1. Check the injected `# VERIFIER STATUS` section in the prompt header (DO NOT read `.verify/latest.txt`)
2. Look up the failed rule in the table above
3. If it says "HUMAN INTERVENTION REQUIRED" - stop and report
4. Otherwise, consult the linked skill document
5. Apply the fix and commit with: `fix(ralph): resolve AC failure <RULE_ID>`

**If you encounter a runtime error (command/tool failure):**

1. Note the error type (shell, Python, API, etc.)
2. Look up the error type in the "Common Runtime Errors" table above
3. Read the linked skill document
4. Apply the minimum fix
5. Re-run the failing command

**For multi-step workflows or complex debugging:**

- Consult the [Playbooks Directory](playbooks/README.md) for end-to-end guides
- Examples: [Resolve Verifier Failures](playbooks/resolve-verifier-failures.md), [Debug Ralph Stuck](playbooks/debug-ralph-stuck.md), [Investigate Test Failures](playbooks/investigate-test-failures.md)

**Rule: Only 1 "obvious" quick attempt before consulting skills.**

---

## Purpose

This repository serves as a **skills knowledge base** for RovoDev and parallel agents. It contains curated performance optimization guidelines, best practices, reusable patterns, and a self-improvement system optimized for agent consumption with minimal token overhead.

## What's Inside

**Note:** External performance references (like React best practices) have been moved to individual project repositories. This brain repository focuses on worker infrastructure and reusable skills.

### Skills Directories

- **[Domains](domains/README.md)** - Technical domain knowledge and reusable patterns (authentication, caching, API design, etc.)
  - [Agent Observability Patterns](domains/infrastructure/agent-observability-patterns.md) - Event markers, iteration tracking, cache observability, tool instrumentation
  - [Authentication Patterns](domains/backend/auth-patterns.md) - OAuth2, JWT, session management
  - [Caching Patterns](domains/backend/caching-patterns.md) - Redis, in-memory, CDN, and browser caching strategies
  - [API Design Patterns](domains/backend/api-design-patterns.md) - REST, GraphQL, versioning, error handling
  - [Change Propagation](domains/ralph/change-propagation.md) - Template sync, knowledge persistence, verification checklists
  - [Bulk Edit Patterns](domains/code-quality/bulk-edit-patterns.md) - Bulk editing strategies and markdown auto-fix patterns
  - [Code Consistency](domains/code-quality/code-consistency.md) - Documentation accuracy, terminology, parsing consistency
  - [Code Review Patterns](domains/code-quality/code-review-patterns.md) - Automated and manual code review strategies
  - [Config Patterns](domains/backend/config-patterns.md) - Portable configs, templates, environment variables
  - [Database Patterns](domains/backend/database-patterns.md) - Schema design, ORMs, query optimization, migrations, transactions
  - [SQLite Schema/Test Alignment](domains/backend/sqlite-schema-test-alignment.md) - Keep schema, migrations, and pytest fixtures in lockstep (avoid missing table / NOT NULL drift)
  - [Markdown Patterns](domains/code-quality/markdown-patterns.md) - Lint rules (MD040, MD024, MD050), documentation accuracy
  - [Python Patterns](domains/languages/python/python-patterns.md) - datetime, f-strings, JSON handling, type hints, import scope
  - [Semantic Code Review](domains/code-quality/semantic-code-review.md) - Context-aware code review and quality analysis
  - [Testing Patterns](domains/code-quality/testing-patterns.md) - Unit, integration, e2e testing across Jest, pytest, Go testing
  - [Test Coverage Patterns](domains/code-quality/test-coverage-patterns.md) - Coverage tracking, differential coverage, CI integration
  - [Research Patterns](domains/code-quality/research-patterns.md) - Systematic research methodology (CRAAP test, triangulation, source evaluation)
    - [Research Cheatsheet](domains/code-quality/research-cheatsheet.md) - One-page quick reference
  - [Token Efficiency](domains/code-quality/token-efficiency.md) - Token optimization strategies for AI agents
  - [Ralph Loop Architecture](domains/ralph/ralph-patterns.md) - How Ralph works internally (subagents, tool visibility, execution flow)
  - [Bootstrap Patterns](domains/ralph/bootstrap-patterns.md) - Project bootstrapping, scaffold templates, initialization flows
  - [Cache Debugging](domains/ralph/cache-debugging.md) - Cache troubleshooting, invalidation, performance analysis
  - [Thread Search Patterns](domains/ralph/thread-search-patterns.md) - Search and analyze Ralph thread history
  - [Tool Wrapper Patterns](domains/ralph/tool-wrapper-patterns.md) - Wrap external tools for Ralph integration
  - [Code Hygiene](domains/code-quality/code-hygiene.md) - Dead code removal, linting, formatting consistency
  - [Deployment Patterns](domains/infrastructure/deployment-patterns.md) - CI/CD, rollout strategies, environment management
  - [Disaster Recovery Patterns](domains/infrastructure/disaster-recovery-patterns.md) - Backup strategies, failover procedures, recovery testing
  - [Discord Webhook Patterns](domains/infrastructure/discord-webhook-patterns.md) - Discord notifications and webhook integration
  - [Error Handling Patterns](domains/backend/error-handling-patterns.md) - Exception handling, error boundaries, retry strategies
  - [Observability Patterns](domains/infrastructure/observability-patterns.md) - Logging, metrics, tracing, alerting
  - [Secrets Management](domains/infrastructure/secrets-management.md) - Secure credential storage and rotation
  - [Security Patterns](domains/infrastructure/security-patterns.md) - Input validation, secrets management, secure defaults
  - [State Management Patterns](domains/infrastructure/state-management-patterns.md) - React state, global stores, persistence
  - **[Frontend Development](domains/frontend/README.md)** - Frontend development overview
    - [Accessibility Patterns](domains/frontend/accessibility-patterns.md) - WCAG compliance, ARIA attributes, keyboard navigation, screen reader support
    - [Component Architecture](domains/frontend/component-architecture.md) - Component design and organization patterns
    - [React Patterns](domains/frontend/react-patterns.md) - Component composition, hooks, state management, performance optimization
    - [Vue Patterns](domains/frontend/vue-patterns.md) - Vue.js composition API, reactivity, lifecycle management
  - **[Go Patterns](domains/languages/go/README.md)** - Go idioms, concurrency, error handling, testing patterns
    - [Go Patterns](domains/languages/go/go-patterns.md) - Goroutines, channels, defer, interfaces, struct composition
  - **[JavaScript Patterns](domains/languages/javascript/README.md)** - Modern JavaScript (ES6+), async patterns, module systems
    - [JavaScript Patterns](domains/languages/javascript/javascript-patterns.md) - Promises, async/await, destructuring, modules
  - **[TypeScript Patterns](domains/languages/typescript/README.md)** - Type system fundamentals, generics, advanced types, JavaScript integration
  - **[Shell Scripting](domains/languages/shell/README.md)** - Bash best practices, ShellCheck patterns, cleanup/traps
    - [Strict Mode](domains/languages/shell/strict-mode.md) - `set -euo pipefail` patterns
    - [Variable Patterns](domains/languages/shell/variable-patterns.md) - SC2155, SC2034, scoping
    - [Cleanup Patterns](domains/languages/shell/cleanup-patterns.md) - Traps, temp files, state restoration
    - [Common Pitfalls](domains/languages/shell/common-pitfalls.md) - TTY guards, magic numbers, DRY
    - [Validation Patterns](domains/languages/shell/validation-patterns.md) - Shell project validation (syntax, shellcheck, permissions, security)
  - **[Anti-Patterns](domains/anti-patterns/README.md)** - Common mistakes to avoid across documentation, code, and workflows
    - [Documentation Anti-Patterns](domains/anti-patterns/documentation-anti-patterns.md) - Stale links, missing examples, wall of text, unclear structure
    - [Markdown Anti-Patterns](domains/anti-patterns/markdown-anti-patterns.md) - Formatting mistakes, lint violations (MD040, MD024, MD012)
    - [Ralph Anti-Patterns](domains/anti-patterns/ralph-anti-patterns.md) - Task batching, skipping validation, token waste, duplicate commands
    - [Shell Anti-Patterns](domains/anti-patterns/shell-anti-patterns.md) - Unquoted variables, missing error handling, glob injection, silent failures
  - **[Marketing](domains/marketing/README.md)** - Marketing skills for CRO, SEO, content, strategy, and growth
    - **CRO (Conversion Rate Optimization)**
      - [Page CRO](domains/marketing/cro/page-cro.md) - Optimize marketing pages for conversions
      - [Form CRO](domains/marketing/cro/form-cro.md) - Optimize forms for completion rates
      - [Popup CRO](domains/marketing/cro/popup-cro.md) - Optimize popups and modals
      - [Signup Flow CRO](domains/marketing/cro/signup-flow-cro.md) - Optimize signup/registration flows
      - [Onboarding CRO](domains/marketing/cro/onboarding-cro.md) - Optimize post-signup activation
      - [Paywall Upgrade CRO](domains/marketing/cro/paywall-upgrade-cro.md) - Optimize upgrade/paywall conversions
      - [A/B Test Setup](domains/marketing/cro/ab-test-setup.md) - Set up and analyze A/B tests
    - **SEO**
      - [SEO Audit](domains/marketing/seo/seo-audit.md) - Audit and diagnose SEO issues
      - [Programmatic SEO](domains/marketing/seo/programmatic-seo.md) - Build pages at scale for keywords
      - [Schema Markup](domains/marketing/seo/schema-markup.md) - Add structured data markup
    - **Content**
      - [Copywriting](domains/marketing/content/copywriting.md) - Write marketing copy for pages
      - [Copy Editing](domains/marketing/content/copy-editing.md) - Edit and improve existing copy
      - [Email Sequence](domains/marketing/content/email-sequence.md) - Write email marketing sequences
      - [Social Content](domains/marketing/content/social-content.md) - Create social media content
    - **Strategy**
      - [Pricing Strategy](domains/marketing/strategy/pricing-strategy.md) - Design pricing models and pages
      - [Launch Strategy](domains/marketing/strategy/launch-strategy.md) - Plan product launches
      - [Marketing Ideas](domains/marketing/strategy/marketing-ideas.md) - Generate marketing ideas
      - [Business Ideas](domains/marketing/strategy/business-ideas.md) - Generate and evaluate business ideas (market gaps, autonomy-first)
      - [Marketing Psychology](domains/marketing/strategy/marketing-psychology.md) - Apply psychology to marketing
      - [Competitor Alternatives](domains/marketing/strategy/competitor-alternatives.md) - Analyze competitors and positioning
    - **Growth**
      - [Free Tool Strategy](domains/marketing/growth/free-tool-strategy.md) - Build free tools for lead gen
      - [Referral Program](domains/marketing/growth/referral-program.md) - Design referral programs
      - [Paid Ads](domains/marketing/growth/paid-ads.md) - Run paid advertising campaigns
      - [Analytics Tracking](domains/marketing/growth/analytics-tracking.md) - Set up analytics and tracking
  - **[Website Development](domains/websites/README.md)** - Website development overview
    - **Architecture**
      - [Section Composer](domains/websites/architecture/section-composer.md) - Section-based page composition
      - [Sitemap Builder](domains/websites/architecture/sitemap-builder.md) - Sitemap planning and structure
      - [Tech Stack Chooser](domains/websites/architecture/tech-stack-chooser.md) - Technology selection guidance
    - **Build**
      - [Analytics Tracking](domains/websites/build/analytics-tracking.md) - Analytics integration patterns
      - [Component Development](domains/websites/build/component-development.md) - Component development workflow
      - [Forms Integration](domains/websites/build/forms-integration.md) - Form handling and integration
      - [Mobile First](domains/websites/build/mobile-first.md) - Mobile-first development approach
      - [Performance](domains/websites/build/performance.md) - Performance optimization strategies
      - [SEO Foundations](domains/websites/build/seo-foundations.md) - SEO fundamentals
    - **Copywriting**
      - [CTA Optimizer](domains/websites/copywriting/cta-optimizer.md) - Call-to-action optimization
      - [Objection Handler](domains/websites/copywriting/objection-handler.md) - Objection handling in copy
      - [Value Proposition](domains/websites/copywriting/value-proposition.md) - Value proposition development
    - **Design**
      - [Color System](domains/websites/design/color-system.md) - Color system design
      - [Design Direction](domains/websites/design/design-direction.md) - Design direction and vision
      - [Spacing Layout](domains/websites/design/spacing-layout.md) - Spacing and layout systems
      - [Typography System](domains/websites/design/typography-system.md) - Typography system design
    - **Discovery**
      - [Audience Mapping](domains/websites/discovery/audience-mapping.md) - Audience research and mapping
      - [Requirements Distiller](domains/websites/discovery/requirements-distiller.md) - Requirements gathering and distillation
      - [Scope Control](domains/websites/discovery/scope-control.md) - Scope management
    - **Launch**
      - [Deployment](domains/websites/launch/deployment.md) - Deployment procedures
      - [Finishing Pass](domains/websites/launch/finishing-pass.md) - Final QA and polish
    - **QA**
      - [Acceptance Criteria](domains/websites/qa/acceptance-criteria.md) - Acceptance criteria definition
      - [Accessibility](domains/websites/qa/accessibility.md) - Accessibility testing and compliance
      - [Visual QA](domains/websites/qa/visual-qa.md) - Visual quality assurance
- **[Projects](projects/README.md)** - Project-specific conventions, decisions, and context
  - [Brain Repository](projects/brain-example.md) - Brain-specific conventions and Ralph usage
- **[Self-Improvement](self-improvement/README.md)** - Gap capture and skill promotion system
  - [Gap Capture Rules](self-improvement/GAP_CAPTURE_RULES.md) - Mandatory rules for capturing knowledge gaps
    - **Rule 6: Cross-Project Gap Sync** - Projects capture gaps locally in `cortex/GAP_CAPTURE.md`, create `.gap_pending` marker, and brain syncs via `cortex/sync_gaps.sh`
  - [Gap Backlog](self-improvement/GAP_BACKLOG.md) - Raw log of discovered gaps
  - [Skill Backlog](self-improvement/SKILL_BACKLOG.md) - Promotion queue for gaps ready to become skills
  - [Skill Template](self-improvement/SKILL_TEMPLATE.md) - Template for creating new skill files

### Skills Index

- **[Skills Index](index.md)** - Complete catalog of all available skills

## See Also

- **[index.md](index.md)** - Complete skills catalog
- **[domains/README.md](domains/README.md)** - Domain-specific patterns overview
- **[self-improvement/README.md](self-improvement/README.md)** - Gap capture and skill development protocol
- **[playbooks/README.md](playbooks/README.md)** - Operational playbooks for common tasks
- **[AGENTS.md](../AGENTS.md)** - Brain repository operational guide
- **[workers/ralph/AGENTS.md](../workers/ralph/AGENTS.md)** - Ralph-specific guidance

### Playbooks (Multi-Step Workflows)

- **[Playbooks Directory](playbooks/README.md)** - End-to-end workflows for complex tasks

**When to use a playbook vs a skill:**

- **Use a skill** when you need to understand a single concept (e.g., "How do I fix SC2155?") or need quick reference material
- **Use a playbook** when tackling a multi-step process (e.g., "How do I resolve verifier failures?") or when the task requires decision points and orchestration across multiple skills/tools

**Available playbooks:**

- [Bootstrap New Project](playbooks/bootstrap-new-project.md) - Set up a new project from templates
- [Debug Ralph Stuck](playbooks/debug-ralph-stuck.md) - Troubleshoot Ralph loop issues (stuck, repeated failures, infinite loops)
- [Decompose Large Tasks](playbooks/decompose-large-tasks.md) - Break down complex tasks into atomic units
- [Fix Markdown Lint](playbooks/fix-markdown-lint.md) - Resolve markdown linting issues (MD040, MD032, MD024)
- [Fix ShellCheck Failures](playbooks/fix-shellcheck-failures.md) - Systematic approach to resolving shellcheck warnings (SC2034, SC2155, SC2086)
- [Investigate Test Failures](playbooks/investigate-test-failures.md) - Systematic test failure resolution (pytest, bash, integration tests)
- [Resolve Verifier Failures](playbooks/resolve-verifier-failures.md) - Handle verifier check failures with decision tree routing
- [Safe Template Sync](playbooks/safe-template-sync.md) - Synchronize changes between workers/ and templates/
- [Task Optimization Review](playbooks/task-optimization-review.md) - Review and optimize task definitions

## Skills Authoring

- **[Conventions](conventions.md)** - Guidelines for creating and maintaining skill files (required structure, naming, style)

## How Agents Should Use This Repository

1. **Start here** (`skills/SUMMARY.md`) to understand what's available
2. **Check the [Skills Index](index.md)** for a complete catalog
3. **Consult the HOTLIST** first for common scenarios
4. **Fan out to specific rules** only when deeper knowledge is required
5. **Log gaps** in the self-improvement system when you discover missing capabilities
6. **Never scan** the entire rules directory unless explicitly instructed

## Repository Structure

```text
brain/ (repository root)
├── README.md                    # Human-readable overview
├── cortex/                      # Manager layer (Cortex)
├── workers/                     # Execution layer (Ralph, etc.)
│   └── ralph/                   # Ralph worker
├── skills/                      # THIS DIRECTORY - shared knowledge base
│   ├── SUMMARY.md              # This file - skills entrypoint
│   ├── index.md                # Complete skills catalog
│   ├── conventions.md          # Skills authoring guidelines
│   ├── domains/                # Broadly reusable skills
│   ├── projects/               # Project-specific skills
│   └── self-improvement/       # Gap capture & skill promotion system
│       ├── README.md
│       ├── GAP_CAPTURE_RULES.md
│       ├── skills/self-improvement/GAP_BACKLOG.md
│       ├── SKILL_BACKLOG.md
│       └── SKILL_TEMPLATE.md
├── templates/                   # Project scaffolding (shared)
├── rules/                       # Acceptance criteria (shared)
├── docs/                        # Project documentation (shared)
└── .verify/                     # Validation infrastructure (shared)
```text

## Freshness Status

**Last checked:** 2026-01-26

Run `bash tools/skill_freshness.sh` to see current freshness report.

**Quick summary:**

```bash
# Check freshness with 90-day threshold (default)
bash tools/skill_freshness.sh

# Check with custom threshold
bash tools/skill_freshness.sh --days 60

# Exit with error if any stale skills found (for CI)
bash tools/skill_freshness.sh --exit-on-stale
```

**Current status:** All skills are fresh (0-90 days old). See full report with command above.

## Design Philosophy

- **Low token overhead** - Start broad, drill down only when needed
- **Agent-first** - Optimized for programmatic consumption
- **Reference-focused** - Knowledge, not executable skills
- **Ralph Wiggum friendly** - Simple, obvious, no surprises

## Related Documentation

- **[NEURONS.md](../NEURONS.md)** - Brain repository structure map
- **[README.md](../README.md)** - Getting started and overview
- **[workers/ralph/AGENTS.md](../workers/ralph/AGENTS.md)** - Ralph operational guide
- **[self-improvement/README.md](self-improvement/README.md)** - Gap capture and skill development protocol
- **[docs/TOOLS.md](../docs/TOOLS.md)** - Available tools and utilities
