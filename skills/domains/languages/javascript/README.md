# JavaScript Patterns and Best Practices

## Purpose

This guide covers modern JavaScript (ES6+) patterns, async programming, and module systems for building robust applications.

## Quick Reference

| Pattern | Use Case | Example |
| ------- | -------- | ------- |
| Arrow Functions | Concise syntax, lexical `this` | `const sum = (a, b) => a + b` |
| Destructuring | Extract values from objects/arrays | `const {name, age} = user` |
| Spread Operator | Clone/merge objects/arrays | `const merged = {...obj1, ...obj2}` |
| Template Literals | String interpolation | `` `Hello ${name}` `` |
| Promises | Async operations | `fetch(url).then(res => res.json())` |
| Async/Await | Sequential async code | `const data = await fetch(url)` |
| Optional Chaining | Safe property access | `user?.address?.city` |
| Nullish Coalescing | Default values | `const name = input ?? 'Unknown'` |

## Modern JavaScript (ES6+) Fundamentals

### Variable Declarations

**Use `const` by default, `let` when reassignment needed, never `var`:**

```javascript
// GOOD: const for immutable bindings
const API_KEY = 'abc123'; // pragma: allowlist secret
const users = ['Alice', 'Bob'];

// GOOD: let for reassignment
let counter = 0;
for (let i = 0; i < 10; i++) {
  counter += i;
}

// BAD: var has function scope and hoisting issues
var x = 1; // Avoid
```

### Arrow Functions

**Lexical `this` binding and concise syntax:**

```javascript
// Traditional function
function multiply(a, b) {
  return a * b;
}

// Arrow function - concise
const multiply = (a, b) => a * b;

// Arrow function - block body
const processData = (data) => {
  const filtered = data.filter(x => x > 0);
  return filtered.map(x => x * 2);
};

// Lexical this - useful in callbacks
class Timer {
  constructor() {
    this.seconds = 0;
    // Arrow function captures 'this' from Timer instance
    setInterval(() => {
      this.seconds++;
      console.log(this.seconds);
    }, 1000);
  }
}
```

**When NOT to use arrow functions:**

```javascript
// BAD: Object methods (loses this binding)
const obj = {
  value: 42,
  getValue: () => this.value // undefined!
};

// GOOD: Use regular function or method shorthand
const obj = {
  value: 42,
  getValue() { return this.value; }
};
```

### Destructuring

**Extract values from objects and arrays:**

```javascript
// Object destructuring
const user = { name: 'Alice', age: 30, city: 'NYC' };
const { name, age } = user;

// With defaults
const { name, role = 'user' } = user;

// Rename variables
const { name: userName, age: userAge } = user;

// Nested destructuring
const { address: { city, zip } } = user;

// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first); // 1
console.log(rest);  // [3, 4, 5]

// Function parameters
function greet({ name, age }) {
  return `Hello ${name}, you are ${age}`;
}

// Swapping variables
let a = 1, b = 2;
[a, b] = [b, a];
```

### Spread Operator and Rest Parameters

**Clone, merge, and collect values:**

```javascript
// Array spread
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Object spread (shallow merge)
const defaults = { theme: 'light', lang: 'en' };
const userPrefs = { theme: 'dark' };
const config = { ...defaults, ...userPrefs }; // { theme: 'dark', lang: 'en' }

// Rest parameters (collect arguments)
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
sum(1, 2, 3, 4); // 10

// Exclude properties
const { password, ...safeUser } = user;
```

### Template Literals

**String interpolation and multiline strings:**

```javascript
const name = 'Alice';
const age = 30;

// Interpolation
const greeting = `Hello ${name}, you are ${age} years old`;

// Multiline strings
const html = `
  <div class="user">
    <h1>${name}</h1>
    <p>Age: ${age}</p>
  </div>
`;

// Tagged templates (advanced)
function sql(strings, ...values) {
  // Custom string processing
  return { query: strings.join('?'), params: values };
}
const userId = 42;
const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Optional Chaining and Nullish Coalescing

**Safe property access and default values:**

```javascript
// Optional chaining (?.) - stops if null/undefined
const city = user?.address?.city; // No error if user or address is null

// Function calls
const result = obj.method?.(arg); // Only calls if method exists

// Array access
const first = arr?.[0];

// Nullish coalescing (??) - only for null/undefined
const port = config.port ?? 3000; // Uses 3000 if port is null/undefined
const name = user.name ?? 'Anonymous';

// Compare with ||
const count = 0;
const a = count || 10;  // 10 (falsy coercion)
const b = count ?? 10;  // 0  (only null/undefined)
```

## Async Patterns

### Promises

**Handle async operations with then/catch chains:**

```javascript
// Creating a promise
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) {
        resolve({ id, name: 'Alice' });
      } else {
        reject(new Error('Invalid ID'));
      }
    }, 1000);
  });
}

// Using promises
fetchUser(1)
  .then(user => {
    console.log(user);
    return fetchUser(2); // Chain another promise
  })
  .then(user => console.log(user))
  .catch(error => console.error(error))
  .finally(() => console.log('Done'));

// Promise combinators
Promise.all([fetch('/api/users'), fetch('/api/posts')])
  .then(([users, posts]) => {
    // Both completed successfully
  });

Promise.allSettled([promise1, promise2])
  .then(results => {
    // All completed (some may have failed)
    results.forEach(r => {
      if (r.status === 'fulfilled') console.log(r.value);
      else console.error(r.reason);
    });
  });

Promise.race([fetch('/api'), timeout(5000)])
  .then(winner => console.log('First to complete'));

Promise.any([backup1, backup2, backup3])
  .then(first => console.log('First successful'));
```

### Async/Await

**Write async code that looks synchronous:**

```javascript
// Basic async function
async function loadUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to load user:', error);
    throw error;
  }
}

// Sequential execution
async function processUsers() {
  const user1 = await loadUser(1); // Wait
  const user2 = await loadUser(2); // Then wait
  return [user1, user2];
}

// Parallel execution
async function processUsersParallel() {
  const [user1, user2] = await Promise.all([
    loadUser(1),
    loadUser(2)
  ]);
  return [user1, user2];
}

// Error handling patterns
async function robustLoad(id) {
  try {
    return await loadUser(id);
  } catch (error) {
    if (error.status === 404) {
      return null; // Handle specific error
    }
    throw error; // Re-throw others
  }
}

// Top-level await (ES2022)
// In module scope
const config = await fetch('/config.json').then(r => r.json());
```

### Generators

**Pausable functions for iteration and async control:**

```javascript
// Basic generator
function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }

// Infinite sequences
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Async generators
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();
    if (data.length === 0) break;
    yield data;
    page++;
  }
}

// Using async generator
for await (const pageData of fetchPages('/api/items')) {
  console.log(pageData);
}
```

## Module Systems

### ES Modules (ESM)

**Modern standard module system:**

```javascript
// math.js - Named exports
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}

// Inline export
export class Calculator {
  add(a, b) { return a + b; }
}

// main.js - Import named exports
import { PI, add } from './math.js';
import { Calculator } from './math.js';

// Import with rename
import { add as sum } from './math.js';

// Import all as namespace
import * as math from './math.js';
console.log(math.PI, math.add(2, 3));

// utils.js - Default export
export default function greet(name) {
  return `Hello ${name}`;
}

// Import default
import greet from './utils.js';

// Mix default and named
export default class User {}
export const USER_ROLE = 'admin';

import User, { USER_ROLE } from './user.js';
```

**Dynamic imports:**

```javascript
// Code splitting - lazy load modules
async function loadFeature() {
  const module = await import('./heavy-feature.js');
  module.initialize();
}

// Conditional loading
if (user.isAdmin) {
  const { AdminPanel } = await import('./admin.js');
  new AdminPanel();
}

// React lazy loading
const AdminPanel = React.lazy(() => import('./AdminPanel'));
```

### CommonJS (Node.js)

**Traditional Node.js module system:**

```javascript
// math.js - CommonJS exports
module.exports = {
  PI: 3.14159,
  add: (a, b) => a + b
};

// Or individual exports
exports.PI = 3.14159;
exports.add = (a, b) => a + b;

// main.js - CommonJS require
const math = require('./math');
console.log(math.add(2, 3));

// Destructure on import
const { add, PI } = require('./math');

// Default export pattern
function Calculator() {}
module.exports = Calculator;

// Import default
const Calculator = require('./calculator');
```

**ESM vs CommonJS interop:**

```javascript
// package.json - specify module type
{
  "type": "module" // Use ESM by default
}

// Or use file extensions
// .mjs - always ESM
// .cjs - always CommonJS
// .js  - depends on package.json "type" field

// Import CommonJS from ESM
import pkg from './commonjs-module.cjs';
const { named } = pkg;

// Import ESM from CommonJS (requires async)
async function loadESM() {
  const module = await import('./esm-module.mjs');
  return module;
}
```

## Common Patterns

### Singleton Pattern

```javascript
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    this.connection = null;
    Database.instance = this;
  }

  connect() {
    if (!this.connection) {
      this.connection = createConnection();
    }
    return this.connection;
  }
}

// Usage
const db1 = new Database();
const db2 = new Database();
console.log(db1 === db2); // true
```

### Factory Pattern

```javascript
class User {
  constructor(name, role) {
    this.name = name;
    this.role = role;
  }
}

class UserFactory {
  static createUser(type, name) {
    switch (type) {
      case 'admin':
        return new User(name, 'admin');
      case 'guest':
        return new User(name, 'guest');
      default:
        return new User(name, 'user');
    }
  }
}

const admin = UserFactory.createUser('admin', 'Alice');
```

### Observer Pattern

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => {
        listener(...args);
      });
    }
  }

  off(event, listenerToRemove) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(
        listener => listener !== listenerToRemove
      );
    }
  }
}

// Usage
const emitter = new EventEmitter();
emitter.on('data', (data) => console.log(data));
emitter.emit('data', { id: 1, name: 'Alice' });
```

## Common Pitfalls

### 1. Mutating Objects

```javascript
// BAD: Mutates original array
const numbers = [1, 2, 3];
numbers.push(4); // Mutation

// GOOD: Create new array
const numbers = [1, 2, 3];
const updated = [...numbers, 4];

// BAD: Mutates object
const user = { name: 'Alice', age: 30 };
user.age = 31; // Mutation

// GOOD: Create new object
const updated = { ...user, age: 31 };
```

### 2. Forgetting `await`

```javascript
// BAD: Returns promise, not value
function getUser() {
  return fetch('/api/user').then(r => r.json());
}
const user = getUser(); // Promise object!

// GOOD: Await the promise
async function getUser() {
  const response = await fetch('/api/user');
  return await response.json();
}
const user = await getUser();
```

### 3. Promise Anti-Patterns

```javascript
// BAD: Unnecessary promise wrapping
async function badAsync() {
  return Promise.resolve(42); // Redundant
}

// GOOD: Just return value
async function goodAsync() {
  return 42; // Automatically wrapped in promise
}

// BAD: Nested promises
fetch('/api')
  .then(res => res.json())
  .then(data => {
    return fetch(`/api/${data.id}`)
      .then(res2 => res2.json()); // Nested!
  });

// GOOD: Flat chain
fetch('/api')
  .then(res => res.json())
  .then(data => fetch(`/api/${data.id}`))
  .then(res => res.json());
```

### 4. Misusing `this`

```javascript
// BAD: Lost context
class Counter {
  constructor() {
    this.count = 0;
  }

  increment() {
    this.count++;
  }
}

const counter = new Counter();
setTimeout(counter.increment, 1000); // this is undefined!

// GOOD: Bind or arrow function
setTimeout(() => counter.increment(), 1000);
// Or
setTimeout(counter.increment.bind(counter), 1000);
```

## Performance Tips

1. **Avoid synchronous operations in loops:**

   ```javascript
   // BAD: Sequential
   for (const id of ids) {
     await fetch(`/api/${id}`);
   }

   // GOOD: Parallel
   await Promise.all(ids.map(id => fetch(`/api/${id}`)));
   ```

2. **Debounce expensive operations:**

   ```javascript
   function debounce(fn, delay) {
     let timer;
     return (...args) => {
       clearTimeout(timer);
       timer = setTimeout(() => fn(...args), delay);
     };
   }

   const search = debounce(query => fetch(`/search?q=${query}`), 300);
   ```

3. **Use memoization for expensive computations:**

   ```javascript
   function memoize(fn) {
     const cache = new Map();
     return (...args) => {
       const key = JSON.stringify(args);
       if (cache.has(key)) return cache.get(key);
       const result = fn(...args);
       cache.set(key, result);
       return result;
     };
   }
   ```

## See Also

- **[skills/domains/languages/typescript/README.md](../typescript/README.md)** - TypeScript patterns and type safety
- **[skills/domains/frontend/react-patterns.md](../../frontend/react-patterns.md)** - React-specific patterns
- **[skills/domains/backend/api-design-patterns.md](../../backend/api-design-patterns.md)** - Backend API design
- **[skills/domains/code-quality/testing-patterns.md](../../code-quality/testing-patterns.md)** - Testing async code
