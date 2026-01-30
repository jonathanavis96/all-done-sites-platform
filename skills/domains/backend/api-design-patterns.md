# API Design Patterns

<!-- covers: 400, 401, 403, 404, 429, 500, 503 -->

## Why This Exists

Well-designed APIs are the backbone of modern software systems, enabling frontend-backend communication, microservice integration, and third-party integrations. However, inconsistent API design leads to poor developer experience, brittle integrations, versioning nightmares, and security vulnerabilities. This knowledge base documents proven API design patterns covering REST conventions, GraphQL schemas, error handling, versioning strategies, pagination, rate limiting, and status code usage. These patterns help teams build predictable, maintainable, and scalable APIs.

**Problem solved:** Without standardized API design patterns, teams create inconsistent endpoints, handle errors differently across services, struggle with API versioning, implement inefficient pagination, and create security gaps in rate limiting and authentication.

## When to Use It

Reference this KB file when:

- Designing REST or GraphQL APIs for new projects
- Standardizing error responses across multiple services
- Implementing API versioning strategies (URL, header, or content negotiation)
- Adding pagination to endpoints that return large datasets
- Implementing rate limiting or throttling mechanisms
- Choosing appropriate HTTP status codes for different scenarios
- Designing API authentication and authorization patterns

**Specific triggers:**

- Creating new backend endpoints or API routes
- API inconsistencies causing integration issues
- Need to version an existing API without breaking clients
- Performance issues from endpoints returning too much data
- API abuse or need to prevent DoS attacks
- Planning microservices communication patterns
- Documenting API contracts for frontend or external consumers

## Details

### REST API Design Principles

REST (Representational State Transfer) is the most common API architecture. Follow these conventions for predictable, intuitive APIs.

#### Resource Naming Conventions

Use nouns (not verbs) and plural forms for collections:

```text
✅ Good REST endpoints:
GET    /users              # List all users
GET    /users/123          # Get specific user
POST   /users              # Create new user
PUT    /users/123          # Update entire user
PATCH  /users/123          # Partial update user
DELETE /users/123          # Delete user

GET    /users/123/posts    # Nested resource: posts for user 123
POST   /users/123/posts    # Create post for user 123

❌ Bad REST endpoints:
GET    /getUsers           # Verb in URL (use HTTP method instead)
GET    /user               # Singular (use plural)
POST   /createUser         # Verb redundant with POST
GET    /users/delete/123   # DELETE action should use DELETE method
```text

**Nested resources guidelines:**

- Max 2 levels deep: `/users/123/posts/456` ✅
- Avoid deeper nesting: `/users/123/posts/456/comments/789/replies` ❌
- For deep nesting, use query parameters: `/comments?postId=456&parentId=789` ✅

#### HTTP Methods & Idempotency

| Method | Purpose | Idempotent | Safe | Use Case |
| ------ | ------- | ---------- | ---- | -------- |
| GET | Retrieve resource(s) | ✅ | ✅ | Fetch data, no side effects |
| POST | Create new resource | ❌ | ❌ | Create user, submit form |
| PUT | Replace entire resource | ✅ | ❌ | Update all fields |
| PATCH | Partial update | ⚠️ | ❌ | Update specific fields |
| DELETE | Remove resource | ✅ | ❌ | Delete user, remove item |
| HEAD | Get headers only | ✅ | ✅ | Check if resource exists |
| OPTIONS | Discover methods | ✅ | ✅ | CORS preflight |

**Idempotency matters:** Calling PUT or DELETE multiple times has the same effect as calling once. POST is not idempotent (creates multiple resources).

#### HTTP Status Codes

Use appropriate status codes to communicate API response semantics:

**Success (2xx):**

```javascript
// 200 OK - Successful GET, PUT, PATCH, DELETE
return Response.json({ user }, { status: 200 });

// 201 Created - Successful POST (resource created)
return Response.json(
  { user, id: newUser.id },
  { 
    status: 201,
    headers: { Location: `/users/${newUser.id}` }
  }
);

// 204 No Content - Successful DELETE or update with no response body
return new Response(null, { status: 204 });
```text

**Client Errors (4xx):**

```javascript
// 400 Bad Request - Invalid input, validation error
return Response.json(
  { 
    error: "Validation failed",
    details: [
      { field: "email", message: "Invalid email format" },
      { field: "age", message: "Must be 18 or older" }
    ]
  },
  { status: 400 }
);

// 401 Unauthorized - Authentication required or failed
return Response.json(
  { error: "Authentication required" },
  { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
);

// 403 Forbidden - Authenticated but not authorized
return Response.json(
  { error: "Insufficient permissions" },
  { status: 403 }
);

// 404 Not Found - Resource doesn't exist
return Response.json(
  { error: "User not found" },
  { status: 404 }
);

// 409 Conflict - Resource conflict (e.g., duplicate email)
return Response.json(
  { error: "Email already exists" },
  { status: 409 }
);

// 422 Unprocessable Entity - Semantic errors
return Response.json(
  { error: "Cannot delete user with active subscriptions" },
  { status: 422 }
);

// 429 Too Many Requests - Rate limit exceeded
return Response.json(
  { error: "Rate limit exceeded", retryAfter: 60 },
  { status: 429, headers: { 'Retry-After': '60' } }
);
```text

**Server Errors (5xx):**

```javascript
// 500 Internal Server Error - Unexpected error
return Response.json(
  { error: "An unexpected error occurred" },
  { status: 500 }
);

// 503 Service Unavailable - Temporary outage
return Response.json(
  { error: "Service temporarily unavailable" },
  { status: 503, headers: { 'Retry-After': '300' } }
);
```text

### Error Response Format

Standardize error responses across your API:

```javascript
// Consistent error structure
interface ApiError {
  error: string;           // Human-readable message
  code?: string;           // Machine-readable error code
  details?: Array<{        // Field-level validation errors
    field: string;
    message: string;
  }>;
  requestId?: string;      // For debugging/support
  timestamp?: string;      // When error occurred
}

// Example implementation
export function errorResponse(
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
) {
  return Response.json(
    {
      error: message,
      code: `ERR_${status}`,
      details,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

// Usage
if (!email.includes('@')) {
  return errorResponse('Validation failed', 400, [
    { field: 'email', message: 'Invalid email format' }
  ]);
}
```text

### API Versioning Strategies

Choose a versioning strategy before your API goes public:

#### 1. URL Versioning (Most Common)

```javascript
// Pros: Clear, easy to route, cacheable
// Cons: URL pollution, harder to deprecate

app.get('/v1/users', handleV1Users);
app.get('/v2/users', handleV2Users);

// Next.js App Router structure:
// app/api/v1/users/route.ts
// app/api/v2/users/route.ts
```text

#### 2. Header Versioning

```javascript
// Pros: Clean URLs, flexible
// Cons: Harder to test, not browser-friendly

export async function GET(request: Request) {
  const version = request.headers.get('API-Version') || 'v1';
  
  if (version === 'v2') {
    return handleV2(request);
  }
  return handleV1(request);
}
```text

#### 3. Content Negotiation (Accept Header)

```javascript
// Pros: RESTful, flexible
// Cons: Complex, harder to debug

export async function GET(request: Request) {
  const accept = request.headers.get('Accept');
  
  if (accept?.includes('application/vnd.myapi.v2+json')) {
    return handleV2(request);
  }
  return handleV1(request);
}
```text

**Recommendation:** Use URL versioning for public APIs (simplicity, discoverability). Use header versioning for internal APIs (clean URLs).

### Pagination Patterns

Never return unbounded result sets. Implement pagination for all collection endpoints:

#### 1. Offset-Based Pagination

```javascript
// Simple but has skip performance issues at high offsets
GET /users?limit=20&offset=40

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  
  const users = await db.user.findMany({
    skip: offset,
    take: limit,
  });
  
  const total = await db.user.count();
  
  return Response.json({
    data: users,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total
    }
  });
}
```text

#### 2. Cursor-Based Pagination (Recommended for Large Datasets)

```javascript
// Better performance, no skip cost
GET /users?limit=20&cursor=eyJpZCI6MTIzfQ

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const cursor = url.searchParams.get('cursor');
  
  const users = await db.user.findMany({
    take: limit + 1, // Fetch one extra to check if more exist
    ...(cursor && {
      cursor: { id: decodeCursor(cursor) },
      skip: 1 // Skip the cursor itself
    }),
    orderBy: { id: 'asc' }
  });
  
  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, -1) : users;
  const nextCursor = hasMore ? encodeCursor(users[limit - 1].id) : null;
  
  return Response.json({
    data,
    pagination: {
      limit,
      nextCursor,
      hasMore
    }
  });
}

function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64');
}

function decodeCursor(cursor: string): number {
  return JSON.parse(Buffer.from(cursor, 'base64').toString()).id;
}
```text

#### 3. Page-Based Pagination (UI-Friendly)

```javascript
// Good for UIs with page numbers
GET /users?page=3&perPage=20

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = parseInt(url.searchParams.get('perPage') || '20');
  
  const skip = (page - 1) * perPage;
  
  const [users, total] = await Promise.all([
    db.user.findMany({ skip, take: perPage }),
    db.user.count()
  ]);
  
  return Response.json({
    data: users,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasMore: page * perPage < total
    }
  });
}
```text

**Pagination comparison:**

| Type | Best For | Pros | Cons |
| ---- | -------- | ---- | ---- |
| Offset | Small datasets, simple UIs | Simple, allows jumping to any page | Slow at high offsets, inconsistent with inserts |
| Cursor | Large datasets, feeds | Fast, consistent results | Can't jump to arbitrary page |
| Page | Admin panels, tables | UI-friendly, predictable | Same issues as offset |

### Rate Limiting

Protect APIs from abuse with rate limiting:

```javascript
// Simple in-memory rate limiter (use Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

// Usage in API route
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, retryAfter } = rateLimit(ip, 100, 60000); // 100 req/min
  
  if (!allowed) {
    return Response.json(
      { error: 'Rate limit exceeded', retryAfter },
      { 
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      }
    );
  }
  
  // Handle request normally
  return Response.json({ data: 'success' });
}
```text

**Rate limit headers:**

```javascript
return Response.json(data, {
  headers: {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '45',
    'X-RateLimit-Reset': String(resetTimestamp)
  }
});
```text

### GraphQL Schema Design

GraphQL is an alternative to REST for flexible data fetching:

```graphql
# Well-designed schema with clear types
type User {
  id: ID!
  email: String!
  name: String
  posts(limit: Int = 10, offset: Int = 0): PostConnection!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  published: Boolean!
}

# Pagination with connections (Relay pattern)
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): UserConnection!
  post(id: ID!): Post
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

input CreateUserInput {
  email: String!
  name: String
  password: String!
}

input UpdateUserInput {
  email: String
  name: String
}
```text

**GraphQL error handling:**

```javascript
// Return errors in standardized format
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "userId": "123"
      }
    }
  ]
}
```text

### API Security Best Practices

1. **Always use HTTPS** in production
2. **Validate all inputs** (never trust client data)
3. **Use authentication tokens** (JWT, OAuth2) - see `auth-patterns.md`
4. **Implement rate limiting** to prevent abuse
5. **Set CORS policies** appropriately:

```javascript
export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
}
```text

1. **Use API keys** for service-to-service communication
2. **Log requests** for auditing and debugging
3. **Sanitize error messages** (don't leak implementation details)

### Common Mistakes to Avoid

❌ **Using verbs in REST URLs** - Use HTTP methods instead  
❌ **Returning 200 for all responses** - Use appropriate status codes  
❌ **No pagination** - Always paginate collections  
❌ **Inconsistent error formats** - Standardize error responses  
❌ **No API versioning** - Plan for changes from the start  
❌ **Exposing internal IDs** - Use UUIDs or obscured IDs for public APIs  
❌ **No rate limiting** - Protect against abuse  
❌ **Ignoring caching headers** - Use `Cache-Control`, `ETag` for performance  
❌ **Breaking changes without versioning** - Always maintain backward compatibility or version properly

### Decision Matrix: REST vs GraphQL

| Criterion | REST | GraphQL |
| --------- | ---- | ------- |
| **Simple CRUD** | ✅ Best choice | Overkill |
| **Complex data fetching** | Multiple requests | ✅ Single request |
| **Mobile apps (bandwidth)** | Over-fetching | ✅ Exact data |
| **Caching** | ✅ HTTP caching | Complex |
| **Learning curve** | Low | Medium-High |
| **Tooling** | Mature | Growing |
| **Public API** | ✅ Industry standard | Niche |
| **Internal API** | Good | ✅ Flexible |

**Recommendation:** Start with REST for simplicity. Use GraphQL when you need flexible data fetching or have mobile clients with bandwidth constraints.

## Related Patterns

- See `auth-patterns.md` for API authentication (JWT, OAuth2)
- See `caching-patterns.md` for HTTP caching headers and API response caching
- See `async-api-routes.md` for preventing waterfall chains in API routes
- See `database-patterns.md` for optimizing API data fetching
- Consider libraries: `express`, `fastify`, `tRPC`, `Apollo GraphQL`, `Prisma`

## See Also

- **[Error Handling Patterns](error-handling-patterns.md)** - API error response formats and status codes
- **[Caching Patterns](caching-patterns.md)** - HTTP caching headers and cache control
- **[Database Patterns](database-patterns.md)** - Optimizing API data fetching and query performance
- **[Auth Patterns](auth-patterns.md)** - API authentication and authorization

## References

- [REST API Design Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [HTTP Status Codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [API Versioning Strategies](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api)
- [RFC 7807 - Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
