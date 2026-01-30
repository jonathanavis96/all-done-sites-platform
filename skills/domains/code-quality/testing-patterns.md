# Testing Patterns

<!-- covers: AssertionError, pytest.fail, jest.fail, testing.T.Errorf -->

## Why This Exists

Testing is fundamental to software quality, but teams often struggle with test organization, choosing the right test types, managing mocks and fixtures, and integrating tests into CI/CD pipelines. Poor testing strategies lead to brittle tests that break with minor changes, slow test suites that block development, insufficient coverage that allows bugs to slip through, and difficulty reproducing issues. This knowledge base documents proven testing patterns across unit, integration, and end-to-end testing for multiple frameworks (Jest, pytest, Go testing, JUnit), helping teams write effective tests that catch bugs early while remaining maintainable.

**Problem solved:** Without standardized testing patterns, teams either over-test (slow, brittle tests) or under-test (bugs in production), struggle with test organization and naming, reinvent mocking strategies, and lack clear guidelines for what to test and how to test it effectively.

## When to Use It

Reference this KB file when:

- Setting up testing infrastructure for a new project
- Organizing test files and choosing naming conventions
- Deciding between unit, integration, or e2e tests for a feature
- Implementing mocks, stubs, or test fixtures
- Debugging flaky or slow tests
- Integrating tests into CI/CD pipelines
- Improving test coverage strategically

**Specific triggers:**

- Starting a new project and need to set up testing
- Bug found in production that should have been caught by tests
- Test suite taking too long to run (>5 minutes for unit tests)
- Tests failing intermittently (flaky tests)
- Difficulty testing code due to tight coupling
- Pull requests blocked by failing tests
- Need to refactor code but afraid to break things

## Quick Reference

### Test Types at a Glance

| Type | Scope | Speed | When to Use |
| ---- | ----- | ----- | ----------- |
| **Unit** | Single function/method | Fast (ms) | Pure logic, utilities, transformations |
| **Integration** | Multiple modules | Medium (s) | API endpoints, database queries, services |
| **E2E** | Full user flow | Slow (min) | Critical paths: login, checkout, signup |
| **Snapshot** | UI output | Fast | Component structure, serialized output |
| **Contract** | API interfaces | Medium | Microservices, third-party integrations |

### Testing Pyramid Ratio

| Level | Percentage | Characteristics |
| ----- | ---------- | --------------- |
| Unit | 70% | Fast, isolated, many tests |
| Integration | 20% | Module interactions, some mocking |
| E2E | 10% | Critical paths only, slow but realistic |

### Common Mistakes

| ❌ Don't | ✅ Do |
| --------- | ------ |
| Test implementation details | Test behavior and outputs |
| Mock everything | Mock only external dependencies |
| Write tests after bugs | Write tests with features (TDD) |
| Flaky tests with `sleep()` | Wait for specific conditions |
| Test private methods | Test public API |
| Huge test files | One test file per module |
| Skip edge cases | Test boundaries and errors |
| Ignore test failures | Fix or delete, never ignore |

### File Naming Conventions

| Language | Pattern | Example |
| -------- | ------- | ------- |
| JavaScript/TypeScript | `*.test.ts` or `*.spec.ts` | `Button.test.tsx` |
| Python | `test_*.py` | `test_auth.py` |
| Go | `*_test.go` | `auth_test.go` |
| Java | `*Test.java` | `AuthServiceTest.java` |

## Details

### Testing Pyramid

The testing pyramid guides how many tests to write at each level:

```text
       /\
      /e2e\      Few (slow, expensive, brittle)
     /------\
    /intgr.  \   Some (moderate speed, moderate cost)
   /----------\
  /   unit     \ Many (fast, cheap, stable)
 /--------------\
```text

**Guidelines:**

- **70% unit tests**: Fast, isolated, test individual functions/methods
- **20% integration tests**: Test module interactions, database queries, API endpoints
- **10% e2e tests**: Critical user journeys only (login, checkout, core workflows)

**Why this ratio:**

- Unit tests are fast (milliseconds), run frequently during development
- Integration tests catch connection issues between components
- E2e tests are slow (seconds/minutes) but validate real user experience
- Over-reliance on e2e tests creates slow, flaky test suites

### Test Organization

#### Pattern 1: Colocated Tests (JavaScript/TypeScript)

Place test files next to the code they test:

```text
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx
│   ├── Form.tsx
│   └── Form.test.tsx
├── lib/
│   ├── auth.ts
│   ├── auth.test.ts
│   ├── cache.ts
│   └── cache.test.ts
└── utils/
    ├── formatDate.ts
    └── formatDate.test.ts
```text

**When to use:**

- React, Next.js, Node.js projects
- Component-heavy applications
- Small to medium-sized codebases

**Advantages:**

- Easy to find tests for a given file
- Tests move with code during refactoring
- Clear 1:1 relationship between code and tests

**Naming convention:** `{filename}.test.{ext}` or `{filename}.spec.{ext}`

#### Pattern 2: Separate Test Directory (Python, Go, Java)

Separate tests from source code:

```text
project/
├── src/
│   ├── auth.py
│   ├── cache.py
│   └── utils.py
└── tests/
    ├── test_auth.py
    ├── test_cache.py
    └── test_utils.py
```text

**When to use:**

- Python, Go, Java, Rust projects
- Library/package development
- Large codebases with many test utilities

**Advantages:**

- Clean separation of production and test code
- Easier to exclude tests from production builds
- Shared test fixtures in `tests/conftest.py` (pytest)

**Naming convention:** `test_{filename}.{ext}` (Python, pytest) or `{filename}_test.go` (Go)

### Unit Testing

Test individual functions/methods in isolation.

#### JavaScript/TypeScript (Jest)

```javascript
// lib/formatPrice.ts
export function formatPrice(cents: number, currency = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(dollars);
}

// lib/formatPrice.test.ts
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    expect(formatPrice(1234)).toBe('$12.34');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('supports different currencies', () => {
    expect(formatPrice(1234, 'EUR')).toBe('€12.34');
  });

  it('rounds to two decimal places', () => {
    expect(formatPrice(1235)).toBe('$12.35');
  });
});
```text

**Best practices:**

- **One assertion per test** (or closely related assertions)
- **Descriptive test names** that read like specifications
- **Arrange-Act-Assert** pattern for clarity
- **Test edge cases**: zero, negative, null, undefined, empty strings

#### Python (pytest)

```python
# src/validator.py
def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or '@' not in email:
        return False
    local, domain = email.rsplit('@', 1)
    return len(local) > 0 and len(domain) > 3 and '.' in domain

# tests/test_validator.py
import pytest
from src.validator import validate_email

class TestValidateEmail:
    def test_valid_email(self):
        assert validate_email('user@example.com') == True
    
    def test_missing_at_symbol(self):
        assert validate_email('userexample.com') == False
    
    def test_empty_string(self):
        assert validate_email('') == False
    
    def test_missing_domain(self):
        assert validate_email('user@') == False
    
    @pytest.mark.parametrize('email,expected', [
        ('test@test.co', True),
        ('a@b.c', False),  # domain too short
        ('@example.com', False),  # no local part
        ('user@nodot', False),  # no dot in domain
    ])
    def test_edge_cases(self, email, expected):
        assert validate_email(email) == expected
```text

**Best practices:**

- **Use `pytest.mark.parametrize`** for testing multiple inputs
- **Group related tests** in classes
- **Use fixtures** for shared setup (see Fixtures section)
- **Test both happy path and error cases**

#### Go Testing

```go
// math/calculator.go
package math

func Add(a, b int) int {
    return a + b
}

func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// math/calculator_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}

func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        want      int
        wantError bool
    }{
        {"normal division", 10, 2, 5, false},
        {"division by zero", 10, 0, 0, true},
        {"negative numbers", -10, 2, -5, false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)
            if (err != nil) != tt.wantError {
                t.Errorf("Divide() error = %v, wantError %v", err, tt.wantError)
                return
            }
            if got != tt.want {
                t.Errorf("Divide() = %v, want %v", got, tt.want)
            }
        })
    }
}
```text

**Best practices:**

- **Table-driven tests** for multiple scenarios
- **Use `t.Run()`** for subtests with clear names
- **Check both return value and error**

### Mocking and Stubs

Mock external dependencies to test code in isolation.

#### JavaScript (Jest Mocks)

```javascript
// lib/api.ts
export async function fetchUser(userId: string) {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  return response.json();
}

// lib/greeting.ts
import { fetchUser } from './api';

export async function greetUser(userId: string) {
  const user = await fetchUser(userId);
  return `Hello, ${user.name}!`;
}

// lib/greeting.test.ts
import { greetUser } from './greeting';
import { fetchUser } from './api';

// Mock the entire api module
jest.mock('./api');

describe('greetUser', () => {
  it('greets user by name', async () => {
    // Setup mock return value
    (fetchUser as jest.Mock).mockResolvedValue({ name: 'Alice' });
    
    const greeting = await greetUser('123');
    
    expect(greeting).toBe('Hello, Alice!');
    expect(fetchUser).toHaveBeenCalledWith('123');
  });
  
  it('handles fetch errors', async () => {
    (fetchUser as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    await expect(greetUser('123')).rejects.toThrow('Network error');
  });
});
```text

**When to mock:**

- External API calls (HTTP requests)
- Database queries
- File system operations
- Date/time (for deterministic tests)
- Random number generators

**When NOT to mock:**

- Pure functions (no side effects)
- Simple utility functions
- Code under test (only mock dependencies)

#### Python (pytest with unittest.mock)

```python
# src/notification.py
import requests

def send_email(to: str, subject: str, body: str) -> bool:
    """Send email via external API."""
    response = requests.post('https://api.mailservice.com/send', json={
        'to': to,
        'subject': subject,
        'body': body
    })
    return response.status_code == 200

# tests/test_notification.py
import pytest
from unittest.mock import patch, Mock
from src.notification import send_email

class TestSendEmail:
    @patch('src.notification.requests.post')
    def test_successful_send(self, mock_post):
        # Setup mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = send_email('user@example.com', 'Hello', 'Body text')
        
        assert result == True
        mock_post.assert_called_once_with(
            'https://api.mailservice.com/send',
            json={
                'to': 'user@example.com',
                'subject': 'Hello',
                'body': 'Body text'
            }
        )
    
    @patch('src.notification.requests.post')
    def test_failed_send(self, mock_post):
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response
        
        result = send_email('user@example.com', 'Hello', 'Body')
        
        assert result == False
```text

**Best practices:**

- **Use `@patch` decorator** to replace dependencies
- **Verify mock was called correctly** with `assert_called_once_with`
- **Mock at the usage point**, not the import point
- **Reset mocks between tests** (pytest does this automatically)

### Fixtures and Test Setup

Share setup code across multiple tests.

#### pytest Fixtures

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import User

@pytest.fixture
def db_session():
    """Create a test database session."""
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session  # Test runs here
    
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing."""
    user = User(email='test@example.com', name='Test User')
    db_session.add(user)
    db_session.commit()
    return user

# tests/test_user_service.py
def test_get_user(db_session, sample_user):
    """Test retrieving a user."""
    user = db_session.query(User).filter_by(email='test@example.com').first()
    assert user.name == 'Test User'
```text

**Fixture scopes:**

- **function** (default): Run before each test
- **class**: Run once per test class
- **module**: Run once per test file
- **session**: Run once per test suite

**When to use fixtures:**

- Database setup/teardown
- Creating test data
- Initializing API clients
- Setting up temporary files

#### Jest Setup/Teardown

```javascript
// lib/database.test.ts
import { setupTestDB, teardownTestDB, createUser } from './testUtils';

describe('User operations', () => {
  let db;
  
  // Run before all tests in this describe block
  beforeAll(async () => {
    db = await setupTestDB();
  });
  
  // Run after all tests
  afterAll(async () => {
    await teardownTestDB(db);
  });
  
  // Run before each test
  beforeEach(async () => {
    await db.clear(); // Clear test data
  });
  
  it('creates a user', async () => {
    const user = await createUser(db, { name: 'Alice' });
    expect(user.name).toBe('Alice');
  });
  
  it('finds users by email', async () => {
    await createUser(db, { name: 'Alice', email: 'alice@test.com' });
    const user = await db.findByEmail('alice@test.com');
    expect(user).not.toBeNull();
  });
});
```text

### Integration Testing

Test multiple modules working together.

#### API Endpoint Testing (Node.js + Supertest)

```javascript
// app.test.ts
import request from 'supertest';
import { app } from './app';
import { setupTestDB, teardownTestDB } from './testUtils';

describe('POST /api/users', () => {
  let db;
  
  beforeAll(async () => {
    db = await setupTestDB();
  });
  
  afterAll(async () => {
    await teardownTestDB(db);
  });
  
  it('creates a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201);
    
    expect(response.body).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com'
    });
    expect(response.body.id).toBeDefined();
  });
  
  it('rejects invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'invalid-email' })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid email');
  });
});
```text

#### Database Integration (Python)

```python
# tests/test_user_repository.py
import pytest
from src.database import init_db
from src.repositories import UserRepository

@pytest.fixture
def user_repo(db_session):
    return UserRepository(db_session)

class TestUserRepository:
    def test_create_and_find_user(self, user_repo):
        # Create user
        user = user_repo.create(email='test@example.com', name='Test')
        assert user.id is not None
        
        # Find user
        found = user_repo.find_by_email('test@example.com')
        assert found.name == 'Test'
    
    def test_update_user(self, user_repo):
        user = user_repo.create(email='test@example.com', name='Old Name')
        
        user_repo.update(user.id, name='New Name')
        
        updated = user_repo.find_by_id(user.id)
        assert updated.name == 'New Name'
```text

### End-to-End Testing

Test complete user workflows through the UI.

#### Playwright/Cypress Example

```javascript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });
  
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });
});
```text

**E2E best practices:**

- **Test critical paths only**: Login, checkout, core workflows
- **Use data-testid attributes** instead of CSS selectors
- **Run against staging environment**, not production
- **Keep tests independent**: Each test should set up its own data
- **Use page object pattern** for maintainability

### Test Coverage Guidelines

Coverage metrics help identify untested code, but 100% coverage doesn't guarantee quality.

**Recommended targets:**

- **Critical paths**: 90-100% coverage (authentication, payments, data loss scenarios)
- **Business logic**: 80-90% coverage
- **UI components**: 60-80% coverage
- **Utility functions**: 80-90% coverage

**What to focus on:**

- Business-critical features
- Complex algorithms
- Error handling paths
- Edge cases

**What to skip:**

- Generated code
- Third-party library wrappers (test your usage, not the library)
- Trivial getters/setters
- Configuration files

**Running coverage:**

```bash
# JavaScript (Jest)
npm test -- --coverage

# Python (pytest)
pytest --cov=src --cov-report=html

# Go
go test -cover ./...
```text

### CI/CD Integration

Run tests automatically on every commit and pull request.

#### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

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
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb  # pragma: allowlist secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```text

**Best practices:**

- **Fail fast**: Run unit tests before integration tests
- **Parallel execution**: Run test suites in parallel when possible
- **Cache dependencies**: Speed up builds with dependency caching
- **Required checks**: Block PRs with failing tests

### Common Testing Anti-Patterns

#### 1. Testing Implementation Details

```javascript
// ❌ BAD: Tests internal state
it('sets loading to true', () => {
  const component = render(<UserProfile userId="123" />);
  expect(component.state.loading).toBe(true);
});

// ✅ GOOD: Tests user-visible behavior
it('shows loading spinner while fetching user', () => {
  render(<UserProfile userId="123" />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```text

#### 2. Flaky Tests (Non-Deterministic)

```javascript
// ❌ BAD: Depends on timing
it('updates after delay', async () => {
  triggerUpdate();
  await new Promise(resolve => setTimeout(resolve, 100)); // Race condition!
  expect(getValue()).toBe('updated');
});

// ✅ GOOD: Wait for specific condition
it('updates after delay', async () => {
  triggerUpdate();
  await waitFor(() => expect(getValue()).toBe('updated'), { timeout: 1000 });
});
```text

#### 3. Overly Complex Test Setup

```javascript
// ❌ BAD: Too much setup obscures test intent
it('calculates total', () => {
  const cart = new ShoppingCart();
  const item1 = new Item({ id: 1, price: 10, quantity: 2 });
  const item2 = new Item({ id: 2, price: 5, quantity: 1 });
  cart.addItem(item1);
  cart.addItem(item2);
  cart.applyDiscount(new Discount({ type: 'percentage', value: 10 }));
  
  expect(cart.getTotal()).toBe(22.5);
});

// ✅ GOOD: Use factory helpers
it('calculates total with discount', () => {
  const cart = createCart({
    items: [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 }
    ],
    discount: { type: 'percentage', value: 10 }
  });
  
  expect(cart.getTotal()).toBe(22.5);
});
```text

#### 4. Testing Multiple Things at Once

```javascript
// ❌ BAD: Multiple assertions for different behaviors
it('user CRUD operations', async () => {
  const user = await createUser({ name: 'Alice' });
  expect(user.id).toBeDefined();
  
  const found = await findUser(user.id);
  expect(found.name).toBe('Alice');
  
  await updateUser(user.id, { name: 'Bob' });
  const updated = await findUser(user.id);
  expect(updated.name).toBe('Bob');
  
  await deleteUser(user.id);
  const deleted = await findUser(user.id);
  expect(deleted).toBeNull();
});

// ✅ GOOD: One test per behavior
it('creates user with generated id', async () => {
  const user = await createUser({ name: 'Alice' });
  expect(user.id).toBeDefined();
});

it('finds user by id', async () => {
  const user = await createUser({ name: 'Alice' });
  const found = await findUser(user.id);
  expect(found.name).toBe('Alice');
});

it('updates user name', async () => {
  const user = await createUser({ name: 'Alice' });
  await updateUser(user.id, { name: 'Bob' });
  const updated = await findUser(user.id);
  expect(updated.name).toBe('Bob');
});
```text

### Quick Reference: Test Commands

**JavaScript (Jest):**

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm test Button             # Run tests matching "Button"
```text

**Python (pytest):**

```bash
pytest                      # Run all tests
pytest -v                   # Verbose output
pytest --cov=src            # With coverage
pytest tests/test_auth.py   # Run specific file
pytest -k "test_login"      # Run tests matching name
pytest -x                   # Stop on first failure
```text

**Go:**

```bash
go test ./...               # Run all tests
go test -v ./...            # Verbose output
go test -cover ./...        # With coverage
go test -run TestAdd        # Run specific test
```text

### Test Doubles: Mocks, Stubs, Fakes, and Spies

Test doubles are objects that replace real dependencies during testing. Each type serves a specific purpose.

#### Types of Test Doubles

| Type | Purpose | Verification | Example Use Case |
| ---- | ------- | ------------ | ---------------- |
| **Stub** | Provides predetermined responses | No verification | Return canned API responses |
| **Mock** | Verifies interactions and behavior | Asserts method calls | Verify email was sent with correct params |
| **Fake** | Working implementation (simplified) | No verification | In-memory database for testing |
| **Spy** | Records interactions, forwards to real object | Asserts call history | Track how many times cache was hit |

#### Stubs: Return Canned Responses

Stubs provide predetermined answers to method calls without verifying how they're used.

**JavaScript (Jest):**

```javascript
// lib/weatherService.ts
export async function getCurrentWeather(city: string) {
  const response = await fetch(`https://api.weather.com/v1/current?city=${city}`);
  return response.json();
}

// lib/weatherAlert.test.ts
import { getCurrentWeather } from './weatherService';
import { shouldSendAlert } from './weatherAlert';

jest.mock('./weatherService');

describe('shouldSendAlert', () => {
  it('sends alert when temperature exceeds threshold', async () => {
    // Stub returns predetermined data
    (getCurrentWeather as jest.Mock).mockResolvedValue({
      temp: 95,
      humidity: 80
    });
    
    const result = await shouldSendAlert('Phoenix');
    expect(result).toBe(true);
  });
  
  it('does not send alert for normal temperature', async () => {
    (getCurrentWeather as jest.Mock).mockResolvedValue({
      temp: 72,
      humidity: 60
    });
    
    const result = await shouldSendAlert('Seattle');
    expect(result).toBe(false);
  });
});
```

**Python (unittest.mock):**

```python
# src/payment_processor.py
from src.payment_gateway import PaymentGateway

def process_payment(amount: float, card_token: str) -> bool:
    gateway = PaymentGateway()
    response = gateway.charge(amount, card_token)
    return response['status'] == 'success'

# tests/test_payment_processor.py
from unittest.mock import Mock
from src.payment_processor import process_payment

def test_successful_payment():
    # Stub: return predetermined response
    mock_gateway = Mock()
    mock_gateway.charge.return_value = {'status': 'success', 'transaction_id': 'txn_123'}
    
    result = process_payment(100.0, 'tok_visa')
    assert result == True

def test_failed_payment():
    mock_gateway = Mock()
    mock_gateway.charge.return_value = {'status': 'declined', 'reason': 'insufficient_funds'}
    
    result = process_payment(100.0, 'tok_visa')
    assert result == False
```

**When to use stubs:**

- Testing error handling paths (network failures, API errors)
- Isolating code from slow external dependencies
- Testing with various response scenarios
- Avoiding side effects (database writes, API calls)

#### Mocks: Verify Behavior

Mocks verify that specific methods were called with expected parameters.

**JavaScript (Jest):**

```javascript
// lib/logger.ts
export interface Logger {
  info(message: string): void;
  error(message: string, error: Error): void;
}

// lib/userService.ts
import { Logger } from './logger';

export class UserService {
  constructor(private logger: Logger) {}
  
  async createUser(email: string) {
    this.logger.info(`Creating user: ${email}`);
    // ... create user logic
    this.logger.info(`User created: ${email}`);
  }
}

// lib/userService.test.ts
describe('UserService', () => {
  it('logs user creation', async () => {
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    const service = new UserService(mockLogger);
    await service.createUser('test@example.com');
    
    // Verify logger was called correctly
    expect(mockLogger.info).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith('Creating user: test@example.com');
    expect(mockLogger.info).toHaveBeenCalledWith('User created: test@example.com');
  });
});
```

**Python (unittest.mock with assert_called_with):**

```python
# src/email_service.py
class EmailService:
    def send(self, to: str, subject: str, body: str):
        pass  # Implementation sends email

# src/user_notifier.py
class UserNotifier:
    def __init__(self, email_service: EmailService):
        self.email_service = email_service
    
    def notify_welcome(self, user_email: str, username: str):
        subject = f"Welcome, {username}!"
        body = f"Hello {username}, welcome to our platform!"
        self.email_service.send(user_email, subject, body)

# tests/test_user_notifier.py
from unittest.mock import Mock
from src.user_notifier import UserNotifier

def test_notify_welcome_sends_email():
    mock_email = Mock()
    notifier = UserNotifier(mock_email)
    
    notifier.notify_welcome('alice@example.com', 'Alice')
    
    # Verify email was sent with correct parameters
    mock_email.send.assert_called_once_with(
        'alice@example.com',
        'Welcome, Alice!',
        'Hello Alice, welcome to our platform!'
    )
```

**When to use mocks:**

- Verifying side effects (email sent, log written, event published)
- Ensuring methods are called in correct order
- Validating integration between components
- Testing that error handlers are invoked

#### Fakes: Simplified Working Implementation

Fakes have working implementations but take shortcuts (e.g., in-memory database instead of PostgreSQL).

**JavaScript (In-Memory Database Fake):**

```javascript
// lib/userRepository.ts
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

// tests/fakes/InMemoryUserRepository.ts
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  
  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
  
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  
  clear() {
    this.users.clear();
  }
}

// lib/userService.test.ts
import { UserService } from './userService';
import { InMemoryUserRepository } from '../tests/fakes/InMemoryUserRepository';

describe('UserService', () => {
  let repository: InMemoryUserRepository;
  let service: UserService;
  
  beforeEach(() => {
    repository = new InMemoryUserRepository();
    service = new UserService(repository);
  });
  
  it('creates and retrieves user', async () => {
    await service.createUser({ id: '1', name: 'Alice' });
    
    const user = await service.getUser('1');
    expect(user?.name).toBe('Alice');
  });
});
```

**Python (Fake File System):**

```python
# src/file_storage.py
class FileStorage:
    def write(self, path: str, content: str):
        pass  # Writes to actual filesystem
    
    def read(self, path: str) -> str:
        pass  # Reads from actual filesystem

# tests/fakes/fake_file_storage.py
class FakeFileStorage:
    def __init__(self):
        self.files = {}
    
    def write(self, path: str, content: str):
        self.files[path] = content
    
    def read(self, path: str) -> str:
        return self.files.get(path, '')
    
    def clear(self):
        self.files.clear()

# tests/test_config_manager.py
from src.config_manager import ConfigManager
from tests.fakes.fake_file_storage import FakeFileStorage

def test_save_and_load_config():
    storage = FakeFileStorage()
    manager = ConfigManager(storage)
    
    manager.save({'api_key': 'test123'})  # pragma: allowlist secret
    config = manager.load()
    
    assert config['api_key'] == 'test123'  # pragma: allowlist secret
```

**When to use fakes:**

- Testing against databases (use in-memory SQLite instead of PostgreSQL)
- File system operations (use in-memory fake instead of disk)
- External services with complex state (fake payment gateway)
- Integration tests that need working implementations

#### Spies: Record Interactions

Spies record how they're used while forwarding calls to the real implementation.

**JavaScript (Jest Spies):**

```javascript
// lib/cache.ts
export class Cache {
  private data = new Map<string, any>();
  
  get(key: string): any {
    return this.data.get(key);
  }
  
  set(key: string, value: any): void {
    this.data.set(key, value);
  }
}

// lib/dataService.test.ts
import { Cache } from './cache';
import { DataService } from './dataService';

describe('DataService', () => {
  it('uses cache for repeated requests', async () => {
    const cache = new Cache();
    const getSpy = jest.spyOn(cache, 'get');
    const setSpy = jest.spyOn(cache, 'set');
    
    const service = new DataService(cache);
    
    await service.getData('user:123'); // Cache miss
    await service.getData('user:123'); // Cache hit
    
    // Verify cache was checked twice
    expect(getSpy).toHaveBeenCalledTimes(2);
    // Verify cache was set once (first request)
    expect(setSpy).toHaveBeenCalledTimes(1);
  });
});
```

**Python (unittest.mock with wraps):**

```python
# src/analytics.py
class Analytics:
    def track_event(self, event: str, properties: dict):
        pass  # Send to analytics service

# src/user_service.py
class UserService:
    def __init__(self, analytics: Analytics):
        self.analytics = analytics
    
    def create_user(self, email: str):
        # ... create user
        self.analytics.track_event('user_created', {'email': email})

# tests/test_user_service.py
from unittest.mock import Mock
from src.user_service import UserService
from src.analytics import Analytics

def test_tracks_user_creation():
    real_analytics = Analytics()
    # Spy: wrap real object to record calls
    spy_analytics = Mock(wraps=real_analytics)
    
    service = UserService(spy_analytics)
    service.create_user('test@example.com')
    
    # Verify event was tracked
    spy_analytics.track_event.assert_called_once_with(
        'user_created',
        {'email': 'test@example.com'}
    )
```

**When to use spies:**

- Verifying caching behavior
- Tracking how many times a method is called
- Ensuring event handlers are invoked
- Testing with real implementations while monitoring interactions

#### Choosing the Right Test Double

| Scenario | Use |
| -------- | --- |
| Need predetermined response | **Stub** |
| Verify method was called correctly | **Mock** |
| Need working implementation for tests | **Fake** |
| Monitor real object interactions | **Spy** |
| Test error handling | **Stub** (return error) |
| Test integration patterns | **Fake** (in-memory DB) |
| Verify side effects | **Mock** |

### Property-Based Testing

Property-based testing generates random test inputs to verify invariants (properties that should always be true).

#### JavaScript (fast-check)

```javascript
// lib/sort.ts
export function sort(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

// lib/sort.test.ts
import fc from 'fast-check';
import { sort } from './sort';

describe('sort', () => {
  it('returns array of same length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        expect(sorted.length).toBe(arr.length);
      })
    );
  });
  
  it('returns sorted array (ascending order)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i]).toBeLessThanOrEqual(sorted[i + 1]);
        }
      })
    );
  });
  
  it('contains all original elements', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort(arr);
        const originalCounts = countElements(arr);
        const sortedCounts = countElements(sorted);
        expect(sortedCounts).toEqual(originalCounts);
      })
    );
  });
});

function countElements(arr: number[]): Map<number, number> {
  const counts = new Map();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return counts;
}
```

**Install:** `npm install --save-dev fast-check`

#### Python (Hypothesis)

```python
# src/string_utils.py
def reverse(s: str) -> str:
    return s[::-1]

def is_palindrome(s: str) -> bool:
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

# tests/test_string_utils.py
from hypothesis import given, strategies as st
from src.string_utils import reverse, is_palindrome

class TestReverse:
    @given(st.text())
    def test_reverse_twice_returns_original(self, text):
        """Reversing twice should return original string."""
        assert reverse(reverse(text)) == text
    
    @given(st.text())
    def test_reverse_preserves_length(self, text):
        """Reversed string has same length."""
        assert len(reverse(text)) == len(text)

class TestIsPalindrome:
    @given(st.text())
    def test_palindrome_symmetry(self, text):
        """If text is palindrome, reversed is also palindrome."""
        if is_palindrome(text):
            assert is_palindrome(reverse(text))
    
    @given(st.text())
    def test_single_char_is_palindrome(self, char):
        """Single characters are always palindromes."""
        if len(char) == 1 and char.isalnum():
            assert is_palindrome(char)
```

**Install:** `pip install hypothesis`

#### Properties to Test

Common invariants that apply to many functions:

| Property | Description | Example |
| -------- | ----------- | ------- |
| **Idempotence** | Applying twice = applying once | `sort(sort(arr)) == sort(arr)` |
| **Inverse** | Applying inverse returns original | `reverse(reverse(s)) == s` |
| **Commutativity** | Order doesn't matter | `add(a, b) == add(b, a)` |
| **Associativity** | Grouping doesn't matter | `(a + b) + c == a + (b + c)` |
| **Identity** | Combining with identity returns input | `concat(str, '') == str` |
| **Length preservation** | Output length matches input | `encrypt(s).length == s.length` |

#### When to Use Property-Based Testing

**Good use cases:**

- Parsers (parse then serialize should equal original)
- Encoders/decoders (encode then decode should equal original)
- Mathematical functions (commutativity, associativity)
- Data transformations (length preservation, element preservation)
- Sorting/filtering (order invariants, element counts)

**Not ideal for:**

- Business logic with complex rules (use example-based tests)
- User interfaces (use snapshot or e2e tests)
- External API integration (use stubs/mocks)

### Mutation Testing

Mutation testing introduces small changes (mutations) to code and verifies tests fail. Passing tests with mutations indicate weak test coverage.

#### How Mutation Testing Works

1. **Generate mutants**: Modify code (change `>` to `>=`, flip boolean, remove line)
2. **Run tests**: Run test suite against each mutant
3. **Score**: `Mutation Score = Killed Mutants / Total Mutants`

**Example mutation:**

```javascript
// Original
function isAdult(age) {
  return age >= 18;
}

// Mutant 1: Change operator
function isAdult(age) {
  return age > 18;  // Boundary condition changed
}

// Mutant 2: Change constant
function isAdult(age) {
  return age >= 19;
}
```

If tests pass with these mutants, tests are insufficient.

#### JavaScript (Stryker)

```javascript
// lib/calculator.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function isPositive(n: number): boolean {
  return n > 0;
}

// lib/calculator.test.ts
describe('calculator', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
  
  it('handles positive numbers', () => {
    expect(isPositive(5)).toBe(true);
  });
});
```

**Run Stryker:**

```bash
# Install
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# Configure stryker.conf.json
{
  "packageManager": "npm",
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"]
}

# Run mutation testing
npx stryker run
```

**Output:**

```text
Mutants: 10 total, 8 killed, 2 survived, 0 timeout, 0 no coverage
Mutation score: 80%

Survived mutants:
- calculator.ts:6:10 - Changed > to >= (isPositive boundary not tested)
- calculator.ts:2:10 - Changed + to - (only positive case tested)
```

**Fix tests:**

```javascript
describe('calculator', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-2, 3)).toBe(1);  // Test negative numbers
  });
  
  it('handles positive numbers', () => {
    expect(isPositive(5)).toBe(true);
    expect(isPositive(0)).toBe(false);  // Test boundary
    expect(isPositive(-5)).toBe(false); // Test negative
  });
});
```

#### Python (mutmut)

```python
# src/validator.py
def is_valid_age(age: int) -> bool:
    return age >= 18 and age <= 120

# tests/test_validator.py
def test_is_valid_age():
    assert is_valid_age(25) == True
    assert is_valid_age(10) == False
```

**Run mutmut:**

```bash
# Install
pip install mutmut

# Run mutation testing
mutmut run

# View results
mutmut results

# Show survived mutants
mutmut show
```

**Output:**

```text
Mutation testing complete. 6 mutations, 4 killed, 2 survived.
Mutation score: 66.7%

Survived mutants:
- validator.py:2 - Changed >= to > (boundary 18 not tested)
- validator.py:2 - Changed <= to < (boundary 120 not tested)
```

**Fix tests:**

```python
def test_is_valid_age():
    assert is_valid_age(25) == True
    assert is_valid_age(10) == False
    assert is_valid_age(18) == True   # Test lower boundary
    assert is_valid_age(120) == True  # Test upper boundary
    assert is_valid_age(17) == False  # Below minimum
    assert is_valid_age(121) == False # Above maximum
```

#### Interpreting Mutation Scores

| Score | Interpretation | Action |
| ----- | -------------- | ------ |
| **90-100%** | Excellent coverage | Maintain quality |
| **75-89%** | Good coverage | Review survived mutants |
| **60-74%** | Adequate coverage | Add boundary tests |
| **< 60%** | Weak coverage | Significant test gaps |

**Common survived mutant types:**

- **Boundary conditions**: `>` vs `>=`, `<` vs `<=`
- **Return values**: Early returns, default values
- **Null handling**: Missing null/undefined checks
- **Error paths**: Exception handling not tested

#### When to Use Mutation Testing

**Use mutation testing:**

- Critical business logic (payments, access control)
- After achieving high line coverage (>80%)
- Before major releases
- When debugging production issues from missed edge cases

**Skip mutation testing:**

- Early development (focus on feature tests first)
- UI/presentation code (use snapshot tests instead)
- Generated code or boilerplate

**Best practices:**

- Run mutation tests in CI (nightly builds, not every commit)
- Focus on critical paths first
- Use mutation testing to find gaps, not as daily workflow
- Target 80-90% mutation score for critical code

## Related Playbooks

- **[Investigate Test Failures](../../playbooks/investigate-test-failures.md)** - Systematic workflow for debugging and fixing test failures across pytest, bash, Go, and JavaScript

## See Also

- **[API Design Patterns](../backend/api-design-patterns.md)** - Testing API endpoints and error responses
- **[Database Patterns](../backend/database-patterns.md)** - Testing database interactions and transactions
- **[Caching Patterns](../backend/caching-patterns.md)** - Testing cached data and invalidation logic
- **Python template**: `templates/python/VALIDATION_CRITERIA.project.md` - pytest quality gates
