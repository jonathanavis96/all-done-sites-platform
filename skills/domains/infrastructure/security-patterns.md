# Security Patterns

## Why This Exists

Security vulnerabilities are among the most critical risks in modern web applications, leading to data breaches, financial losses, and damaged reputation. Yet security is often implemented inconsistently, with developers learning through trial-and-error or after incidents occur. This knowledge base documents proven security patterns covering CORS configuration, XSS/CSRF prevention, input validation/sanitization, authentication vs authorization, API security (rate limiting, key management), and OWASP Top 10 vulnerabilities relevant to web applications.

**Problem solved:** Without standardized security patterns, applications are vulnerable to common attacks like SQL injection, XSS, CSRF, authentication bypass, and data exposure. Teams waste time researching security best practices for each project and often miss critical vulnerabilities until they're exploited.

## When to Use It

Reference this KB file when:

- Setting up CORS policies for API communication
- Implementing input validation and sanitization
- Preventing XSS (Cross-Site Scripting) attacks
- Implementing CSRF protection for state-changing operations
- Designing authentication and authorization systems
- Managing API keys, secrets, and sensitive credentials
- Implementing rate limiting to prevent abuse
- Conducting security reviews or threat modeling
- Onboarding developers to security best practices

**Specific triggers:**

- User story mentions "security", "authentication", "authorization", or "permissions"
- API accepts user input that needs validation
- Implementing cross-origin requests (frontend ↔ backend)
- Storing or handling sensitive data (passwords, tokens, PII)
- Need to prevent brute force attacks or API abuse
- Security audit reveals vulnerabilities

## Quick Reference

| Vulnerability | Prevention | Key Pattern |
| ------------ | ---------- | ----------- |
| **XSS** | Escape output, CSP headers | Use React's auto-escaping, DOMPurify for raw HTML |
| **CSRF** | Anti-CSRF tokens, SameSite cookies | `SameSite=Strict`, verify `Origin` header |
| **SQL Injection** | Parameterized queries | Never concatenate user input in SQL |
| **CORS Misconfiguration** | Whitelist origins | No `*` with credentials, env-specific origins |
| **Broken Auth** | Secure token storage | httpOnly cookies, short-lived JWTs |
| **Sensitive Data Exposure** | Encryption, minimal exposure | HTTPS only, hash passwords with bcrypt |
| **Rate Limiting** | Throttle requests | 100 req/min per IP, exponential backoff |
| **SSRF** | URL validation | Whitelist allowed hosts, block internal IPs |
| **Path Traversal** | Sanitize file paths | Reject `..`, validate against allowed paths |
| **Secret Management** | Env vars, vaults | Never commit secrets, use `.env` + `.gitignore` |

### Common Mistakes

| ❌ Don't | ✅ Do |
| --------- | ------ |
| `Access-Control-Allow-Origin: *` | Whitelist specific origins |
| Store tokens in localStorage | Use httpOnly cookies |
| `dangerouslySetInnerHTML` without sanitization | Use DOMPurify or avoid |
| Concatenate SQL: `"SELECT * WHERE id=" + id` | Parameterized: `WHERE id = ?` |
| Hardcode secrets in code | Use environment variables |
| Trust client-side validation alone | Always validate server-side |
| Long-lived access tokens (days) | Short-lived (15min) + refresh tokens |
| Log sensitive data | Redact PII in logs |

## Details

### CORS (Cross-Origin Resource Sharing)

CORS controls which origins can access your API. Misconfigured CORS is a common security vulnerability.

**Problem:** Browser's same-origin policy blocks cross-origin requests by default. Overly permissive CORS (`Access-Control-Allow-Origin: *`) exposes your API to any website.

**Solution:** Configure CORS precisely based on environment.

**Next.js API Route (App Router):**

```typescript
// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com', 'https://app.yourdomain.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  const data = { message: 'Success', timestamp: Date.now() };
  
  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
```text

**Express.js (Node):**

```javascript
// server.js
const express = require('express');
const cors = require('cors');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com', 'https://app.yourdomain.com']
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```text

**Key principles:**

- ❌ Never use `Access-Control-Allow-Origin: *` with credentials
- ✅ Whitelist specific origins based on environment
- ✅ Use environment variables for origin configuration
- ✅ Handle preflight OPTIONS requests
- ✅ Only allow necessary HTTP methods and headers

---

### XSS (Cross-Site Scripting) Prevention

XSS attacks inject malicious scripts into web pages viewed by other users. There are three types: Stored XSS (persisted in database), Reflected XSS (in URL/form), and DOM-based XSS (client-side JavaScript manipulation).

**Problem:** User-supplied data rendered without sanitization allows attackers to execute arbitrary JavaScript, steal cookies, hijack sessions, or deface websites.

**Solution:** Sanitize all user input, escape output, use Content Security Policy (CSP), and leverage framework protections.

**React (automatic XSS protection):**

```jsx
// ✅ SAFE: React escapes by default
function UserProfile({ user }) {
  return (
    <div>
      <h1>{user.name}</h1> {/* Automatically escaped */}
      <p>{user.bio}</p>
    </div>
  );
}

// ⚠️ DANGEROUS: dangerouslySetInnerHTML bypasses escaping
function UnsafeContent({ htmlContent }) {
  // Only use if content is sanitized server-side!
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

// ✅ SAFE: Sanitize with DOMPurify if you must use innerHTML
import DOMPurify from 'dompurify';

function SafeRichContent({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```text

**Server-side sanitization (Node.js):**

```javascript
// api/comments/route.ts
import { sanitize } from 'isomorphic-dompurify';
import validator from 'validator';

export async function POST(request) {
  const { content, authorName } = await request.json();
  
  // Sanitize HTML content
  const sanitizedContent = sanitize(content, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
  
  // Escape plain text
  const escapedName = validator.escape(authorName);
  
  // Save to database
  await db.comments.create({
    content: sanitizedContent,
    author: escapedName,
  });
  
  return Response.json({ success: true });
}
```text

**Content Security Policy (CSP):**

```typescript
// next.config.js or middleware
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Adjust based on needs
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.yourdomain.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

export const config = {
  matcher: '/:path*',
};

export function middleware(request) {
  const response = NextResponse.next();
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value);
  });
  return response;
}
```text

**Key principles:**

- ✅ React escapes by default - use it!
- ❌ Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- ✅ Sanitize user input server-side before storing
- ✅ Use DOMPurify for rich text content
- ✅ Implement strict Content Security Policy (CSP)
- ✅ Set security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

---

### CSRF (Cross-Site Request Forgery) Protection

CSRF attacks trick authenticated users into executing unwanted actions by exploiting their active session.

**Problem:** Attacker creates malicious link/form that submits authenticated request to your API. If user is logged in, their cookies are automatically sent, making the request appear legitimate.

**Solution:** Use CSRF tokens for state-changing operations, verify origin/referer headers, use SameSite cookies.

**Next.js API Route with CSRF protection:**

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// app/api/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // Get CSRF token from request header
  const csrfToken = request.headers.get('x-csrf-token');
  
  // Get CSRF token from session cookie
  const cookieStore = cookies();
  const sessionCsrfToken = cookieStore.get('csrf-token')?.value;
  
  // Validate CSRF token
  if (!csrfToken || !sessionCsrfToken || !validateCsrfToken(csrfToken, sessionCsrfToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  // Process the request
  const data = await request.json();
  // ... perform action ...
  
  return NextResponse.json({ success: true });
}
```text

**Client-side (fetch with CSRF token):**

```typescript
// lib/api-client.ts
export async function apiPost(endpoint: string, data: any) {
  // Get CSRF token from cookie or meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    credentials: 'include', // Send cookies
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```text

**SameSite cookies (strong CSRF protection):**

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request) {
  // ... authenticate user ...
  
  const response = NextResponse.json({ success: true });
  
  // Set session cookie with SameSite=Lax or Strict
  response.cookies.set('session', sessionToken, {
    httpOnly: true,      // Prevent JavaScript access
    secure: true,        // HTTPS only
    sameSite: 'lax',     // CSRF protection (use 'strict' for maximum security)
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  
  return response;
}
```text

**Key principles:**

- ✅ Use CSRF tokens for state-changing operations (POST, PUT, DELETE)
- ✅ Set `SameSite=Lax` or `SameSite=Strict` on cookies
- ✅ Verify `Origin` and `Referer` headers for additional protection
- ✅ Use `httpOnly` and `secure` flags on session cookies
- ❌ Don't rely on GET requests for state changes (they're not protected by CSRF tokens)

---

### Input Validation and Sanitization

All user input must be validated and sanitized to prevent injection attacks and data corruption.

**Problem:** Unvalidated input leads to SQL injection, NoSQL injection, command injection, path traversal, and data integrity issues.

**Solution:** Validate input format and type, sanitize before use, use parameterized queries, validate on both client and server.

**Schema validation with Zod:**

```typescript
// lib/validation.ts
import { z } from 'zod';

// Define schema
export const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  age: z.number()
    .int('Age must be an integer')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Invalid age'),
  bio: z.string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
});

// API route
export async function POST(request) {
  const body = await request.json();
  
  // Validate input
  const result = userSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }
  
  // Use validated data
  const validatedData = result.data;
  // ... save to database ...
}
```text

**SQL injection prevention (parameterized queries):**

```typescript
// ❌ VULNERABLE: String concatenation
const userId = request.query.id;
const query = `SELECT * FROM users WHERE id = ${userId}`; // SQL INJECTION!
const user = await db.query(query);

// ✅ SAFE: Parameterized query
const userId = request.query.id;
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✅ SAFE: ORM (Prisma)
const userId = parseInt(request.query.id, 10);
const user = await prisma.user.findUnique({
  where: { id: userId },
});
```text

**Path traversal prevention:**

```typescript
// ❌ VULNERABLE: User-controlled file path
const filename = request.query.file;
const content = await fs.readFile(`/uploads/${filename}`); // PATH TRAVERSAL!

// ✅ SAFE: Validate filename
import path from 'path';

const filename = request.query.file;
const sanitizedFilename = path.basename(filename); // Remove directory components
const allowedDir = path.resolve('/uploads');
const filePath = path.join(allowedDir, sanitizedFilename);

// Ensure path is still within allowed directory
if (!filePath.startsWith(allowedDir)) {
  return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
}

const content = await fs.readFile(filePath);
```text

**Key principles:**

- ✅ Validate all user input on the server (client validation is for UX only)
- ✅ Use schema validation libraries (Zod, Yup, Joi)
- ✅ Use parameterized queries or ORMs to prevent SQL injection
- ✅ Sanitize file paths to prevent directory traversal
- ✅ Validate data types, formats, ranges, and patterns
- ❌ Never trust client-side validation alone

---

### Authentication vs Authorization

Authentication verifies identity ("who are you?"), authorization controls access ("what can you do?").

**Problem:** Confusing authentication with authorization leads to privilege escalation vulnerabilities where authenticated users access resources they shouldn't.

**Solution:** Implement both authentication (verify user identity) and authorization (check permissions).

**Authentication middleware:**

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function authenticateRequest(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  
  if (!token) {
    return { authenticated: false, user: null };
  }
  
  try {
    const user = await verifyToken(token);
    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false, user: null };
  }
}
```text

**Authorization middleware (role-based):**

```typescript
// middleware/authorize.ts
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const { authenticated, user } = await authenticateRequest(request);
    
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // User is authenticated AND authorized
    return null; // Continue to handler
  };
}

// Usage in API route
export async function DELETE(request: NextRequest) {
  const authError = await requireRole(['admin'])(request);
  if (authError) return authError;
  
  // User is admin, proceed with deletion
  const { id } = await request.json();
  await db.users.delete({ where: { id } });
  
  return NextResponse.json({ success: true });
}
```text

**Resource-based authorization:**

```typescript
// Check if user owns the resource
export async function PUT(request: NextRequest, { params }) {
  const { authenticated, user } = await authenticateRequest(request);
  
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const postId = params.id;
  const post = await db.posts.findUnique({ where: { id: postId } });
  
  // Authorization check: user must own the post OR be admin
  if (post.authorId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // User is authorized to edit this post
  const updates = await request.json();
  await db.posts.update({ where: { id: postId }, data: updates });
  
  return NextResponse.json({ success: true });
}
```text

**Key principles:**

- ✅ Implement authentication first (verify identity)
- ✅ Then check authorization (verify permissions)
- ✅ Return 401 for unauthenticated, 403 for unauthorized
- ✅ Check authorization on every protected endpoint
- ✅ Use role-based (admin, user) and resource-based (owns this item) authorization
- ❌ Never rely on client-side authorization checks alone

---

### API Key and Secret Management

API keys, database passwords, and other secrets must never be exposed in code or version control.

**Problem:** Hardcoded secrets in code get committed to git, exposing credentials. Secrets in client-side code are visible to anyone.

**Solution:** Use environment variables, secret management services, and separate server/client secrets.

**Environment variables (.env.local):**

```bash
# .env.local (NEVER commit this file)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb  # pragma: allowlist secret
JWT_SECRET=your-super-secret-key-here
API_KEY=sk_live_51H...
NEXT_PUBLIC_STRIPE_KEY=pk_test_51H... # NEXT_PUBLIC_ exposes to client!
```text

**Server-side secret usage:**

```typescript
// app/api/data/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // ✅ Server-side: access any secret
  const dbUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  
  // ... use secrets ...
  
  return NextResponse.json({ data: 'success' });
}
```text

**Client-side (public) secrets:**

```typescript
// app/page.tsx
'use client';

export default function Page() {
  // ✅ Only NEXT_PUBLIC_ vars are available in client
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;
  
  // ❌ This is undefined (server-only secret)
  const jwtSecret = process.env.JWT_SECRET; // undefined!
  
  return <div>Stripe Key: {stripeKey}</div>;
}
```text

**.gitignore (essential):**

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
secrets/
*.pem
*.key
```text

**Secret rotation strategy:**

```typescript
// Support multiple keys for zero-downtime rotation
const CURRENT_JWT_SECRET = process.env.JWT_SECRET;
const PREVIOUS_JWT_SECRET = process.env.JWT_SECRET_PREV;

export function verifyToken(token: string) {
  try {
    // Try current secret first
    return jwt.verify(token, CURRENT_JWT_SECRET);
  } catch (error) {
    // Fall back to previous secret (during rotation)
    return jwt.verify(token, PREVIOUS_JWT_SECRET);
  }
}
```text

**Key principles:**

- ✅ Use environment variables for all secrets
- ✅ Never commit `.env` files to version control
- ✅ Use `NEXT_PUBLIC_` prefix only for client-safe values
- ✅ Rotate secrets periodically
- ✅ Use secret management services (AWS Secrets Manager, HashiCorp Vault) for production
- ❌ Never log secrets (even in error messages)

---

### Rate Limiting

Rate limiting prevents abuse, DDoS attacks, and brute force attempts.

**Problem:** APIs without rate limiting can be overwhelmed by automated attacks, credential stuffing, or resource-intensive requests.

**Solution:** Implement rate limiting per IP, per user, or per API key.

**Simple in-memory rate limiter:**

```typescript
// lib/rate-limit.ts
type RateLimitStore = Map<string, { count: number; resetAt: number }>;

const store: RateLimitStore = new Map();

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = store.get(identifier);
  
  // Clean up expired entries
  if (record && now > record.resetAt) {
    store.delete(identifier);
  }
  
  if (!record || now > record.resetAt) {
    // First request or window expired
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (record.count < maxRequests) {
    // Within limit
    record.count++;
    return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
  }
  
  // Rate limit exceeded
  return { allowed: false, remaining: 0, resetAt: record.resetAt };
}

// app/api/data/route.ts
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const limit = rateLimit(ip, 100, 60000); // 100 requests per minute
  
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(limit.resetAt),
          'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        }
      }
    );
  }
  
  // Add rate limit headers
  const response = NextResponse.json({ data: 'success' });
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', String(limit.remaining));
  response.headers.set('X-RateLimit-Reset', String(limit.resetAt));
  
  return response;
}
```text

**Redis-based rate limiter (production):**

```typescript
// lib/rate-limit-redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function rateLimitRedis(
  identifier: string,
  maxRequests: number = 100,
  windowSec: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  
  // Increment counter
  const count = await redis.incr(key);
  
  if (count === 1) {
    // First request, set expiration
    await redis.pexpire(key, windowMs);
  }
  
  // Get TTL to calculate resetAt
  const ttl = await redis.pttl(key);
  const resetAt = now + ttl;
  
  if (count <= maxRequests) {
    return { allowed: true, remaining: maxRequests - count, resetAt };
  }
  
  return { allowed: false, remaining: 0, resetAt };
}
```text

**Key principles:**

- ✅ Implement rate limiting on authentication endpoints (prevent brute force)
- ✅ Use IP-based limiting for public endpoints
- ✅ Use user ID or API key for authenticated endpoints
- ✅ Return 429 status code with `Retry-After` header
- ✅ Use Redis or similar for distributed rate limiting
- ✅ Set different limits for different endpoint types

---

### OWASP Top 10 Relevant Patterns

Quick reference for common web vulnerabilities from OWASP Top 10 (2021):

#### 1. Broken Access Control

- **Risk:** Users access resources they shouldn't (privilege escalation)
- **Prevention:** Check authorization on every endpoint, validate resource ownership
- **See:** Authentication vs Authorization section above

#### 2. Cryptographic Failures

- **Risk:** Sensitive data exposed due to weak encryption or no encryption
- **Prevention:** Use HTTPS, encrypt data at rest, use bcrypt for passwords, never store plaintext secrets

```typescript
import bcrypt from 'bcrypt';

// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```text

#### 3. Injection (SQL, NoSQL, Command)

- **Risk:** Attacker executes malicious code through unvalidated input
- **Prevention:** Use parameterized queries, ORMs, input validation
- **See:** Input Validation and Sanitization section above

#### 4. Insecure Design

- **Risk:** Architectural flaws, missing security requirements
- **Prevention:** Threat modeling, security requirements in design phase, defense in depth

#### 5. Security Misconfiguration

- **Risk:** Default credentials, verbose error messages, unnecessary features enabled
- **Prevention:** Disable unnecessary features, custom error pages, security headers

```typescript
// ❌ Verbose error (exposes internals)
return NextResponse.json({ error: error.stack }, { status: 500 });

// ✅ Generic error (safe for production)
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
// Log full error server-side for debugging
console.error('API error:', error);
```text

#### 6. Vulnerable and Outdated Components

- **Risk:** Using libraries with known vulnerabilities
- **Prevention:** Regular `npm audit`, keep dependencies updated, use Dependabot

```bash
npm audit
npm audit fix
npm update
```text

#### 7. Identification and Authentication Failures

- **Risk:** Weak passwords, broken session management, credential stuffing
- **Prevention:** Strong password requirements, MFA, rate limiting on login, secure session management
- **See:** Rate Limiting section above

#### 8. Software and Data Integrity Failures

- **Risk:** Unsigned updates, insecure CI/CD, untrusted data deserialization
- **Prevention:** Verify package signatures, secure CI/CD pipelines, avoid eval()

```typescript
// ❌ Never use eval with user input
eval(userInput); // DANGEROUS!

// ❌ Avoid JSON.parse with untrusted input without validation
const data = JSON.parse(untrustedString);

// ✅ Validate after parsing
const parsed = JSON.parse(untrustedString);
const validated = schema.parse(parsed); // Zod validation
```text

#### 9. Security Logging and Monitoring Failures

- **Risk:** Breaches go undetected, no audit trail for incidents
- **Prevention:** Log authentication events, failed access attempts, anomalies; set up alerts

```typescript
// Log security events
logger.warn('Failed login attempt', { 
  email, 
  ip: request.headers.get('x-forwarded-for'),
  timestamp: new Date().toISOString(),
});

// Monitor critical actions
logger.info('User deleted', { 
  deletedUserId, 
  deletedBy: currentUser.id, 
  timestamp: new Date().toISOString(),
});
```text

#### 10. Server-Side Request Forgery (SSRF)

- **Risk:** Attacker tricks server into making requests to internal systems
- **Prevention:** Validate and sanitize URLs, whitelist allowed domains, block internal IPs

```typescript
// ❌ User-controlled URL without validation
const url = request.query.url;
const response = await fetch(url); // SSRF!

// ✅ Validate URL and whitelist domains
const url = request.query.url;
const parsed = new URL(url);

const allowedHosts = ['api.example.com', 'cdn.example.com'];
if (!allowedHosts.includes(parsed.hostname)) {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
}

// ✅ Block internal IPs
const blockedPatterns = [/^10\./, /^192\.168\./, /^127\./, /^localhost$/];
if (blockedPatterns.some(pattern => pattern.test(parsed.hostname))) {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
}

const response = await fetch(url);
```text

---

### Common Mistakes to Avoid

**Security anti-patterns that commonly appear in code reviews:**

1. **❌ Client-side security only**
   - Never trust client-side validation, authorization checks, or secret storage
   - Always validate and authorize on the server

2. **❌ Logging sensitive data**

   ```typescript
   // ❌ Bad: logs password
   console.log('User login:', { email, password });
   
   // ✅ Good: omits sensitive fields
   console.log('User login:', { email });
   ```

3. **❌ Exposing error details to users**
   - Production errors should be generic
   - Log detailed errors server-side only

4. **❌ Using weak cryptography**
   - Don't use MD5 or SHA1 for passwords (use bcrypt, Argon2)
   - Don't implement your own encryption (use established libraries)

5. **❌ Forgetting HTTPS in production**
   - All production traffic must use HTTPS
   - Set `secure: true` on cookies
   - Use HSTS header to enforce HTTPS

6. **❌ Hardcoding credentials**
   - Use environment variables
   - Never commit secrets to git

7. **❌ Not implementing rate limiting**
   - Every public API endpoint needs rate limiting
   - Authentication endpoints are critical (prevent brute force)

8. **❌ Permissive CORS**
   - `Access-Control-Allow-Origin: *` is rarely correct
   - Whitelist specific origins

9. **❌ Missing authentication on API routes**
   - Every API route should explicitly handle authentication
   - Don't assume middleware catches everything

10. **❌ Trusting user input**
    - Validate everything: query params, body, headers, cookies
    - Sanitize before displaying or storing

---

## When NOT to Use It

- **Local development tools** - Security overhead may slow iteration (but still use for production-like testing)
- **Internal APIs behind firewall** - Some protections (CORS, rate limiting) may be relaxed, but never skip authentication/authorization
- **Prototype/POC code** - Document security TODOs for production implementation

**Warning:** Never skip security for "MVP" or "we'll add it later" - it's exponentially harder to retrofit security into an insecure system.

---

## Related Patterns

- **auth-patterns.md** - OAuth2, JWT, session management implementation details
- **api-design-patterns.md** - HTTP status codes, error responses, versioning
- **error-handling-patterns.md** - Secure error logging without exposing internals
- **caching-patterns.md** - Cache security considerations (don't cache sensitive data)
