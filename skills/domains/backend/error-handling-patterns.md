# Error Handling Patterns

<!-- covers: Error, Exception, try-catch, panic-recover -->

## Why This Exists

Robust error handling is critical for production applications, yet it's often implemented inconsistently or as an afterthought. Poor error handling leads to cryptic error messages, difficult debugging, security vulnerabilities (leaking stack traces), and poor user experiences. This knowledge base documents proven error handling patterns across frontend (React error boundaries), backend (try/catch strategies), logging/monitoring integration, and error recovery techniques.

**Problem solved:** Without standardized error handling patterns, applications crash ungracefully, users see technical stack traces, debugging production issues becomes impossible, and errors cascade through the system instead of being contained.

## When to Use It

Reference this KB file when:

- Implementing error boundaries in React applications
- Designing API error responses and status codes
- Setting up error logging and monitoring (Sentry, Datadog, etc.)
- Handling async errors in promises and async/await
- Creating custom error classes for different error types
- Deciding what error information to expose to users vs developers
- Implementing retry logic and circuit breakers
- Handling form validation errors

**Specific triggers:**

- User story mentions "error handling", "validation", or "monitoring"
- Need to prevent errors from crashing the entire application
- Debugging production issues without sufficient error context
- API returns inconsistent error formats
- Need to distinguish between user errors vs system errors

## Quick Reference

### Error Types and Handling

| Error Type | HTTP Status | User Message | Log Level |
| --- | --- | --- | --- |
| **Validation** | 400 | Show field errors | `warn` |
| **Authentication** | 401 | "Please log in" | `info` |
| **Authorization** | 403 | "Access denied" | `warn` |
| **Not Found** | 404 | "Resource not found" | `info` |
| **Rate Limited** | 429 | "Too many requests" | `warn` |
| **Server Error** | 500 | "Something went wrong" | `error` |
| **Service Unavailable** | 503 | "Try again later" | `error` |

### Error Response Format

| Field | Required | Description |
| --- | --- | --- |
| `error` | Yes | Error type/code |
| `message` | Yes | Human-readable message |
| `details` | No | Field-level errors for validation |
| `requestId` | No | For debugging/support |
| `timestamp` | No | When error occurred |

### Common Mistakes

| ❌ Don't | ✅ Do |
| --- | --- |
| Expose stack traces to users | Log internally, show generic message |
| Catch all exceptions silently | Catch specific errors, re-throw unknown |
| Return 200 with error in body | Use proper HTTP status codes |
| Log sensitive data | Redact PII, tokens, passwords |
| Ignore async errors | Always handle Promise rejections |
| Let errors cascade | Use error boundaries (React) |
| Generic "Error occurred" | Specific, actionable messages |
| Retry without backoff | Exponential backoff with jitter |

### Error Handling by Context

| Context | Pattern |
| --- | --- |
| React Components | Error Boundaries with fallback UI |
| API Routes | try/catch + consistent error response |
| Async/Await | try/catch or `.catch()` |
| Event Handlers | Wrap in try/catch, don't throw |
| Background Jobs | Log + retry with backoff |
| Third-party APIs | Circuit breaker pattern |

## Details

### React Error Boundaries

Error boundaries catch JavaScript errors in React component trees, log errors, and display fallback UI instead of crashing the entire app.

**Implementation pattern:**

```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error boundary caught:', error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } }
      });
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```text

**Usage:**

```typescript
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary fallback={<ErrorFallback />}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Granular error boundaries for sections
function Dashboard() {
  return (
    <div>
      <ErrorBoundary fallback={<p>Sidebar failed to load</p>}>
        <Sidebar />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<p>Content failed to load</p>}>
        <MainContent />
      </ErrorBoundary>
    </div>
  );
}
```text

**When to use:**

- Wrap entire app to catch unhandled errors
- Wrap individual features/sections for isolation
- Protect third-party components that might throw

**Limitations:**

- Only catches errors in child components during render, lifecycle methods, and constructors
- Does NOT catch errors in event handlers, async code, or server-side rendering

### Custom Error Classes

Create typed error classes to distinguish between different error types and provide context.

**Implementation pattern:**

```typescript
// lib/errors.ts

// Base application error
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// User-facing errors (show to user)
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      'NOT_FOUND',
      404,
      true,
      { resource, id }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403, true);
  }
}

// System errors (log but don't expose details to user)
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, false, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service ${service} failed`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      false,
      { service, originalError: originalError?.message }
    );
  }
}
```text

**Usage:**

```typescript
// In a Next.js API route
import { NotFoundError, ValidationError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      throw new ValidationError('userId parameter is required');
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return Response.json(user);
    
  } catch (error) {
    return handleApiError(error);
  }
}
```text

### API Error Response Format

Standardize error responses across all API endpoints for consistent client-side handling.

**Implementation pattern:**

```typescript
// lib/api-errors.ts

interface ApiErrorResponse {
  error: {
    message: string;        // User-friendly message
    code: string;           // Machine-readable error code
    statusCode: number;     // HTTP status code
    timestamp: string;      // ISO timestamp
    requestId?: string;     // For tracing
    details?: any;          // Additional context (validation errors, etc.)
  };
}

export function handleApiError(error: unknown): Response {
  // Log all errors for debugging
  console.error('API Error:', error);

  // Send to monitoring service
  if (error instanceof Error) {
    captureException(error);
  }

  // Handle known application errors
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        message: error.isOperational 
          ? error.message 
          : 'An internal error occurred',
        code: error.code,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        ...(error.isOperational && error.context && { details: error.context })
      }
    };

    return Response.json(response, { status: error.statusCode });
  }

  // Handle unknown errors (don't leak details)
  const response: ApiErrorResponse = {
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  };

  return Response.json(response, { status: 500 });
}

// Validation error helper
export function validationError(errors: Record<string, string[]>): Response {
  const response: ApiErrorResponse = {
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      details: { fields: errors }
    }
  };

  return Response.json(response, { status: 400 });
}
```text

**Client-side handling:**

```typescript
// lib/api-client.ts

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      
      // Throw typed error based on code
      switch (errorData.error.code) {
        case 'VALIDATION_ERROR':
          throw new ValidationError(errorData.error.message, errorData.error.details);
        case 'NOT_FOUND':
          throw new NotFoundError('Resource');
        case 'UNAUTHORIZED':
          throw new UnauthorizedError(errorData.error.message);
        default:
          throw new AppError(
            errorData.error.message,
            errorData.error.code,
            errorData.error.statusCode
          );
      }
    }

    return response.json();
    
  } catch (error) {
    // Network errors, parse errors, etc.
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      'Network request failed',
      'NETWORK_ERROR',
      0,
      true,
      { originalError: (error as Error).message }
    );
  }
}
```text

### Async Error Handling

Handle errors in promises, async/await, and event handlers properly.

#### Pattern 1: Async/await with try/catch

```typescript
// ✅ GOOD: Explicit error handling
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    // Log error with context
    console.error('Failed to fetch user:', { userId, error });
    
    // Re-throw or handle
    if (error instanceof TypeError) {
      // Network error
      throw new ExternalServiceError('User API', error);
    }
    throw error;
  }
}
```text

#### Pattern 2: Promise chains with .catch()

```typescript
// ✅ GOOD: Catch at the end of chain
fetch('/api/data')
  .then(response => {
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  })
  .then(data => processData(data))
  .then(result => updateUI(result))
  .catch(error => {
    console.error('Pipeline failed:', error);
    showErrorToUser(error.message);
  });
```text

#### Pattern 3: Event handler errors (not caught by error boundaries)

```typescript
// ❌ BAD: Unhandled errors in event handlers
function BadButton() {
  const handleClick = () => {
    // This error won't be caught by error boundary!
    throw new Error('Oops');
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ✅ GOOD: Wrap in try/catch
function GoodButton() {
  const handleClick = () => {
    try {
      riskyOperation();
    } catch (error) {
      console.error('Button click error:', error);
      toast.error('Operation failed');
      captureException(error);
    }
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ✅ BETTER: Use error handler HOF
function createSafeHandler<T extends (...args: any[]) => any>(
  handler: T,
  onError?: (error: Error) => void
): T {
  return ((...args) => {
    try {
      const result = handler(...args);
      // Handle promise rejections
      if (result instanceof Promise) {
        return result.catch(error => {
          console.error('Async handler error:', error);
          onError?.(error);
          captureException(error);
        });
      }
      return result;
    } catch (error) {
      console.error('Handler error:', error);
      onError?.(error as Error);
      captureException(error);
    }
  }) as T;
}

// Usage
function SmartButton() {
  const handleClick = createSafeHandler(
    async () => {
      await riskyAsyncOperation();
    },
    (error) => toast.error('Operation failed')
  );
  
  return <button onClick={handleClick}>Click</button>;
}
```text

### Error Logging and Monitoring

Integrate with error tracking services for production monitoring.

**Sentry integration:**

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function initMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      
      beforeSend(event, hint) {
        // Filter out non-operational errors in development
        const error = hint.originalException;
        if (error instanceof AppError && !error.isOperational) {
          return null; // Don't send to Sentry
        }
        return event;
      }
    });
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  console.error('Exception:', error, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: { custom: context },
      tags: {
        errorCode: error instanceof AppError ? error.code : 'UNKNOWN'
      }
    });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error') {
  console.log(`[${level}]`, message);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level);
  }
}
```text

**Structured logging:**

```typescript
// lib/logger.ts

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  private log(level: string, message: string, data?: any) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      ...data
    };

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to Datadog, CloudWatch, etc.
      sendToLoggingService(logEntry);
    } else {
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: any) {
    this.log('error', message, {
      ...data,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      }
    });
  }
}

export const logger = new Logger();

// Usage in API routes
export async function POST(request: Request) {
  const requestId = generateRequestId();
  logger.setContext({ requestId });

  try {
    logger.info('Processing request', { endpoint: '/api/users' });
    
    const user = await createUser(await request.json());
    
    logger.info('User created', { userId: user.id });
    return Response.json(user);
    
  } catch (error) {
    logger.error('Failed to create user', error as Error, {
      body: await request.text()
    });
    return handleApiError(error);
  }
}
```text

### Retry Logic and Circuit Breakers

Implement retry logic for transient failures and circuit breakers to prevent cascading failures.

**Retry with exponential backoff:**

```typescript
// lib/retry.ts

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: lastError.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const data = await withRetry(
  () => fetch('/api/data').then(r => r.json()),
  {
    maxAttempts: 3,
    shouldRetry: (error) => {
      // Only retry on network errors or 5xx status codes
      return error instanceof TypeError || 
             (error instanceof AppError && error.statusCode >= 500);
    }
  }
);
```text

**Circuit breaker pattern:**

```typescript
// lib/circuit-breaker.ts

enum CircuitState {
  CLOSED,  // Normal operation
  OPEN,    // Failing, reject immediately
  HALF_OPEN // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();

  constructor(
    private readonly threshold: number = 5,      // Failures before opening
    private readonly timeout: number = 60000,     // Time before half-open
    private readonly successThreshold: number = 2 // Successes before closing
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try half-open
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info('Circuit breaker closed');
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('Circuit breaker opened', undefined, {
        failureCount: this.failureCount
      });
    }
  }
}

// Usage
const paymentServiceBreaker = new CircuitBreaker(5, 60000, 2);

export async function processPayment(paymentData: any) {
  return paymentServiceBreaker.execute(async () => {
    const response = await fetch('/api/payment-service', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new ExternalServiceError('Payment Service');
    }

    return response.json();
  });
}
```text

### Form Validation Errors

Handle and display validation errors in forms with user-friendly messages.

**React Hook Form with Zod:**

```typescript
// components/UserForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  age: z.number().min(18, 'Must be at least 18 years old')
});

type UserFormData = z.infer<typeof userSchema>;

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema)
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      toast.success('User created successfully');
      
    } catch (error) {
      if (error instanceof ValidationError && error.context?.fields) {
        // Set server-side validation errors
        Object.entries(error.context.fields).forEach(([field, messages]) => {
          setError(field as keyof UserFormData, {
            message: (messages as string[]).join(', ')
          });
        });
      } else {
        toast.error(error instanceof AppError ? error.message : 'Failed to create user');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Email</label>
        <input {...register('email')} />
        {errors.email && (
          <span className="error">{errors.email.message}</span>
        )}
      </div>

      <div>
        <label>Password</label>
        <input type="password" {...register('password')} />
        {errors.password && (
          <span className="error">{errors.password.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```text

### Global Error Handler (Node.js)

Catch unhandled errors in Node.js/Next.js applications.

```typescript
// lib/global-error-handler.ts

export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    captureException(
      reason instanceof Error ? reason : new Error(String(reason)),
      { type: 'unhandledRejection' }
    );
    
    // In production, you might want to exit
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    
    captureException(error, { type: 'uncaughtException' });
    
    // Exit on uncaught exception (app is in undefined state)
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Close database connections, etc.
    process.exit(0);
  });
}
```text

### Common Mistakes to Avoid

1. **Swallowing errors silently:**

   ```typescript
   // ❌ BAD
   try {
     await riskyOperation();
   } catch (error) {
     // Silent failure - no one knows this failed!
   }

   // ✅ GOOD
   try {
     await riskyOperation();
   } catch (error) {
     logger.error('Risky operation failed', error as Error);
     captureException(error as Error);
     throw error; // Re-throw or handle appropriately
   }
   ```

2. **Exposing sensitive error details to users:**

   ```typescript
   // ❌ BAD: Leaks database details
   catch (error) {
     return Response.json({ error: error.message }, { status: 500 });
   }

   // ✅ GOOD: Generic message for users, detailed logging
   catch (error) {
     logger.error('Database error', error);
     return Response.json({ 
       error: 'An error occurred processing your request' 
     }, { status: 500 });
   }
   ```

3. **Not validating error types before accessing properties:**

   ```typescript
   // ❌ BAD: Assumes error shape
   catch (error) {
     console.log(error.code); // Might not exist!
   }

   // ✅ GOOD: Type guards
   catch (error) {
     if (error instanceof AppError) {
       console.log(error.code);
     } else if (error instanceof Error) {
       console.log(error.message);
     } else {
       console.log('Unknown error:', error);
     }
   }
   ```

4. **Not handling async errors in event handlers:**

   ```typescript
   // ❌ BAD: Unhandled promise rejection
   <button onClick={async () => await fetchData()}>Click</button>

   // ✅ GOOD: Explicit error handling
   <button onClick={async () => {
     try {
       await fetchData();
     } catch (error) {
       handleError(error);
     }
   }}>Click</button>
   ```

5. **Retrying on non-transient errors:**

   ```typescript
   // ❌ BAD: Retries validation errors
   await withRetry(() => createUser(invalidData));

   // ✅ GOOD: Only retry transient failures
   await withRetry(
     () => createUser(data),
     { shouldRetry: (error) => error instanceof ExternalServiceError }
   );
   ```

## See Also

- **api-design-patterns.md** - API error response formats and status codes
- **testing-patterns.md** - Testing error handling and edge cases
- **auth-patterns.md** - Authentication/authorization error handling
- **caching-patterns.md** - Cache error recovery strategies
