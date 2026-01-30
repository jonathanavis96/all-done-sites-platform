# Gap Backlog (Auto-maintained by Claude)

Rules:

- Each entry is a missing brain capability discovered during work.
- If a similar entry exists, **UPDATE it** (don't duplicate).
- Include evidence (paths, filenames, brief snippets, or observations).
- Priority:
  - P0 = blocks work / repeatedly causes failure
  - P1 = high leverage / recurring
  - P2 = nice-to-have

---

## Backlog Items

<!-- Add new entries below this line using the format:

### YYYY-MM-DD HH:MM — <Suggested Skill Name>
- **Type:** Knowledge / Procedure / Tooling / Pattern / Debugging / Reference
- **Why useful:** <1–2 lines>
- **When triggered:** <what you were trying to do>
- **Evidence:** <paths, filenames, snippets, observations>
- **Priority:** P0 / P1 / P2
- **Status:** Identified / Promoted to SKILL_BACKLOG / Done

-->

### 2026-01-18 — Bash Terminal Control with tput

- **Type:** Tooling / Knowledge
- **Why useful:** Prevents screen flashing/blanking during display refreshes in interactive bash scripts
- **When triggered:** Implementing cursor positioning for top-anchored display in current_ralph_tasks.sh (task P4A.1)
- **Evidence:**
  - Used `tput cup 0 0` to move cursor to top-left without clearing screen
  - Used `tput ed` to clear from cursor to end of screen
  - Pattern: Replace `clear` command with `tput cup 0 0 && tput ed` for flicker-free updates
  - Other useful commands: `tput cup $row $col`, `tput el` (clear line), `tput sc/rc` (save/restore cursor)
- **Priority:** P2
- **Status:** Reviewed - Keep as reference
- **Review notes (2026-01-18):** Does not meet "recurring" criteria. Very specialized for interactive terminal scripts. Only 2 monitor scripts in brain repo use this. Low reuse potential. Keep as reference in GAP_BACKLOG for future monitor script work.

### 2026-01-18 — Bash Associative Arrays for Caching

- **Type:** Knowledge / Pattern
- **Why useful:** Improves performance by avoiding repeated expensive operations (parsing, computation) on immutable data
- **When triggered:** Implementing completed task caching in current_ralph_tasks.sh (task P4A.2)
- **Evidence:**
  - Used `declare -A COMPLETED_CACHE` to create associative array for key-value storage
  - Generated cache keys using `md5sum`: `cache_key=$(echo -n "$data" | md5sum | cut -d' ' -f1)`
  - Checked cache: `if [[ -n "${CACHE[$key]}" ]]; then echo "${CACHE[$key]}"; fi`
  - Stored values: `CACHE[$key]="$value"`
  - Pattern useful for caching parsed data, computed results, or any immutable lookups
  - Current use case: Cache completed task display strings to skip title generation on refresh
- **Priority:** P2
- **Status:** Reviewed - Keep as reference
- **Review notes (2026-01-18):** Does not meet "recurring" criteria. General caching patterns already documented in skills/domains/backend/caching-patterns.md. This is a bash-specific implementation detail with low reuse potential. Keep as reference for bash caching needs.

### 2026-01-19 — Bash/Shell Project Validation Patterns

- **Type:** Tooling / Pattern
- **Why useful:** Ralph templates assume npm/TypeScript projects. Need bash-specific validation patterns for shell script projects.
- **When triggered:** Bootstrapping rovo-account-manager project (pure bash/shell automation)
- **Evidence:**
  - Default PROMPT.md template has `npm run type-check`, `npm run lint`, `npm test`
  - Default VALIDATION_CRITERIA.md has web app examples only
  - Created custom validation for rovo project:
    - `bash -n script.sh` for syntax checking
    - `shellcheck` for static analysis
    - Executable permission checks (`find -perm`)
    - JSON validation with `jq`
    - Security checks for hardcoded credentials
  - Should add bash/shell template variant or make templates tech-stack aware
- **Priority:** P1
- **Status:** Promoted to SKILL_BACKLOG (2026-01-23)

### 2026-01-25 — Custom Semantic Code Review Tool (LLM-Based Linting)

- **Type:** Tooling
- **Why useful:** Pre-commit hooks catch syntax/style issues but miss semantic bugs that require understanding code intent (logic errors, incomplete examples, subtle bugs)
- **When triggered:** CodeRabbit PR#5 review caught issues that shellcheck/markdownlint/pre-commit missed
- **Evidence:**
  - **Regex capture delimiters:** Pattern `"([^"]+)"` captures delimiters in the group (CodeRabbit caught in cache_db.py line 124)
  - **Dead code with undefined variables:** Cleanup blocks referencing variables never defined (e.g., error handlers using undeclared vars)
  - **Incomplete code examples:** Missing imports (`import time`, `import os`), undefined variables (`userId` used without declaration)
  - **Documentation quality:** Broken internal links, inconsistent terminology, examples that don't match description
  - **Security issues:** SQL injection patterns in examples, hardcoded secrets
  - Current tools cannot detect these - they require semantic understanding
  - Need LLM-based tool that can:
    - Parse code and understand intent
    - Check code examples for completeness and correctness
    - Verify documentation accuracy
    - Detect logic errors and edge cases
    - Run as pre-commit hook or CI check
- **Priority:** P1
- **Status:** Done (promoted to skills/domains/code-quality/semantic-code-review.md)
- **Related:** See `docs/CODERABBIT_PR5_ALL_ISSUES.md` for full list of semantic issues caught by CodeRabbit

### 2026-01-29 18:04 — SQLite schema/test alignment + migration discipline (created_at, snapshots, artifacts)

- **Type:** Pattern / Debugging / Procedure

- **Why useful:** Prevent regressions where runtime DB schema evolves but pytest fixtures + tests drift, causing `NOT NULL` and missing-table failures; ensure migrations and tests stay in lockstep.

- **When triggered:** After adding 0K/0S/0R/0E work, `pytest -q` showed failures like missing `snapshots` table and `customers.created_at` NOT NULL violations; robots artifact tests also drifted from persistence contract.

- **Evidence:**

  - Failing tests/errors:

    - `tests/test_sitemap_fetch.py` → `sqlite3.IntegrityError: NOT NULL constraint failed: customers.created_at`

    - `tests/test_page_fetcher.py::test_persist_fetch_results_placeholder` → `sqlite3.OperationalError: no such table: snapshots`

    - `tests/test_robots_fetch.py` assertions mismatched vs current artifact storage semantics

  - Schema contract lives in `src/ranksentinel/db.py` (`customers.created_at`/`updated_at` are `NOT NULL`; `snapshots` table expected by page fetch persistence)

  - Suggested corrective pattern:

    - tests must create DB via a shared fixture that calls `init_db(conn)`

    - if schema adds `NOT NULL` columns, either add safe DB defaults/backfill or update all test inserts

    - tests should assert artifact persistence via `ranksentinel.db` helpers (e.g. `get_latest_artifact`) rather than duplicating SQL assumptions

- **Priority:** P0
- **Status:** Done (documented in skills)
- **Skill file:** [sqlite-schema-test-alignment.md](../domains/backend/sqlite-schema-test-alignment.md)
- **Project:** RankSentinel
