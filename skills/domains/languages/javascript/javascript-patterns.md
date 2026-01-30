# JavaScript Patterns

## Quick Reference

| Pattern | Use Case | Key Insight |
|---------|----------|-------------|
| **Async/Await** | Asynchronous operations | Cleaner than promises, use try/catch for errors |
| **Destructuring** | Extract values from objects/arrays | Reduces boilerplate, enables default values |
| **Spread/Rest** | Clone objects, collect function args | Shallow copy only, use carefully with nested objects |
| **Arrow Functions** | Concise syntax, lexical `this` | Don't use for methods that need `this` binding |
| **Template Literals** | String interpolation, multiline strings | Use tagged templates for advanced scenarios |
| **Optional Chaining** | Safe property access | `obj?.prop?.nested` returns undefined if any part is nullish |
| **Nullish Coalescing** | Default values | `??` only triggers on null/undefined, not 0/false/'' |
| **Modules (ES6)** | Code organization | Use named exports for utilities, default for single thing |
| **Promise.all/allSettled** | Parallel async operations | `.all` fails fast, `.allSettled` waits for all |
| **Array Methods** | Functional data manipulation | `map/filter/reduce` over loops, immutable patterns |

## Async/Await Patterns

### Basic Usage

```javascript
// GOOD: Clean async/await with error handling
async function fetchUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error; // Re-throw or handle appropriately
  }
}

// AVOID: Missing error handling
async function fetchUserBad(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return await response.json(); // Crashes on network error or non-JSON response
}
```

### Parallel Async Operations

```javascript
// GOOD: Run independent operations in parallel
async function loadDashboard() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);
  return { user, posts, comments };
}

// AVOID: Sequential when parallel would work
async function loadDashboardSlow() {
  const user = await fetchUser();    // Wait
  const posts = await fetchPosts();  // Then wait
  const comments = await fetchComments(); // Then wait again
  return { user, posts, comments };
}
```

### Handling Partial Failures

```javascript
// GOOD: Continue on partial failure
async function loadWithFallbacks() {
  const results = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);
  
  return {
    user: results[0].status === 'fulfilled' ? results[0].value : null,
    posts: results[1].status === 'fulfilled' ? results[1].value : [],
    comments: results[2].status === 'fulfilled' ? results[2].value : []
  };
}
```

## Destructuring Patterns

### Object Destructuring

```javascript
// GOOD: Clean extraction with defaults
function processUser({ id, name, email, role = 'user' }) {
  console.log(`${name} (${role}): ${email}`);
  return { id, role };
}

// GOOD: Nested destructuring
function getCoordinates({ location: { lat, lng } }) {
  return [lat, lng];
}

// GOOD: Rename during destructuring
const { name: userName, id: userId } = user;

// GOOD: Rest operator for remaining properties
const { id, ...userWithoutId } = user;
```

### Array Destructuring

```javascript
// GOOD: Extract specific elements
const [first, second, ...rest] = array;

// GOOD: Skip elements
const [, , third] = array;

// GOOD: Swap variables
[a, b] = [b, a];

// GOOD: Function return multiple values
function getMinMax(numbers) {
  return [Math.min(...numbers), Math.max(...numbers)];
}
const [min, max] = getMinMax([1, 5, 3, 9, 2]);
```

## Module Patterns

### Named Exports (Recommended for Utilities)

```javascript
// utils.js - GOOD: Named exports for multiple utilities
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const CONFIG = {
  apiUrl: '/api',
  timeout: 5000
};

// consumer.js
import { formatDate, capitalize, CONFIG } from './utils.js';
```

### Default Export (For Single Main Thing)

```javascript
// UserService.js - GOOD: Default export for class/main component
export default class UserService {
  async getUser(id) {
    // ...
  }
}

// consumer.js
import UserService from './UserService.js';
```

### Mixed Exports (Use Sparingly)

```javascript
// api.js - ACCEPTABLE: Default + named utilities
class ApiClient {
  // ...
}

export default ApiClient;
export const endpoints = { users: '/users', posts: '/posts' };

// consumer.js
import ApiClient, { endpoints } from './api.js';
```

## Common Gotchas

### 1. `this` Binding in Arrow Functions

```javascript
// AVOID: Arrow function as method (loses this)
const obj = {
  value: 42,
  getValue: () => this.value // undefined! Arrow function captures outer this
};

// GOOD: Regular function for methods
const obj = {
  value: 42,
  getValue() { return this.value; } // Works correctly
};

// GOOD: Arrow function in callbacks (preserves this)
class Counter {
  count = 0;
  
  start() {
    setInterval(() => {
      this.count++; // Works! Arrow function captures Counter's this
    }, 1000);
  }
}
```

### 2. Shallow Copying with Spread

```javascript
// CAUTION: Spread is shallow copy
const original = { a: 1, nested: { b: 2 } };
const copy = { ...original };

copy.a = 99;          // ✅ original.a still 1
copy.nested.b = 99;   // ❌ original.nested.b is now 99!

// GOOD: Deep clone when needed
const deepCopy = JSON.parse(JSON.stringify(original)); // Simple objects only
// Or use structuredClone (modern)
const deepCopy = structuredClone(original);
```

### 3. Nullish vs Logical OR

```javascript
const value = 0;

// AVOID: || treats 0, false, '' as falsy
const result1 = value || 10; // 10 (maybe not intended)

// GOOD: ?? only triggers on null/undefined
const result2 = value ?? 10; // 0 (preserves falsy values)
```

### 4. Async Function Always Returns Promise

```javascript
// CAUTION: Even synchronous returns are wrapped
async function getValue() {
  return 42; // Actually returns Promise.resolve(42)
}

// AVOID: Unnecessary async
async function simple() {
  return x + y; // Don't need async if no await
}

// GOOD: Only async if awaiting
function simple() {
  return x + y;
}
```

## Array Functional Patterns

### Map, Filter, Reduce

```javascript
// GOOD: Functional pipeline
const result = users
  .filter(user => user.active)
  .map(user => user.email)
  .join(', ');

// GOOD: Reduce for aggregation
const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

// GOOD: Find for single match
const admin = users.find(user => user.role === 'admin');

// GOOD: Some/every for boolean checks
const hasAdmin = users.some(user => user.role === 'admin');
const allActive = users.every(user => user.active);
```

### Immutable Updates

```javascript
// GOOD: Add to array immutably
const newArray = [...oldArray, newItem];

// GOOD: Update array element immutably
const updated = array.map(item => 
  item.id === targetId ? { ...item, status: 'done' } : item
);

// GOOD: Remove from array immutably
const filtered = array.filter(item => item.id !== removeId);

// GOOD: Update object property immutably
const updated = { ...obj, status: 'done' };

// GOOD: Update nested property immutably
const updated = {
  ...obj,
  nested: {
    ...obj.nested,
    value: newValue
  }
};
```

## Error Handling Patterns

### Try/Catch with Async

```javascript
// GOOD: Handle errors at appropriate level
async function processData() {
  try {
    const data = await fetchData();
    return transformData(data);
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      return getCachedData(); // Fallback
    }
    throw error; // Re-throw if can't handle
  }
}

// GOOD: Multiple try/catch for different error contexts
async function complexOperation() {
  let data;
  try {
    data = await fetchData();
  } catch (error) {
    console.error('Fetch failed:', error);
    return null;
  }
  
  try {
    return await processData(data);
  } catch (error) {
    console.error('Process failed:', error);
    return data; // Return unprocessed
  }
}
```

### Custom Error Classes

```javascript
// GOOD: Typed errors for better handling
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

// Usage
try {
  await saveUser(userData);
} catch (error) {
  if (error instanceof ValidationError) {
    showFieldError(error.field, error.message);
  } else if (error instanceof NetworkError) {
    showNetworkError(error.statusCode);
  } else {
    showGenericError();
  }
}
```

## Performance Tips

### 1. Debounce/Throttle for Frequent Events

```javascript
// GOOD: Debounce search input
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

const handleSearch = debounce((query) => {
  searchAPI(query);
}, 300);
```

### 2. Avoid Unnecessary Re-renders/Recalculations

```javascript
// AVOID: Creating new objects in render loops
function render() {
  items.forEach(item => {
    const config = { color: 'red' }; // New object every time!
    renderItem(item, config);
  });
}

// GOOD: Reuse constants
const DEFAULT_CONFIG = { color: 'red' };
function render() {
  items.forEach(item => {
    renderItem(item, DEFAULT_CONFIG);
  });
}
```

### 3. Use Optional Chaining for Safety

```javascript
// AVOID: Multiple checks
if (user && user.profile && user.profile.address) {
  console.log(user.profile.address.city);
}

// GOOD: Optional chaining
console.log(user?.profile?.address?.city);

// GOOD: With nullish coalescing for default
const city = user?.profile?.address?.city ?? 'Unknown';
```

## See Also

- [TypeScript Patterns](../typescript/README.md) - Type-safe JavaScript patterns
- [React Patterns](../../frontend/react-patterns.md) - JavaScript in React context
- [Error Handling Patterns](../../backend/error-handling-patterns.md) - Cross-language error strategies
- [Testing Patterns](../../code-quality/testing-patterns.md) - JavaScript testing with Jest
- [API Design Patterns](../../backend/api-design-patterns.md) - JavaScript API implementations

## References

- MDN JavaScript Guide: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide>
- JavaScript.info: <https://javascript.info/>
- You Don't Know JS: <https://github.com/getify/You-Dont-Know-JS>
