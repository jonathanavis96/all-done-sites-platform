# Test Coverage Patterns

## Why This Exists

Test coverage metrics are widely misunderstood and misapplied. Teams either chase 100% coverage as a vanity metric (wasting time on trivial tests) or ignore coverage entirely (missing critical gaps). Coverage is a tool for finding untested code, not a measure of test quality. This knowledge base documents how to interpret coverage metrics, set pragmatic targets, integrate coverage tools into CI/CD, and use coverage data strategically to improve test effectiveness.

**Problem solved:** Without coverage guidance, teams write tests blindly, miss critical paths, waste time testing trivial code, and lack objective data to identify testing gaps. This leads to false confidence ("we have tests!") or analysis paralysis ("what should we test?").

## When to Use It

Reference this KB file when:

- Setting coverage targets for a project
- Interpreting coverage reports (line, branch, function coverage)
- Deciding what code needs tests vs what to skip
- Integrating coverage tools into CI/CD pipelines
- Reviewing pull requests and assessing test adequacy
- Debugging why high coverage still allows bugs through
- Explaining coverage metrics to stakeholders

## Coverage Metrics Explained

### Types of Coverage

| Metric | What It Measures | Example |
| ------ | ---------------- | ------- |
| **Line Coverage** | % of code lines executed by tests | 85% = 85 of 100 lines ran |
| **Branch Coverage** | % of conditional branches taken | `if/else` both paths tested |
| **Function Coverage** | % of functions called by tests | 90% = 9 of 10 functions called |
| **Statement Coverage** | % of statements executed | Similar to line coverage |
| **Path Coverage** | % of execution paths tested | All combinations of branches |

**Most important metric:** Branch coverage > Line coverage > Function coverage

**Why branch coverage matters most:**

```javascript
// 100% line coverage, 50% branch coverage
function validate(user) {
  if (user && user.email) {  // Only tested with valid user
    return true;
  }
  return false;  // Never tested - bug lurks here
}
```

### Coverage vs Quality

**Coverage tells you:**

- ✅ Which code is untested (gaps)
- ✅ Which branches/paths are unexplored
- ✅ Regression risk areas (low coverage = high risk)

**Coverage does NOT tell you:**

- ❌ If tests are correct or meaningful
- ❌ If edge cases are tested properly
- ❌ If tests check the right assertions
- ❌ If code is production-ready

**Example of useless 100% coverage:**

```python
def calculate_discount(price, code):
    if code == "SAVE10":
        return price * 0.9
    return price

# Test achieves 100% coverage but tests nothing useful
def test_calculate_discount():
    calculate_discount(100, "SAVE10")  # No assertion!
    calculate_discount(100, "INVALID")  # No assertion!
```

## Pragmatic Coverage Targets

### Recommended Targets by Code Type

| Code Type | Target | Rationale |
| --------- | ------ | --------- |
| **Critical paths** | 90-100% | Auth, payments, data loss, security |
| **Business logic** | 80-90% | Core features, algorithms, workflows |
| **API endpoints** | 80-90% | Public contracts, error handling |
| **Utility functions** | 80-90% | Reusable code, high call frequency |
| **UI components** | 60-80% | Render logic, user interactions |
| **Configuration** | 0-40% | Generated code, constants |
| **Glue code** | 40-60% | Wiring, dependency injection |

### Risk-Based Coverage Strategy

**High-risk code (90-100% coverage):**

- Financial transactions (payments, refunds, pricing)
- Authentication and authorization
- Data deletion or modification
- Security-critical paths (password reset, API keys)
- Regulatory compliance features (GDPR, SOC2)

**Medium-risk code (70-85% coverage):**

- User-facing features
- Complex algorithms
- Error handling and recovery
- Background jobs and workers

**Low-risk code (40-60% coverage):**

- Display logic and formatting
- Logging and monitoring
- Admin tools and internal dashboards

**Skip testing (0-20% coverage):**

- Auto-generated code (protobuf, GraphQL schemas)
- Third-party library wrappers (test usage, not library)
- Trivial getters/setters (`getEmail() { return this.email; }`)
- Configuration files (YAML, JSON)
- Type definitions (TypeScript interfaces)

### When to Aim for 100% Coverage

**100% coverage makes sense for:**

- Security-critical modules (auth, encryption, access control)
- Mathematical libraries (precision matters)
- Safety-critical systems (medical, aviation, automotive)
- Open-source libraries (unknown usage contexts)

**100% coverage is wasteful for:**

- Early-stage prototypes (requirements change rapidly)
- Internal tools with small user base
- UI code (snapshot tests better than coverage)
- Code under active refactoring

## Coverage Tools and Configuration

### JavaScript/TypeScript (Jest)

**Installation:**

```bash
npm install --save-dev jest
```

**Run with coverage:**

```bash
# Generate coverage report
npm test -- --coverage

# Watch mode with coverage
npm test -- --coverage --watch

# Coverage for specific files (use testPathPattern to target tests)
npm test -- --coverage --testPathPattern='utils'

# Run tests for changed files only
npm test -- --findRelatedTests src/utils/helpers.js src/api/auth.js
```

**Configure coverage thresholds (package.json):**

```json
{
  "jest": {
    "collectCoverage": true,
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 85,
        "statements": 85
      },
      "./src/critical/**/*.js": {
        "branches": 95,
        "functions": 95,
        "lines": 95,
        "statements": 95
      }
    },
    "coveragePathIgnorePatterns": [
      "/node_modules/",
      "/dist/",
      "/.test.js$/",
      "/config/"
    ]
  }
}
```

**Output locations:**

- HTML report: `coverage/lcov-report/index.html`
- LCOV file: `coverage/lcov.info` (for CI tools)
- JSON summary: `coverage/coverage-summary.json`

### Python (pytest + coverage.py)

**Installation:**

```bash
pip install pytest pytest-cov
```

**Run with coverage:**

```bash
# Basic coverage
pytest --cov=src

# HTML report
pytest --cov=src --cov-report=html

# Terminal report with missing lines
pytest --cov=src --cov-report=term-missing

# Fail if coverage below threshold
pytest --cov=src --cov-fail-under=80
```

**Configure coverage (.coveragerc):**

```ini
[run]
source = src
omit =
    */tests/*
    */migrations/*
    */venv/*
    */__pycache__/*
    */site-packages/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod

precision = 2

[html]
directory = htmlcov
```

**Output locations:**

- HTML report: `htmlcov/index.html`
- Terminal: Shows missing line numbers
- `.coverage` file: Binary data (use `coverage report`)

### Go (built-in)

**Run with coverage:**

```bash
# Basic coverage
go test -cover ./...

# Detailed coverage profile
go test -coverprofile=coverage.out ./...

# View in terminal
go tool cover -func=coverage.out

# HTML report
go tool cover -html=coverage.out -o coverage.html
```

**Configure coverage (per-package thresholds):**

```bash
#!/bin/bash
# scripts/check-coverage.sh

THRESHOLD=80

go test -coverprofile=coverage.out ./...
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')

if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
    echo "Coverage $COVERAGE% is below threshold $THRESHOLD%"
    exit 1
fi

echo "Coverage $COVERAGE% meets threshold $THRESHOLD%"
```

### Ruby (SimpleCov)

**Installation (Gemfile):**

```ruby
gem 'simplecov', require: false, group: :test
```

**Configure (spec/spec_helper.rb):**

```ruby
require 'simplecov'

SimpleCov.start do
  add_filter '/spec/'
  add_filter '/vendor/'
  
  add_group 'Models', 'app/models'
  add_group 'Controllers', 'app/controllers'
  add_group 'Services', 'app/services'
  
  minimum_coverage 80
  minimum_coverage_by_file 60
end
```

**Output location:**

- HTML report: `coverage/index.html`

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests with Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm test -- --coverage --maxWorkers=2
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: true
      
      - name: Check coverage thresholds
        run: |
          if [ ! -f coverage/coverage-summary.json ]; then
            echo "Coverage summary not found"
            exit 1
          fi
          
          # Extract total line coverage
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          THRESHOLD=80
          
          if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold $THRESHOLD%"
            exit 1
          fi
          
          echo "Coverage $COVERAGE% meets threshold"
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 30 days
  only:
    - merge_requests
    - main
```

### Coverage as a Quality Gate

**Enforce coverage on new code only:**

```bash
#!/bin/bash
# scripts/coverage-diff.sh
# Fail if new code has < 80% coverage

git diff origin/main...HEAD --name-only | grep '\.js$' > changed_files.txt

# Handle empty changed_files.txt
if [ -s changed_files.txt ]; then
  npm test -- --coverage --findRelatedTests $(cat changed_files.txt | tr '\n' ' ')
else
  echo "No JavaScript files changed, skipping coverage check"
fi

# Check coverage-summary.json for thresholds
```

**Prevent coverage drops:**

```yaml
# .github/workflows/coverage-check.yml
- name: Download base coverage
  run: |
    # Get the latest successful run ID from main branch
    RUN_ID=$(curl -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" \
      "https://api.github.com/repos/${{ github.repository }}/actions/runs?branch=main&status=success&per_page=1" \
      | jq -r '.workflow_runs[0].id')
    
    # Get artifact ID for coverage-summary
    ARTIFACT_ID=$(curl -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" \
      "https://api.github.com/repos/${{ github.repository }}/actions/runs/${RUN_ID}/artifacts" \
      | jq -r '.artifacts[] | select(.name=="coverage-summary") | .id')
    
    # Download artifact
    curl -L -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" \
      -o base-coverage.zip \
      "https://api.github.com/repos/${{ github.repository }}/actions/artifacts/${ARTIFACT_ID}/zip"
    
    unzip -p base-coverage.zip coverage-summary.json > base-coverage.json

- name: Compare coverage
  run: |
    BASE_COV=$(jq '.total.lines.pct' base-coverage.json)
    CURRENT_COV=$(jq '.total.lines.pct' coverage/coverage-summary.json)
    
    if (( $(echo "$CURRENT_COV < $BASE_COV - 2" | bc -l) )); then
      echo "Coverage dropped from $BASE_COV% to $CURRENT_COV%"
      exit 1
    fi
```

## Interpreting Coverage Reports

### Reading HTML Reports

**Coverage report structure:**

```text
coverage/lcov-report/index.html
├── All files (total coverage)
├── src/
│   ├── utils/ (81.2% coverage)
│   │   ├── validators.js (95.3% - good)
│   │   ├── formatters.js (42.1% - needs work)
│   └── services/ (88.7% coverage)
```

**Color codes:**

- **Green (>80%):** Well-tested
- **Yellow (50-80%):** Moderate coverage
- **Red (<50%):** High risk, needs tests

### Finding Gaps

**Step 1: Sort by coverage % (ascending)**

- Focus on files <60% in critical paths
- Ignore low-coverage config files

**Step 2: Open low-coverage critical files**

- Red lines = never executed
- Yellow lines = partial branch coverage

**Step 3: Prioritize by risk**

```text
❌ auth/login.js (45% coverage) → HIGH PRIORITY
❌ payments/charge.js (62% coverage) → HIGH PRIORITY
⚠️ admin/reports.js (58% coverage) → MEDIUM (internal tool)
✅ utils/formatDate.js (40% coverage) → LOW (trivial)
```

### Branch Coverage Analysis

**Example of partial branch coverage:**

```javascript
// Line highlighted yellow in coverage report
function processOrder(order) {
  // Branch 1: tested ✅
  if (order.isPaid && order.isShipped) {
    return 'complete';
  }
  
  // Branch 2: never tested ❌
  if (order.isPaid && !order.isShipped) {
    return 'processing';
  }
  
  // Branch 3: never tested ❌
  return 'pending';
}
```

**Fix: Add tests for uncovered branches:**

```javascript
describe('processOrder', () => {
  test('complete when paid and shipped', () => {
    expect(processOrder({ isPaid: true, isShipped: true })).toBe('complete');
  });
  
  test('processing when paid but not shipped', () => {
    expect(processOrder({ isPaid: true, isShipped: false })).toBe('processing');
  });
  
  test('pending when not paid', () => {
    expect(processOrder({ isPaid: false, isShipped: false })).toBe('pending');
  });
});
```

## Common Mistakes

### At a Glance

| Concept | Description | Example |
| ------- | ----------- | ------- |
| **Line Coverage** | % of code lines executed | 85% = 85 of 100 lines ran |
| **Branch Coverage** | % of conditional paths taken | Both `if/else` branches tested |
| **Coverage Threshold** | Minimum % required to pass CI | 80% global, 95% for auth code |
| **Coverage Ignorelist** | Files excluded from coverage | Tests, migrations, generated code |

### Coverage Pitfalls

| ❌ Don't | ✅ Do | Why |
| -------- | ----- | --- |
| Chase 100% coverage everywhere | Focus on critical paths (90-100%) | Diminishing returns on trivial code |
| Test generated code | Exclude generated files from coverage | Wastes time, no value |
| Only check line coverage | Prioritize branch coverage | Line coverage misses untested paths |
| Write tests without assertions | Verify behavior, not just execution | Passing code through tests ≠ testing |
| Ignore coverage drops in PRs | Enforce coverage thresholds in CI | Prevents gradual decay |
| Test implementation details | Test public behavior/contracts | Implementation tests break on refactor |
| Use coverage as only quality metric | Combine with mutation testing, code review | Coverage is necessary but not sufficient |

## Gotchas / Failure Modes

| Failure Mode | Mitigation |
| ------------ | ---------- |
| **High coverage, low test quality** | Review tests for meaningful assertions, add mutation testing |
| **Coverage report doesn't match reality** | Check for test parallelism issues, clear cache (`rm -rf coverage/`) |
| **Coverage drops unexpectedly** | Compare base vs current coverage, identify changed files |
| **CI passes but coverage tool fails** | Add explicit coverage threshold checks, don't rely on tool defaults |
| **Tests pass locally, fail in CI** | Ensure coverage config committed (`.coveragerc`, `jest.config.js`) |
| **Coverage too slow in CI** | Use `--maxWorkers=2`, cache `node_modules`, run coverage only on main branch |

## Strategic Coverage Improvement

### Step-by-Step Approach

**Phase 1: Establish baseline (Week 1)**

1. Run coverage report: `npm test -- --coverage`
2. Document current coverage: 67% lines, 58% branches
3. Identify critical gaps: `auth/`, `payments/`, `api/`

**Phase 2: Cover critical paths (Weeks 2-3)**

4. Test authentication flows (login, logout, password reset)
5. Test payment processing (charge, refund, webhook)
6. Test API endpoints (error handling, validation)
7. Target: 90%+ coverage in critical modules

**Phase 3: Enforce thresholds (Week 4)**

8. Add coverage config to CI (80% global, 90% critical)
9. Block PRs that drop coverage below threshold
10. Review and merge

**Phase 4: Maintain and improve (Ongoing)**

11. Monthly coverage review (identify new gaps)
12. Add coverage badge to README
13. Celebrate coverage milestones (team visibility)

### Coverage Improvement Tactics

**Tactic 1: Low-hanging fruit**

- Sort by coverage % ascending
- Test simple functions first (utils, helpers)
- Quick wins boost team morale

**Tactic 2: Critical path focus**

- Identify code that handles money, auth, data
- Write comprehensive tests (happy path + errors)
- Achieve 90-100% coverage

**Tactic 3: Branch hunting**

- Filter for <80% branch coverage
- Add tests for `else` clauses, error paths
- Improves quality more than line coverage

**Tactic 4: Test generation**

- Use AI to generate test scaffolds
- Review and add meaningful assertions
- Faster than writing from scratch

## Coverage Badges and Reporting

### Adding Coverage Badge (Codecov)

**In README.md:**

```markdown
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

**Alternative (Coveralls):**

```markdown
[![Coverage Status](https://coveralls.io/repos/github/username/repo/badge.svg?branch=main)](https://coveralls.io/github/username/repo?branch=main)
```

### Coverage Trends

**Track coverage over time:**

```bash
# scripts/track-coverage.sh
COVERAGE=$(npm test -- --coverage --silent | grep "All files" | awk '{print $10}' | sed 's/%//')
DATE=$(date +%Y-%m-%d)

echo "$DATE,$COVERAGE" >> coverage-history.csv

# Plot with gnuplot or send to monitoring system
```

**Alert on coverage drops:**

```yaml
# .github/workflows/coverage-alert.yml
- name: Check coverage drop
  run: |
    PREV_COV=$(tail -1 coverage-history.csv | cut -d',' -f2)
    CURR_COV=$(npm test -- --coverage --silent | grep "All files" | awk '{print $10}' | sed 's/%//')
    
    if (( $(echo "$CURR_COV < $PREV_COV - 5" | bc -l) )); then
      echo "::error::Coverage dropped from $PREV_COV% to $CURR_COV%"
      exit 1
    fi
```

## Related Skills

- **[testing-patterns.md](./testing-patterns.md)** - Test types, mocks, fixtures, CI integration
- **[code-hygiene.md](./code-hygiene.md)** - Code quality standards and linting
- **[research-patterns.md](./research-patterns.md)** - Investigating coverage gaps and debugging

---

## Pre-Commit Checklist (REQUIRED)

Before committing, verify:

- [x] **Code blocks have language tags** - Used `bash`, `javascript`, `python`, `json`, `yaml`, `ini`, `ruby`, `text`, `markdown`
- [x] **Blank line before/after code blocks** - All code blocks have surrounding blank lines
- [x] **Blank line before/after lists** - All lists have surrounding blank lines
- [x] **Blank line after headings** - All headings followed by blank line
- [x] **Run lint check** - Ready for `markdownlint skills/domains/code-quality/test-coverage-patterns.md`

## See Also

- **[Testing Patterns](testing-patterns.md)** - Unit, integration, and e2e testing strategies across frameworks
- **[Code Hygiene](code-hygiene.md)** - Code quality practices including test maintenance
- **[Error Handling Patterns](../backend/error-handling-patterns.md)** - Exception handling strategies to test
