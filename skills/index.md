# Skills Index

Catalog of all skill files in the brain system.

---

## How to Use This Index

1. Scan categories below to find relevant skills
2. Click through to read full skill file
3. Follow the skill's trigger conditions and procedure

## Adding New Skills

1. Use `self-improvement/SKILL_TEMPLATE.md`
2. Place in correct folder (see placement rules below)
3. Update this index

### Placement Rules

| Scope | Location |
|-------|----------|
| Broadly reusable across repos | `skills/domains/<category>/<skill>.md` |
| Project-specific but reusable | `skills/projects/<project>/<skill>.md` |
| Uncertain | Default to `skills/domains/` with best-guess category |

---

## Domains (Broadly Reusable)

- [README.md](domains/README.md) - Domains overview and skill authoring guidelines

### Backend

- [api-design-patterns.md](domains/backend/api-design-patterns.md) - REST API design patterns and conventions
- [auth-patterns.md](domains/backend/auth-patterns.md) - Authentication and authorization patterns
- [caching-patterns.md](domains/backend/caching-patterns.md) - Caching strategies and patterns
- [config-patterns.md](domains/backend/config-patterns.md) - Portable configs, templates, environment variables
- [database-patterns.md](domains/backend/database-patterns.md) - Database design and query patterns
- [error-handling-patterns.md](domains/backend/error-handling-patterns.md) - Error handling strategies
- [sqlite-schema-test-alignment.md](domains/backend/sqlite-schema-test-alignment.md) - Keep SQLite schema, migrations, and tests in lockstep (avoid NOT NULL/missing table drift)

### Code Quality

- [bulk-edit-patterns.md](domains/code-quality/bulk-edit-patterns.md) - Bulk editing strategies and markdown auto-fix patterns
- [code-consistency.md](domains/code-quality/code-consistency.md) - Documentation accuracy, terminology, parsing consistency
- [code-hygiene.md](domains/code-quality/code-hygiene.md) - Definition of Done checklists
- [code-review-patterns.md](domains/code-quality/code-review-patterns.md) - Code review checklist for regex, scope, examples, documentation quality
- [semantic-code-review.md](domains/code-quality/semantic-code-review.md) - LLM-based semantic analysis patterns for logic validation and intent checking
- [markdown-patterns.md](domains/code-quality/markdown-patterns.md) - Lint rules (MD040, MD024, MD050), documentation accuracy
- [research-cheatsheet.md](domains/code-quality/research-cheatsheet.md) - One-page quick reference for research patterns
- [research-patterns.md](domains/code-quality/research-patterns.md) - Systematic research methodology for gathering and evaluating information
- [test-coverage-patterns.md](domains/code-quality/test-coverage-patterns.md) - Test coverage measurement and improvement strategies
- [testing-patterns.md](domains/code-quality/testing-patterns.md) - Testing strategies and patterns
- [token-efficiency.md](domains/code-quality/token-efficiency.md) - Token optimization strategies for AI agents

### Anti-Patterns

- [README.md](domains/anti-patterns/README.md) - Anti-patterns overview and common mistakes to avoid
- [documentation-anti-patterns.md](domains/anti-patterns/documentation-anti-patterns.md) - Common documentation mistakes (stale links, missing examples, wall of text)
- [markdown-anti-patterns.md](domains/anti-patterns/markdown-anti-patterns.md) - Markdown formatting mistakes and lint violations
- [ralph-anti-patterns.md](domains/anti-patterns/ralph-anti-patterns.md) - Ralph loop anti-patterns (batching tasks, skipping validation, token waste)
- [shell-anti-patterns.md](domains/anti-patterns/shell-anti-patterns.md) - Shell scripting anti-patterns (unquoted variables, missing error handling, glob injection)

### Frontend

- [README.md](domains/frontend/README.md) - Frontend development overview
- [react-patterns.md](domains/frontend/react-patterns.md) - React hooks, composition, state management, performance
- [accessibility-patterns.md](domains/frontend/accessibility-patterns.md) - ARIA, keyboard navigation, screen readers, WCAG compliance

### Infrastructure

- [agent-observability-patterns.md](domains/infrastructure/agent-observability-patterns.md) - Agent instrumentation, event markers, cache observability
- [deployment-patterns.md](domains/infrastructure/deployment-patterns.md) - Deployment and CI/CD patterns
- [disaster-recovery-patterns.md](domains/infrastructure/disaster-recovery-patterns.md) - Backup, recovery, and business continuity patterns
- [observability-patterns.md](domains/infrastructure/observability-patterns.md) - Logging, monitoring, tracing, and alerting patterns
- [security-patterns.md](domains/infrastructure/security-patterns.md) - Security best practices
- [state-management-patterns.md](domains/infrastructure/state-management-patterns.md) - State management patterns

### Languages

#### Go

- [README.md](domains/languages/go/README.md) - Go language overview and quick reference
- [go-patterns.md](domains/languages/go/go-patterns.md) - Error handling, goroutines, channels, context, interfaces

#### JavaScript

- [README.md](domains/languages/javascript/README.md) - Modern JavaScript (ES6+) patterns, async patterns, module systems
- [javascript-patterns.md](domains/languages/javascript/javascript-patterns.md) - Async/await, promises, modules, common gotchas

#### Python

- [python-patterns.md](domains/languages/python/python-patterns.md) - datetime, f-strings, JSON handling, type hints

#### Shell

- [README.md](domains/languages/shell/README.md) - Shell scripting overview and quick reference
- [cleanup-patterns.md](domains/languages/shell/cleanup-patterns.md) - Traps, temp files, state restoration
- [common-pitfalls.md](domains/languages/shell/common-pitfalls.md) - ShellCheck errors and gotchas
- [strict-mode.md](domains/languages/shell/strict-mode.md) - Strict mode (`set -euo pipefail`) patterns
- [validation-patterns.md](domains/languages/shell/validation-patterns.md) - Shell project validation (syntax, shellcheck, permissions, security)
- [variable-patterns.md](domains/languages/shell/variable-patterns.md) - SC2155, SC2034, scoping

#### TypeScript

- [README.md](domains/languages/typescript/README.md) - Type system fundamentals, generics, advanced types, JavaScript integration

### Ralph

- [bootstrap-patterns.md](domains/ralph/bootstrap-patterns.md) - Project bootstrapping patterns
- [cache-debugging.md](domains/ralph/cache-debugging.md) - Cache debugging and troubleshooting patterns
- [change-propagation.md](domains/ralph/change-propagation.md) - Change propagation and template sync
- [ralph-patterns.md](domains/ralph/ralph-patterns.md) - Ralph loop operational patterns
- [thread-search-patterns.md](domains/ralph/thread-search-patterns.md) - Search patterns for THUNK, git, and cache
- [tool-wrapper-patterns.md](domains/ralph/tool-wrapper-patterns.md) - Tool wrapper patterns and CLI integration

### Playbooks (End-to-End Workflows)

- [README.md](playbooks/README.md) - Playbook system overview and design philosophy
- [PLAYBOOK_TEMPLATE.md](playbooks/PLAYBOOK_TEMPLATE.md) - Template for creating new playbooks

**Available Playbooks:**

- [bootstrap-new-project.md](playbooks/bootstrap-new-project.md) - Set up a new project from templates
- [debug-ralph-stuck.md](playbooks/debug-ralph-stuck.md) - Troubleshoot Ralph loop issues
- [decompose-large-tasks.md](playbooks/decompose-large-tasks.md) - Break down complex tasks into atomic units
- [fix-markdown-lint.md](playbooks/fix-markdown-lint.md) - Resolve markdown linting issues
- [fix-shellcheck-failures.md](playbooks/fix-shellcheck-failures.md) - Systematic resolution of ShellCheck warnings
- [investigate-test-failures.md](playbooks/investigate-test-failures.md) - Systematic test failure resolution
- [resolve-verifier-failures.md](playbooks/resolve-verifier-failures.md) - Debug and fix verifier gate failures
- [safe-template-sync.md](playbooks/safe-template-sync.md) - Synchronize changes between workers/ and templates/
- [task-optimization-review.md](playbooks/task-optimization-review.md) - Review and optimize task definitions

### Projects

- [README.md](projects/README.md) - Project-specific skills overview
- [brain-example.md](projects/brain-example.md) - Example project-specific skill

### Marketing

- [README.md](domains/marketing/README.md) - Marketing skills overview

#### CRO (Conversion Rate Optimization)

- [page-cro.md](domains/marketing/cro/page-cro.md) - Optimize marketing pages for conversions
- [form-cro.md](domains/marketing/cro/form-cro.md) - Optimize forms for completion rates
- [popup-cro.md](domains/marketing/cro/popup-cro.md) - Optimize popups and modals
- [signup-flow-cro.md](domains/marketing/cro/signup-flow-cro.md) - Optimize signup/registration flows
- [onboarding-cro.md](domains/marketing/cro/onboarding-cro.md) - Optimize post-signup activation
- [paywall-upgrade-cro.md](domains/marketing/cro/paywall-upgrade-cro.md) - Optimize upgrade/paywall conversions
- [ab-test-setup.md](domains/marketing/cro/ab-test-setup.md) - Set up and analyze A/B tests

#### SEO

- [seo-audit.md](domains/marketing/seo/seo-audit.md) - Audit and diagnose SEO issues
- [programmatic-seo.md](domains/marketing/seo/programmatic-seo.md) - Build pages at scale for keywords
- [schema-markup.md](domains/marketing/seo/schema-markup.md) - Add structured data markup

#### Content

- [copywriting.md](domains/marketing/content/copywriting.md) - Write marketing copy for pages
- [copy-editing.md](domains/marketing/content/copy-editing.md) - Edit and improve existing copy
- [email-sequence.md](domains/marketing/content/email-sequence.md) - Write email marketing sequences
- [social-content.md](domains/marketing/content/social-content.md) - Create social media content

#### Strategy

- [pricing-strategy.md](domains/marketing/strategy/pricing-strategy.md) - Design pricing models and pages
- [launch-strategy.md](domains/marketing/strategy/launch-strategy.md) - Plan product launches
- [marketing-ideas.md](domains/marketing/strategy/marketing-ideas.md) - Generate marketing ideas
- [business-ideas.md](domains/marketing/strategy/business-ideas.md) - Generate and evaluate business ideas (market gaps, autonomy-first)
- [marketing-psychology.md](domains/marketing/strategy/marketing-psychology.md) - Apply psychology to marketing
- [competitor-alternatives.md](domains/marketing/strategy/competitor-alternatives.md) - Analyze competitors and positioning

#### Growth

- [free-tool-strategy.md](domains/marketing/growth/free-tool-strategy.md) - Build free tools for lead gen
- [referral-program.md](domains/marketing/growth/referral-program.md) - Design referral programs
- [paid-ads.md](domains/marketing/growth/paid-ads.md) - Run paid advertising campaigns
- [analytics-tracking.md](domains/marketing/growth/analytics-tracking.md) - Set up analytics and tracking

### Websites

- [README.md](domains/websites/README.md) - Website development overview

#### Architecture

- [section-composer.md](domains/websites/architecture/section-composer.md) - Section-based page composition
- [sitemap-builder.md](domains/websites/architecture/sitemap-builder.md) - Sitemap planning and structure
- [tech-stack-chooser.md](domains/websites/architecture/tech-stack-chooser.md) - Technology selection guidance

#### Build

- [analytics-tracking.md](domains/websites/build/analytics-tracking.md) - Analytics integration patterns
- [component-development.md](domains/websites/build/component-development.md) - Component development workflow
- [forms-integration.md](domains/websites/build/forms-integration.md) - Form handling and integration
- [mobile-first.md](domains/websites/build/mobile-first.md) - Mobile-first development approach
- [performance.md](domains/websites/build/performance.md) - Performance optimization strategies
- [seo-foundations.md](domains/websites/build/seo-foundations.md) - SEO fundamentals

#### Copywriting

- [cta-optimizer.md](domains/websites/copywriting/cta-optimizer.md) - Call-to-action optimization
- [objection-handler.md](domains/websites/copywriting/objection-handler.md) - Objection handling in copy
- [value-proposition.md](domains/websites/copywriting/value-proposition.md) - Value proposition development

#### Design

- [color-system.md](domains/websites/design/color-system.md) - Color system design
- [design-direction.md](domains/websites/design/design-direction.md) - Design direction and vision
- [spacing-layout.md](domains/websites/design/spacing-layout.md) - Spacing and layout systems
- [typography-system.md](domains/websites/design/typography-system.md) - Typography system design

#### Discovery

- [audience-mapping.md](domains/websites/discovery/audience-mapping.md) - Audience research and mapping
- [requirements-distiller.md](domains/websites/discovery/requirements-distiller.md) - Requirements gathering and distillation
- [scope-control.md](domains/websites/discovery/scope-control.md) - Scope management

#### Launch

- [deployment.md](domains/websites/launch/deployment.md) - Deployment procedures
- [finishing-pass.md](domains/websites/launch/finishing-pass.md) - Final QA and polish

#### QA

- [acceptance-criteria.md](domains/websites/qa/acceptance-criteria.md) - Acceptance criteria definition
- [accessibility.md](domains/websites/qa/accessibility.md) - Accessibility testing and compliance
- [visual-qa.md](domains/websites/qa/visual-qa.md) - Visual quality assurance

---

## Projects (Project-Specific)

### Brain

- [brain-example.md](projects/brain-example.md) - Brain repository patterns and conventions

---

## Tools & Utilities

- [TOOLS.md](../docs/TOOLS.md) - CLI tools reference (brain-search, thunk-parse, ralph-stats, gap-radar, brain-event)

---

## Self-Improvement (Meta)

- [README.md](self-improvement/README.md) - Self-improvement system overview
- [GAP_CAPTURE_RULES.md](self-improvement/GAP_CAPTURE_RULES.md) - Gap capture protocol
- [skills/self-improvement/GAP_BACKLOG.md](self-improvement/GAP_BACKLOG.md) - Raw gap capture log
- [GAP_LOG_AND_AUTO_SKILL_SPEC.md](self-improvement/GAP_LOG_AND_AUTO_SKILL_SPEC.md) - Gap log structure and auto-skill generation spec
- [SKILL_BACKLOG.md](self-improvement/SKILL_BACKLOG.md) - Promotion queue
- [SKILL_TEMPLATE.md](self-improvement/SKILL_TEMPLATE.md) - Template for new skills
