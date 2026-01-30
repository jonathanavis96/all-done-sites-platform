# Investigate Test Failures

## Goal

Systematically diagnose and resolve test failures across Python pytest, shell script tests, and integration tests by identifying failure types, applying appropriate fixes, and verifying resolution.

## When to Use

Symptoms or scenarios that indicate you should use this playbook:

- **Test suite fails:** CI/CD pipeline reports test failures blocking merge
- **Local test run fails:** `pytest`, `bash test_*.sh`, or integration tests return non-zero exit
- **Flaky tests detected:** Tests pass sometimes, fail other times
- **New code breaks existing tests:** Recent changes introduce regressions
- **Test coverage drops:** Coverage report shows decreased coverage after changes

## Prerequisites

Before starting, ensure you have:

- **Tools:** Test framework installed (pytest, bash, npm test, go test)
- **Files:** Test files exist in expected locations (`tests/`, `test_*.sh`, etc.)
- **Permissions:** Ability to run tests locally and read test output
- **Knowledge:** Basic understanding of the codebase being tested

## Steps

### Step 1: Run Tests and Capture Output

**Action:** Execute the test suite and capture full output for analysis.

**Commands by test type:**

```bash
# Python pytest
pytest -v --tb=short > test_output.txt 2>&1

# Shell script tests
bash test_script.sh 2>&1 | tee test_output.txt

# Integration tests (example)
bash integration_test_suite.sh 2>&1 | tee test_output.txt

# Go tests
go test -v ./... 2>&1 | tee test_output.txt
```

**Decision Point:** If tests pass, stop here. If tests fail, proceed to Step 2.

**Checkpoint:** ✓ You have captured test output showing which tests failed

### Step 2: Parse Test Output and Identify Failure Type

**Action:** Analyze the test output to categorize the failure.

**Common failure patterns:**

| Pattern in Output | Failure Type | Next Step |
| ----------------- | ------------ | --------- |
| `AssertionError`, `assert x == y` | Assertion failure | Step 3a |
| `ImportError`, `ModuleNotFoundError` | Missing dependency | Step 3b |
| `AttributeError`, `NameError` | Code structure change | Step 3c |
| `TimeoutError`, test hangs | Timing/async issue | Step 3d |
| `FileNotFoundError`, `ENOENT` | Missing test fixture | Step 3e |
| `PermissionError`, `EACCES` | File permissions | Step 3f |
| `TypeError`, `ValueError` | Type/value mismatch | Step 3g |
| Random pass/fail | Flaky test | Step 3h |

**Example pytest output:**

```text
tests/test_cache.py::test_cache_hit FAILED
E   AssertionError: assert 'miss' == 'hit'
E   +  where 'miss' = <function cache_lookup at 0x7f...>()
```

**Example shell test output:**

```text
✗ Test 3 failed: Expected exit code 0, got 1
  Command: bash script.sh --invalid-flag
  Actual output: Error: Unknown flag --invalid-flag
```

**Checkpoint:** ✓ Failure type identified and categorized

### Step 3a: Fix Assertion Failures

**Action:** Assertion failed because expected value doesn't match actual value.

**Diagnosis steps:**

1. **Read the assertion:** What was expected vs actual?
2. **Check if test is correct:** Does the test expectation match requirements?
3. **Check if code is correct:** Does the implementation match specification?

**Decision Point:**

- **Test is wrong:** Update test to match correct behavior → Step 4
- **Code is wrong:** Fix implementation to match test → Step 4
- **Both need update:** Fix code first, then update test if needed → Step 4

**Common causes:**

- Recent code change altered return value
- Test fixtures outdated
- Logic error in implementation

**Link to skill:** [Testing Patterns](../domains/code-quality/testing-patterns.md) - See "Arrange-Act-Assert Pattern"

### Step 3b: Fix Import/Dependency Errors

**Action:** Test cannot import required module or package.

**Diagnosis steps:**

1. Check if dependency installed: `pip list | grep <package>` or `npm list <package>`
2. Check import path correctness: Does the module exist at that path?
3. Check Python path: Is the module in `sys.path`?

**Solutions:**

```bash
# Install missing dependency
pip install <package>
npm install <package>
go get <package>

# Fix import path in test
# Before: from src.utils import helper
# After:  from utils import helper

# Add to PYTHONPATH if needed
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
```

**Anti-pattern:** ❌ Don't modify test imports without understanding project structure. Instead: ✅ Check existing working tests for correct import patterns.

### Step 3c: Fix Structure/Name Changes

**Action:** Code structure changed (renamed function, moved class, changed API).

**Diagnosis steps:**

1. Identify the missing attribute: `AttributeError: 'Foo' has no attribute 'bar'`
2. Search codebase for new name: `rg "def bar"` or `rg "class Bar"`
3. Check git history: `git log -p --follow <file>` to see recent renames

**Solutions:**

- Update test to use new function/class name
- Update test to use new API signature
- Add backward compatibility shim if many tests affected

**Example fix:**

```python
# Test was using old API
def test_process_data():
    result = processor.process(data)  # Old method name
    assert result.success

# Update to new API
def test_process_data():
    result = processor.execute(data)  # New method name
    assert result.success
```

### Step 3d: Fix Timing/Async Issues

**Action:** Test fails due to timeouts, race conditions, or async handling.

**Diagnosis steps:**

1. Check if test is flaky (fails intermittently)
2. Look for `async`/`await`, `Promise`, `goroutine` patterns
3. Check for missing `await` or improper synchronization

**Solutions:**

```python
# Python: Add timeout, use pytest-asyncio
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await async_operation()
    assert result == expected

# Python: Increase timeout for slow operations
@pytest.mark.timeout(30)
def test_slow_operation():
    result = slow_function()
    assert result
```

```javascript
// JavaScript: Use async/await properly
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

```bash
# Shell: Add timeout to commands
timeout 10s bash long_running_script.sh || {
  echo "Test timed out after 10s"
  exit 1
}
```

**Link to skill:** [JavaScript Patterns](../domains/languages/javascript/javascript-patterns.md) - See "Async/Await Patterns"

### Step 3e: Fix Missing Test Fixtures

**Action:** Test expects files, data, or resources that don't exist.

**Diagnosis steps:**

1. Identify missing file: `FileNotFoundError: [Errno 2] No such file or directory: 'test_data.json'`
2. Check if fixture was deleted or moved
3. Check if test setup/teardown is correct

**Solutions:**

```python
# Python: Create fixture with pytest
import pytest
import tempfile

@pytest.fixture
def temp_data_file():
    """Provide temporary test data file."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write('{"test": "data"}')
        temp_path = f.name
    yield temp_path
    os.unlink(temp_path)  # Cleanup after test

def test_with_fixture(temp_data_file):
    data = load_data(temp_data_file)
    assert data['test'] == 'data'
```

```bash
# Shell: Create test fixtures in setup
setup_test_environment() {
  mkdir -p test_fixtures
  echo "test data" > test_fixtures/data.txt
}

cleanup_test_environment() {
  rm -rf test_fixtures
}

# Run test with fixtures
setup_test_environment
bash test_script.sh
cleanup_test_environment
```

**Link to skill:** [Testing Patterns](../domains/code-quality/testing-patterns.md) - See "Test Fixtures and Setup"

### Step 3f: Fix Permission Issues

**Action:** Test fails due to file permission errors.

**Diagnosis steps:**

1. Check file permissions: `ls -la <file>`
2. Check if test needs write access to read-only file
3. Check if test creates files in protected directory

**Solutions:**

```bash
# Make test script executable
chmod +x test_script.sh

# Use temp directory for test output
import tempfile
test_dir = tempfile.mkdtemp()
# ... run test writing to test_dir ...
shutil.rmtree(test_dir)  # Cleanup
```

**Anti-pattern:** ❌ Don't use `chmod 777` or run tests as root. Instead: ✅ Use temporary directories with proper scoping.

### Step 3g: Fix Type/Value Mismatches

**Action:** Function receives wrong type or invalid value.

**Diagnosis steps:**

1. Check error message: `TypeError: expected str, got int`
2. Trace where value comes from (test setup, mock, fixture)
3. Verify function signature matches test call

**Solutions:**

```python
# Fix type mismatch
# Before: process_user(42)  # Passing int, expects string
# After:  process_user("42") # Pass string

# Add type checking to catch early
from typing import List

def process_items(items: List[str]) -> int:
    """Process list of strings, return count."""
    return len(items)

# Test with correct types
def test_process_items():
    result = process_items(["a", "b", "c"])
    assert result == 3
```

**Link to skill:** [Python Patterns](../domains/languages/python/python-patterns.md) - See "Type Hints"

### Step 3h: Fix Flaky Tests

**Action:** Test passes sometimes, fails other times (non-deterministic).

**Common causes:**

1. **Race conditions:** Async operations not properly awaited
2. **Timing dependencies:** Tests depend on wall-clock time or sleep()
3. **Shared state:** Tests mutate global state, order-dependent
4. **External dependencies:** Network calls, database state

**Solutions:**

```python
# Fix: Remove sleep() timing dependencies
# Before: time.sleep(1); assert cache_updated
# After:  wait_for_condition(lambda: cache_updated, timeout=5)

# Fix: Isolate test state
@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset globals before each test."""
    global_cache.clear()
    yield
    global_cache.clear()

# Fix: Mock external dependencies
from unittest.mock import patch, MagicMock

@patch('requests.get')
def test_api_call(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: {"data": "test"})
    result = fetch_data()
    assert result['data'] == 'test'
```

**Link to skill:** [Testing Patterns](../domains/code-quality/testing-patterns.md) - See "Test Isolation and Independence"

### Step 4: Verify Fix

**Action:** Run tests again to confirm resolution.

**Commands:**

```bash
# Run specific test that was failing
pytest tests/test_module.py::test_specific_function -v

# Run full test suite
pytest tests/ -v

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Shell test
bash test_script.sh

# Integration test
bash integration_test_suite.sh
```

**Expected results:**

- All tests pass (exit code 0)
- No new test failures introduced
- Coverage maintained or improved

**Checkpoint:** ✓ Tests pass consistently (run 3+ times to verify flaky tests fixed)

### Step 5: Commit Changes

**Action:** Document and commit the fix.

**Commit message format:**

```bash
# For test fixes
git add -A && git commit -m "test(scope): fix failing test in test_module

- Fixed assertion in test_cache_hit to match new return value
- Updated import paths after module restructure
- Added missing test fixture for data file

Resolves: <issue-number>"

# For code fixes revealed by tests
git add -A && git commit -m "fix(scope): correct behavior in function_name

- Fixed off-by-one error in loop condition
- Added null check before dereferencing
- Updated return value to match specification

Tests: test_function_name now passes"
```

**Checkpoint:** ✓ Changes committed with descriptive message linking to test failures

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Captured test output:** Full test run output saved for analysis
- [ ] **Identified failure type:** Categorized as assertion, import, timing, etc.
- [ ] **Root cause diagnosed:** Understand why test failed (code bug vs test bug)
- [ ] **Fix applied:** Code or test updated to resolve failure
- [ ] **Tests pass:** Full test suite runs successfully (3+ consecutive passes)
- [ ] **Changes committed:** Fix documented with clear commit message

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Fix doesn't resolve failure | Wrong root cause identified | Re-read test output carefully, check git log for recent changes |
| New failures after fix | Fix introduced regression | Run full test suite, not just failing test; check related tests |
| Tests still flaky | Incomplete async handling | Add explicit waits, mock external dependencies, isolate state |
| Cannot reproduce locally | Environment difference (CI vs local) | Check CI logs for env vars, dependencies, system differences |
| Test passes locally, fails in CI | Timing/resource differences | Add timeouts, check for hardcoded paths, verify fixtures exist |
| Mock not working | Wrong import path mocked | Mock where object is used, not where it's defined |

## Related Skills

Core skills referenced by this playbook:

- [Testing Patterns](../domains/code-quality/testing-patterns.md) - Comprehensive testing strategies and patterns
- [Python Patterns](../domains/languages/python/python-patterns.md) - Python-specific error handling and type hints
- [JavaScript Patterns](../domains/languages/javascript/javascript-patterns.md) - Async/await and promise handling
- [Error Handling Patterns](../domains/backend/error-handling-patterns.md) - Exception handling and retry strategies
- [Code Hygiene](../domains/code-quality/code-hygiene.md) - Test maintenance and dead code removal

## Related Playbooks

Other playbooks that connect to this workflow:

- [Resolve Verifier Failures](./resolve-verifier-failures.md) - Use when verifier reports test-related AC failures
- [Debug Ralph Stuck](./debug-ralph-stuck.md) - Use when Ralph iteration fails due to test errors

## Notes

**Iteration efficiency:**

- Run only failing test first (`pytest tests/test_file.py::test_function`), not full suite
- Use `--tb=short` flag to reduce traceback noise
- Search codebase for patterns before reading full files (`rg "function_name"`)

**Common variations:**

- **Integration tests:** Often need database setup, API mocking, or service orchestration
- **E2E tests:** May need browser automation, screenshot comparison, or network stubbing
- **Performance tests:** Require baseline metrics, profiling tools, timing assertions

**When to escalate:**

- Test requires infrastructure changes (new service, database migration)
- Flaky test persists after 3+ fix attempts (may need architectural change)
- Test failure reveals security vulnerability (escalate to security team)
- Cannot reproduce failure locally after checking CI environment

---

**Last Updated:** 2026-01-25

**Covers:** pytest, bash tests, integration tests, assertion failures, import errors, flaky tests, test fixtures, mocking
