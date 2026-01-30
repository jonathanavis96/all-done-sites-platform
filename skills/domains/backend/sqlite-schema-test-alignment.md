# SQLite Schema/Test Alignment & Migration Discipline

## Why This Skill Exists

SQLite-backed projects commonly drift into a failure mode where:

- the runtime schema evolves (new tables/columns, `NOT NULL` constraints)
- but tests and fixtures still create “old” schemas or insert incomplete rows

This produces brittle failures such as:

- `sqlite3.OperationalError: no such table: snapshots`
- `sqlite3.IntegrityError: NOT NULL constraint failed: customers.created_at`

This skill documents patterns that keep **schema, migrations, and tests in lockstep**.

## When to Use It (Triggers)

Use this when you see any of the following:

- tests manually create tables instead of using the app’s schema initializer
- tests insert rows without required (`NOT NULL`) columns
- schema changes require backfills/defaults and tests start failing
- production code expects tables/columns that tests never create

## Core Principle

**There must be exactly one schema authority.**

In most small/medium Python + SQLite codebases that means:

- a single `init_db(conn)` function (or equivalent) that creates/validates schema
- tests must call it (via a shared fixture)
- migrations must be applied consistently (or the schema initializer must be the migration mechanism)

## Patterns

### Pattern 1: Tests must create DB via the same initializer as production

**Goal:** prevent “missing table/column” drift.

**Do:** expose a function like `init_db(conn)` in your db module.

```python
# src/myapp/db.py

def init_db(conn):
    conn.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    """)

    conn.commit()
```

Then make **all tests** go through a shared fixture:

```python
# tests/conftest.py

import sqlite3
import pytest
from myapp.db import init_db

@pytest.fixture
def conn(tmp_path):
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(db_path)
    try:
        init_db(conn)
        yield conn
    finally:
        conn.close()
```

**Avoid:** ad-hoc `conn.execute("CREATE TABLE ...")` duplicated across tests.

### Pattern 2: If schema adds `NOT NULL` columns, choose a migration strategy intentionally

When adding `NOT NULL` columns you must ensure *existing rows* and *test inserts* remain valid.

Options (pick one):

1) **DB default** (best when there is an obvious safe default)

- Add column with `DEFAULT ...` + `NOT NULL`
- Works for future inserts and existing rows

2) **Backfill migration**

- Add nullable column
- Backfill values
- Enforce `NOT NULL` in a later migration

3) **Test-only defaults** (only acceptable if production is already handled)

- Update fixtures/builders to always provide required columns

**Rule:** if you add a `NOT NULL` constraint, update *every path* that inserts rows:

- production inserts
- test factories/fixtures
- seed scripts

### Pattern 3: Prefer factories/builders over raw inserts

Direct SQL inserts in tests tend to rot.

Instead, provide a small helper that always supplies required fields:

```python
# tests/factories.py

from datetime import datetime, timezone

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def insert_customer(conn, *, created_at=None, updated_at=None):
    created_at = created_at or utc_now_iso()
    updated_at = updated_at or utc_now_iso()

    cur = conn.execute(
        "INSERT INTO customers(created_at, updated_at) VALUES (?, ?)",
        (created_at, updated_at),
    )
    conn.commit()
    return cur.lastrowid
```

Now schema changes are handled by updating the factory, not dozens of tests.

### Pattern 4: Keep artifact/persistence assertions aligned with DB helpers

If production provides DB access helpers (e.g., `get_latest_artifact(...)`), tests should use them.

Why:

- it prevents tests from duplicating internal SQL assumptions
- it makes behavior changes explicit (you update helper + tests)

### Pattern 5: Migration regression tests (old schema → migrate → assert)

Schema drift often happens when code changes assume a migration ran, but tests only ever create a fresh DB.

Add a test that simulates an *older* schema and verifies your migration/init path upgrades it:

```python
import sqlite3
from datetime import datetime, timezone

from myapp.db import init_db


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def test_migrates_old_schema(tmp_path):
    db_path = tmp_path / "old.db"
    conn = sqlite3.connect(db_path)
    try:
        # Simulate an older schema (missing columns/tables)
        conn.execute("CREATE TABLE customers (id INTEGER PRIMARY KEY)")
        conn.execute("INSERT INTO customers(id) VALUES (1)")
        conn.commit()

        # Act: run the schema authority (must apply migrations / create missing tables)
        init_db(conn)

        # Assert: new tables/columns exist
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        assert "customers" in tables
        assert "snapshots" in tables

        cols = {
            row[1]
            for row in conn.execute("PRAGMA table_info(customers)").fetchall()
        }
        assert "created_at" in cols
        assert "updated_at" in cols

        # Optional: assert backfills/defaults were applied for existing rows
        row = conn.execute(
            "SELECT created_at, updated_at FROM customers WHERE id=1"
        ).fetchone()
        assert row is not None
        assert row[0] is not None
        assert row[1] is not None
    finally:
        conn.close()
```

Notes:

- If you use versioned migrations, call the migration runner instead of `init_db()`.
- If SQLite limitations require table rebuilds for constraints, test that data survives rebuild.

### Pattern 6: Validate schema assumptions early

Add a “schema smoke test” that fails loudly if a migration/init path regresses:

```python
def test_schema_contains_expected_tables(conn):
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    assert "customers" in tables
    assert "snapshots" in tables
```

This catches accidental fixture drift before deeper tests fail with confusing errors.

## Debugging Checklist

When you hit errors like `no such table` or `NOT NULL constraint failed`:

1. **Find the schema authority**
   - Is there an `init_db()` / migration runner? Use that.
2. **Confirm tests use it**
   - Ensure `conftest.py` fixture calls initializer.
3. **Search for raw inserts**
   - `grep -R "INSERT INTO customers" tests/`
4. **Check new constraints**
   - Any new `NOT NULL` columns? Ensure defaults/backfills or factories updated.
5. **Add/adjust schema smoke test**

## Sources / Further Reading

- SQLite: `CREATE TABLE` and constraints (official docs)
- pytest: fixtures and `conftest.py` patterns (official docs)
- Project’s own `db.py` / migration tooling (treat as source of truth)
