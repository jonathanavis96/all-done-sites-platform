# TypeScript Patterns and Best Practices

**Last Updated:** 2026-01-24

**Purpose:** Comprehensive guide to TypeScript type system, patterns, and integration strategies for building type-safe JavaScript applications.

---

## Quick Reference

| Pattern | Use Case | Key Benefit |
| ------- | -------- | ----------- |
| **Basic Types** | Variable declarations | Type safety and IntelliSense |
| **Interfaces** | Object shapes | Structural typing, extendable |
| **Type Aliases** | Union/intersection types | Complex type compositions |
| **Generics** | Reusable components | Type-safe abstractions |
| **Utility Types** | Type transformations | Built-in type manipulation |
| **Type Guards** | Runtime type checking | Type narrowing |
| **Declaration Files** | JS library integration | Type definitions for untyped code |
| **Strict Mode** | Maximum type safety | Catch more errors at compile time |

---

## 1. Type System Fundamentals

### 1.1 Basic Types

```typescript
// Primitives
let isDone: boolean = false;
let count: number = 42;
let name: string = "Alice";
let nothing: null = null;
let notDefined: undefined = undefined;

// Arrays
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ["a", "b", "c"];

// Tuples (fixed-length arrays with known types)
let pair: [string, number] = ["age", 30];

// Enums
enum Color {
  Red,
  Green,
  Blue,
}
let c: Color = Color.Green;

// Any (escape hatch - avoid when possible)
let anything: any = 42;
anything = "now a string";

// Unknown (type-safe any)
let userInput: unknown = getUserInput();
if (typeof userInput === "string") {
  console.log(userInput.toUpperCase()); // Type narrowing required
}

// Void (no return value)
function logMessage(msg: string): void {
  console.log(msg);
}

// Never (functions that never return)
function throwError(message: string): never {
  throw new Error(message);
}
```

### 1.2 Object Types

```typescript
// Object literal type
let user: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// Optional properties
type Config = {
  host: string;
  port?: number; // Optional
  readonly apiKey: string; // Read-only
};

// Index signatures (dynamic keys)
type Dictionary = {
  [key: string]: number;
};

let counts: Dictionary = {
  apples: 5,
  oranges: 10,
};
```

---

## 2. Interfaces vs Type Aliases

### 2.1 Interfaces

```typescript
// Interface declaration
interface User {
  id: number;
  name: string;
  email?: string;
}

// Interface extension
interface Admin extends User {
  permissions: string[];
}

// Declaration merging (interfaces can be reopened)
interface User {
  lastLogin?: Date;
}

// Function types
interface SearchFunc {
  (source: string, subString: string): boolean;
}

const mySearch: SearchFunc = (src, sub) => {
  return src.includes(sub);
};
```

### 2.2 Type Aliases

```typescript
// Type alias
type Point = {
  x: number;
  y: number;
};

// Union types
type Status = "pending" | "success" | "error";

// Intersection types
type Employee = User & {
  employeeId: string;
};

// Function types
type MathOperation = (a: number, b: number) => number;

// Conditional types
type NonNullable<T> = T extends null | undefined ? never : T;
```

**When to use which:**

- **Interfaces:** For public API definitions, object shapes, classes
- **Type Aliases:** For unions, intersections, mapped types, complex transformations

---

## 3. Generics

### 3.1 Generic Functions

```typescript
// Generic identity function
function identity<T>(arg: T): T {
  return arg;
}

let output1 = identity<string>("hello"); // Explicit type
let output2 = identity(42); // Type inference

// Generic with constraints
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): void {
  console.log(arg.length);
}

logLength("hello"); // OK
logLength([1, 2, 3]); // OK
// logLength(42); // Error: number doesn't have length
```

### 3.2 Generic Classes

```typescript
class GenericQueue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }
}

const numberQueue = new GenericQueue<number>();
numberQueue.enqueue(1);
numberQueue.enqueue(2);
```

### 3.3 Generic Interfaces

```typescript
interface Repository<T> {
  getById(id: string): Promise<T>;
  getAll(): Promise<T[]>;
  create(item: T): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Implementation
class UserRepository implements Repository<User> {
  async getById(id: string): Promise<User> {
    // Implementation
    return {} as User;
  }
  // ... other methods
}
```

---

## 4. Advanced Types

### 4.1 Union and Intersection Types

```typescript
// Union types (OR)
type Result = Success | Error;
type ID = string | number;

function processId(id: ID): void {
  if (typeof id === "string") {
    console.log(id.toUpperCase());
  } else {
    console.log(id.toFixed(2));
  }
}

// Intersection types (AND)
type Person = {
  name: string;
};

type Contact = {
  email: string;
};

type PersonWithContact = Person & Contact;

const user: PersonWithContact = {
  name: "Alice",
  email: "alice@example.com",
};
```

### 4.2 Literal Types

```typescript
// String literals
type Direction = "north" | "south" | "east" | "west";

function move(direction: Direction): void {
  console.log(`Moving ${direction}`);
}

move("north"); // OK
// move("up"); // Error

// Numeric literals
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

// Boolean literals
type True = true;
```

### 4.3 Mapped Types

```typescript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Example usage
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}

type TodoPreview = Pick<Todo, "title" | "completed">;
// { title: string; completed: boolean }
```

### 4.4 Conditional Types

```typescript
// Basic conditional type
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// Infer keyword
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser(): User {
  return {} as User;
}

type UserType = ReturnType<typeof getUser>; // User
```

---

## 5. Utility Types

### 5.1 Built-in Utility Types

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial<T> - Make all properties optional
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number }

// Required<T> - Make all properties required
type RequiredUser = Required<PartialUser>;

// Readonly<T> - Make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick<T, K> - Select specific properties
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }

// Omit<T, K> - Exclude specific properties
type UserWithoutId = Omit<User, "id">;
// { name: string; email: string; age: number }

// Record<K, T> - Create object type with specific keys
type UserRoles = Record<string, User>;
// { [key: string]: User }

// Exclude<T, U> - Exclude from union
type Status = "pending" | "approved" | "rejected";
type ActiveStatus = Exclude<Status, "rejected">;
// "pending" | "approved"

// Extract<T, U> - Extract from union
type StringOrNumber = string | number | boolean;
type OnlyString = Extract<StringOrNumber, string>;
// string

// NonNullable<T> - Exclude null and undefined
type MaybeString = string | null | undefined;
type DefinitelyString = NonNullable<MaybeString>;
// string

// ReturnType<T> - Get function return type
function createUser(): User {
  return {} as User;
}
type UserReturnType = ReturnType<typeof createUser>;
// User

// Parameters<T> - Get function parameter types
function updateUser(id: number, name: string): void {}
type UpdateUserParams = Parameters<typeof updateUser>;
// [number, string]
```

---

## 6. Type Guards and Narrowing

### 6.1 Type Guards

```typescript
// typeof type guards
function processValue(value: string | number): void {
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // value is string
  } else {
    console.log(value.toFixed(2)); // value is number
  }
}

// instanceof type guards
class Dog {
  bark(): void {}
}
class Cat {
  meow(): void {}
}

function makeSound(animal: Dog | Cat): void {
  if (animal instanceof Dog) {
    animal.bark();
  } else {
    animal.meow();
  }
}

// Custom type guards
interface Bird {
  fly(): void;
}
interface Fish {
  swim(): void;
}

function isBird(pet: Bird | Fish): pet is Bird {
  return (pet as Bird).fly !== undefined;
}

function move(pet: Bird | Fish): void {
  if (isBird(pet)) {
    pet.fly();
  } else {
    pet.swim();
  }
}

// Discriminated unions
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

### 6.2 Control Flow Analysis (Type Narrowing)

TypeScript uses control flow to narrow types based on your code logic:

```typescript
// Truthiness narrowing
function processInput(input: string | null | undefined): void {
  if (input) {
    // input is string (null/undefined filtered out)
    console.log(input.toUpperCase());
  }
}

// Equality narrowing
function compare(x: string | number, y: string | boolean): void {
  if (x === y) {
    // x and y are both string (only common type)
    console.log(x.toUpperCase());
    console.log(y.toLowerCase());
  }
}

// in operator narrowing
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird): void {
  if ("swim" in animal) {
    animal.swim(); // animal is Fish
  } else {
    animal.fly(); // animal is Bird
  }
}

// Array.isArray narrowing
function processValue(value: string | string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => console.log(item)); // value is string[]
  } else {
    console.log(value.toUpperCase()); // value is string
  }
}

// Null/undefined checks
function getLength(str: string | null): number {
  // After this check, str is narrowed to string
  if (str !== null) {
    return str.length;
  }
  return 0;
}

// Multiple conditions
function process(value: string | number | null): void {
  if (value !== null && typeof value === "string") {
    // value is string
    console.log(value.toUpperCase());
  } else if (value !== null) {
    // value is number
    console.log(value.toFixed(2));
  }
}
```

### 6.3 Assertion Functions

```typescript
// Assertion function
function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg || "Assertion failed");
  }
}

function processUser(user: User | null): void {
  assert(user !== null, "User must not be null");
  // user is now narrowed to User (non-null)
  console.log(user.name);
}

// Type assertion
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Not a string");
  }
}

function processValue(value: unknown): void {
  assertIsString(value);
  // value is now string
  console.log(value.toUpperCase());
}
```

---

## 7. Integration with JavaScript Projects

### 7.1 Declaration Files (.d.ts)

```typescript
// myLibrary.d.ts
declare module "my-library" {
  export function doSomething(value: string): number;
  export class MyClass {
    constructor(name: string);
    getName(): string;
  }
}

// Usage in TypeScript
import { doSomething, MyClass } from "my-library";

const result = doSomething("hello");
const instance = new MyClass("example");
```

### 7.2 @types Packages

```bash
# Install type definitions for popular libraries
npm install --save-dev @types/node
npm install --save-dev @types/express
npm install --save-dev @types/react
```

### 7.3 JSDoc for Gradual Migration

```javascript
// JavaScript file with JSDoc annotations
/**
 * @param {string} name - The user's name
 * @param {number} age - The user's age
 * @returns {User} The created user object
 */
function createUser(name, age) {
  return { name, age };
}

// TypeScript can understand these annotations
// Set "checkJs": true in tsconfig.json
```

### 7.4 Migration Strategy

```typescript
// Step 1: Add tsconfig.json with allowJs and checkJs
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,  // Start false, enable per-file
    "outDir": "./dist",
    "strict": false     // Enable gradually
  }
}

// Step 2: Rename files incrementally (.js → .ts)
// Step 3: Fix type errors file by file
// Step 4: Enable strict mode options gradually
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

---

## 8. Strict Mode Configuration

### 8.1 Recommended tsconfig.json

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",

    // Emit
    "outDir": "./dist",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Interop Constraints
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Type Checking (Strict Mode)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Completeness
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 8.2 Strict Mode Tips

**Adopting strict mode in existing projects:**

```typescript
// BEFORE strict mode - implicit any everywhere
function getUser(id) {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// AFTER strict mode - explicit types required
function getUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

**strictNullChecks - Handle null/undefined explicitly:**

```typescript
// BAD: Assumes user always exists
function greetUser(user: User): string {
  return `Hello, ${user.name}!`;
}

// GOOD: Handle nullable case
function greetUser(user: User | null): string {
  if (!user) {
    return "Hello, guest!";
  }
  return `Hello, ${user.name}!`;
}

// GOOD: Use optional chaining
function getUserEmail(user: User | null): string | undefined {
  return user?.email;
}

// GOOD: Use nullish coalescing
function getDisplayName(user: User | null): string {
  return user?.name ?? "Anonymous";
}
```

**strictPropertyInitialization - Initialize class properties:**

```typescript
// BAD: Property not initialized
class UserService {
  private api: ApiClient; // Error with strict mode
}

// GOOD: Initialize in constructor
class UserService {
  private api: ApiClient;
  
  constructor(api: ApiClient) {
    this.api = api;
  }
}

// GOOD: Use definite assignment assertion (if initialized elsewhere)
class UserService {
  private api!: ApiClient; // ! tells TS it will be assigned
  
  initialize(api: ApiClient): void {
    this.api = api;
  }
}

// GOOD: Use optional property
class UserService {
  private api?: ApiClient;
  
  setApi(api: ApiClient): void {
    this.api = api;
  }
}
```

**noImplicitAny - Annotate function parameters:**

```typescript
// BAD: Implicit any on parameters
function processItems(items, callback) {
  return items.map(callback);
}

// GOOD: Explicit types
function processItems<T, U>(
  items: T[],
  callback: (item: T) => U
): U[] {
  return items.map(callback);
}
```

**noUncheckedIndexedAccess - Handle potentially undefined array/object access:**

```typescript
// With noUncheckedIndexedAccess enabled:
const users: User[] = getUsers();
const first = users[0]; // Type is User | undefined

// Handle the undefined case
if (first) {
  console.log(first.name);
}

// Or use optional chaining
console.log(users[0]?.name);

// Object indexing
const config: Record<string, string> = getConfig();
const apiUrl = config["apiUrl"]; // Type is string | undefined

// Handle undefined
const url = config["apiUrl"] ?? "http://localhost:3000";
```

**Gradual strict mode adoption strategy:**

1. Start with `"strict": false`, enable individual flags:

```json
{
  "compilerOptions": {
    "noImplicitAny": true,           // Week 1
    "strictNullChecks": true,        // Week 2-3
    "strictFunctionTypes": true,     // Week 4
    "strictBindCallApply": true,     // Week 5
    "strictPropertyInitialization": true, // Week 6
    "strict": true                   // Week 7 (enables all)
  }
}
```

2. Fix errors module-by-module
3. Use `// @ts-expect-error` for planned future fixes
4. Avoid `// @ts-ignore` (hides all errors, not just one)

---

## 9. Common Patterns

### 9.1 Factory Pattern with Generics

```typescript
interface Product {
  id: string;
  name: string;
}

class ProductFactory<T extends Product> {
  private idCounter = 0;

  create(name: string, additionalProps?: Partial<T>): T {
    return {
      id: String(this.idCounter++),
      name,
      ...additionalProps,
    } as T;
  }
}

interface Book extends Product {
  author: string;
  isbn: string;
}

const bookFactory = new ProductFactory<Book>();
const book = bookFactory.create("TypeScript Handbook", {
  author: "Microsoft",
  isbn: "123-456",
});
```

### 9.2 Builder Pattern with Fluent API

```typescript
class QueryBuilder<T> {
  private query: Partial<Record<keyof T, any>> = {};

  where(key: keyof T, value: any): this {
    this.query[key] = value;
    return this;
  }

  select(...fields: (keyof T)[]): this {
    // Implementation
    return this;
  }

  build(): Partial<Record<keyof T, any>> {
    return this.query;
  }
}

interface User {
  id: number;
  name: string;
  email: string;
}

const query = new QueryBuilder<User>()
  .where("name", "Alice")
  .where("email", "alice@example.com")
  .build();
```

### 9.3 Dependency Injection

```typescript
// Service interfaces
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any>;
}

// Service implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

class PostgresDatabase implements Database {
  async query(sql: string): Promise<any> {
    // Implementation
    return [];
  }
}

// Consumer with constructor injection
class UserService {
  constructor(
    private logger: Logger,
    private db: Database
  ) {}

  async getUsers(): Promise<User[]> {
    this.logger.log("Fetching users");
    return this.db.query("SELECT * FROM users");
  }
}

// Composition
const logger = new ConsoleLogger();
const db = new PostgresDatabase();
const userService = new UserService(logger, db);
```

---

## 10. Common Pitfalls and Solutions

### 10.1 Type Assertions (use sparingly)

```typescript
// BAD: Unsafe type assertion
const user = getUserData() as User;

// GOOD: Type guard with validation
function isUser(obj: any): obj is User {
  return (
    typeof obj === "object" &&
    typeof obj.id === "number" &&
    typeof obj.name === "string"
  );
}

const userData = getUserData();
if (isUser(userData)) {
  // userData is User
  console.log(userData.name);
}
```

### 10.2 Any Type (avoid when possible)

```typescript
// BAD: Loses type safety
function process(data: any): any {
  return data.toString();
}

// GOOD: Use generics or unknown
function process<T>(data: T): string {
  return String(data);
}

// GOOD: Use unknown for truly unknown types
function process(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  return String(data);
}
```

### 10.3 Null/Undefined Handling

```typescript
// BAD: Not handling null/undefined
function getName(user: User): string {
  return user.name; // Could be undefined
}

// GOOD: Optional chaining and nullish coalescing
function getName(user: User | null): string {
  return user?.name ?? "Unknown";
}

// GOOD: Type guard
function getName(user: User | null): string {
  if (!user) {
    return "Unknown";
  }
  return user.name;
}
```

---

## 11. Testing with TypeScript

### 11.1 Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
};

// Example test
import { add } from "./math";

describe("add", () => {
  it("should add two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("should handle negative numbers", () => {
    expect(add(-1, 1)).toBe(0);
  });
});
```

### 11.2 Mocking with Types

```typescript
// Service to test
class UserService {
  constructor(private api: ApiClient) {}

  async getUser(id: string): Promise<User> {
    return this.api.get(`/users/${id}`);
  }
}

// Test with mock
import { jest } from "@jest/globals";

describe("UserService", () => {
  it("should fetch user", async () => {
    const mockApi: jest.Mocked<ApiClient> = {
      get: jest.fn().mockResolvedValue({ id: "1", name: "Alice" }),
    } as any;

    const service = new UserService(mockApi);
    const user = await service.getUser("1");

    expect(user.name).toBe("Alice");
    expect(mockApi.get).toHaveBeenCalledWith("/users/1");
  });
});
```

---

## 12. Performance Considerations

### 12.1 Type Checking Performance

```typescript
// BAD: Complex mapped type with large unions
type LargeUnion = "a" | "b" | "c" /* ... 1000 more */;
type ComplexMapped<T> = {
  [K in keyof T]: T[K] extends LargeUnion ? string : number;
};

// GOOD: Simplify types, use type aliases
type Status = "active" | "inactive";
type SimpleType<T> = T extends Status ? string : number;
```

### 12.2 Incremental Compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

---

## See Also

- **[JavaScript README](../javascript/README.md)** - Modern JavaScript patterns
- **[Python Patterns](../python/python-patterns.md)** - Type hints in Python
- **[Code Quality](../../code-quality/)** - Testing and code hygiene
- **[Frontend Patterns](../../frontend/)** - React/Vue with TypeScript
- **Official TypeScript Handbook:** <https://www.typescriptlang.org/docs/handbook/>
- **TypeScript Deep Dive:** <https://basarat.gitbook.io/typescript/>
