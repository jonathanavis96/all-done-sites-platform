# Caching Patterns

<!-- covers: cache-miss, cache-invalidation, stale-cache, TTL -->

## Why This Exists

Caching is one of the most powerful performance optimizations in software development, reducing latency, database load, and API costs. However, incorrect caching strategies lead to stale data, cache stampedes, memory leaks, and difficult-to-debug issues. This knowledge base documents proven caching patterns across different layers (CDN, application, database) and technologies (Redis, in-memory, browser storage), helping teams choose the right caching strategy and avoid common pitfalls.

**Problem solved:** Without standardized caching patterns, teams either over-cache (serving stale data) or under-cache (poor performance), struggle with cache invalidation, and reinvent solutions for cache key design, TTL strategies, and cache warming.

## When to Use It

Reference this KB file when:

- Optimizing application performance (reduce latency or load)
- Reducing database query load or API call costs
- Designing cache key strategies for multi-tenant or user-specific data
- Implementing cache invalidation or cache warming strategies
- Choosing between CDN, Redis, in-memory, or browser caching
- Debugging stale data or cache consistency issues

**Specific triggers:**

- Performance profiling shows repeated identical queries
- API rate limits being hit frequently
- Database experiencing high read load
- Users complaining about slow page loads
- Need to cache expensive computations (e.g., report generation)
- Implementing real-time features with eventual consistency

## Details

### Cache Hierarchy (Layers)

Different caching layers serve different purposes. Use multiple layers for maximum efficiency:

```text
Request → CDN Cache → Application Cache → Database Query Cache → Database
          (edge)       (Redis/memory)       (DB level)
```text

**Decision matrix:**

| Layer | Best For | TTL | Invalidation Complexity |
| ----- | -------- | --- | ---------------------- |
| CDN | Static assets, public pages | Hours-Days | Low (version URLs) |
| Application (Redis) | User sessions, API responses | Minutes-Hours | Medium (explicit invalidation) |
| In-Memory | Hot data, per-request dedup | Seconds-Minutes | Low (TTL-based) |
| Browser (localStorage) | User preferences, UI state | Days-Months | Low (client-controlled) |
| Database Query Cache | Repeated queries | Seconds | Low (automatic) |

### In-Memory Caching (Application Level)

Use for hot data within a single process or request lifecycle.

#### Pattern 1: Per-Request Deduplication (React Server)

Use `React.cache()` to deduplicate identical calls within a single server request:

```javascript
// lib/auth.js
import { cache } from 'react';

// Without cache: called 10 times = 10 DB queries
// With cache: called 10 times = 1 DB query per request
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  
  return await db.user.findUnique({
    where: { id: session.userId }
  });
});

// Multiple components can call this without duplicate queries
// app/dashboard/page.jsx
const user = await getCurrentUser();

// app/header.jsx
const user = await getCurrentUser(); // Uses cached result from above
```text

**When to use:**

- Server Components in Next.js 13+
- Multiple components need the same data in one request
- Authentication checks, user data lookups

**Limitations:** Cache only lives for one request. Next request starts fresh.

#### Pattern 2: LRU Cache (Cross-Request)

Use LRU (Least Recently Used) cache for data shared across multiple requests:

```javascript
// lib/cache.js
import { LRUCache } from 'lru-cache';

// Configure cache size and TTL
const userCache = new LRUCache({
  max: 500,              // Maximum 500 entries
  ttl: 1000 * 60 * 5,    // 5 minute TTL
  updateAgeOnGet: true,  // Reset TTL on access
});

export async function getCachedUser(userId) {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached) {
    console.log('Cache hit:', userId);
    return cached;
  }
  
  // Cache miss: fetch from database
  console.log('Cache miss:', userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  
  // Store in cache
  userCache.set(userId, user);
  return user;
}

// Clear specific user from cache on update
export function invalidateUser(userId) {
  userCache.delete(userId);
}

// Clear all cached users
export function clearUserCache() {
  userCache.clear();
}
```text

**When to use:**

- Sequential user actions need same data (click button A, then B)
- Serverful deployments (not serverless - cache resets on cold start)
- Moderate data set (hundreds to thousands of items)
- Data changes infrequently

**Limitations:**

- Memory-bound (cache lives in process memory)
- Lost on server restart or serverless cold start
- Not shared across multiple server instances

#### Pattern 3: Module-Level Cache (Function Results)

Cache expensive function results within a single module:

```javascript
// utils/slugify.js
const slugCache = new Map();

export function slugify(text) {
  // Check cache
  if (slugCache.has(text)) {
    return slugCache.get(text);
  }
  
  // Expensive operation
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Store in cache
  slugCache.set(text, slug);
  return slug;
}

// Clear cache periodically to prevent memory leak
export function clearSlugCache() {
  slugCache.clear();
}
```text

**When to use:**

- Pure functions with expensive computation
- Same inputs called repeatedly during render
- No external dependencies (consistent output for same input)

**Memory leak prevention:**

```javascript
// Set maximum cache size
const MAX_CACHE_SIZE = 1000;

function cacheSet(cache, key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}
```text

### Redis Caching (Distributed)

Use Redis for distributed caching across multiple server instances.

#### Pattern 4: Key-Value Caching with TTL

```javascript
// lib/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached(key, fetchFn, ttl = 300) {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss: fetch data
  const data = await fetchFn();
  
  // Store in Redis with TTL (in seconds)
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// Usage
const userData = await getCached(
  `user:${userId}`,
  () => db.user.findUnique({ where: { id: userId } }),
  600 // 10 minute TTL
);
```text

#### Pattern 5: Cache Key Design

Good cache keys are specific, hierarchical, and predictable:

```javascript
// ✅ Good cache keys (specific, hierarchical)
const keys = {
  user: (id) => `user:${id}`,
  userPosts: (userId) => `user:${userId}:posts`,
  userPost: (userId, postId) => `user:${userId}:post:${postId}`,
  apiResponse: (endpoint, params) => 
    `api:${endpoint}:${JSON.stringify(params)}`,
};

// ❌ Bad cache keys (too generic, collision risk)
const badKeys = {
  user: (id) => id,                    // No namespace
  posts: () => 'posts',                // Not user-specific
  data: (id) => `data_${id}`,          // Unclear what 'data' is
};

// Multi-tenant cache key pattern
function tenantKey(tenantId, resource, id) {
  return `tenant:${tenantId}:${resource}:${id}`;
}

// tenant:acme:user:123
// tenant:acme:product:456
// tenant:beta:user:123  (different tenant, different cache)
```text

#### Pattern 6: Cache Invalidation Strategies

**Time-based (TTL):**

```javascript
// Simple: Data expires automatically
await redis.setex('user:123', 300, JSON.stringify(user)); // 5 minutes
```text

**Event-based (explicit invalidation):**

```javascript
// When user updates profile, invalidate cache
async function updateUser(userId, updates) {
  const user = await db.user.update({
    where: { id: userId },
    data: updates,
  });
  
  // Invalidate all user-related caches
  await redis.del(`user:${userId}`);
  await redis.del(`user:${userId}:posts`);
  await redis.del(`user:${userId}:profile`);
  
  return user;
}
```text

**Tag-based invalidation (complex):**

```javascript
// Tag cache entries for bulk invalidation
async function cacheWithTags(key, data, tags, ttl) {
  await redis.setex(key, ttl, JSON.stringify(data));
  
  // Store reverse mapping: tag → keys
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
  }
}

// Invalidate all caches with a specific tag
async function invalidateTag(tag) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`tag:${tag}`);
}

// Usage
await cacheWithTags(
  'user:123:posts',
  posts,
  ['user:123', 'posts'],
  600
);

// Later: invalidate all posts caches
await invalidateTag('posts');
```text

### CDN Caching (Edge)

Use CDN for static assets and cacheable API responses.

#### Pattern 7: Cache-Control Headers

```javascript
// Next.js API route with cache headers
export async function GET(request) {
  const data = await fetchPublicData();
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      // Cache at CDN for 1 hour, revalidate in background
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```text

**Cache-Control directives:**

- `s-maxage=3600` - CDN caches for 1 hour
- `max-age=3600` - Browser caches for 1 hour  
- `stale-while-revalidate=86400` - Serve stale while fetching fresh (24h window)
- `no-cache` - Always revalidate with origin
- `no-store` - Never cache (sensitive data)
- `public` - Can be cached by CDN
- `private` - Only cache in browser (user-specific data)

#### Pattern 8: Cache Busting with Version URLs

```javascript
// Static assets with version/hash in URL
// ✅ Good: Cache forever, new version = new URL
<link href="/styles.abc123.css" rel="stylesheet" />
<script src="/app.xyz789.js"></script>

// Next.js automatic handling
import Image from 'next/image';
<Image src="/logo.png" /> // Automatically versioned

// API versioning for cache busting
const response = await fetch('/api/v2/users'); // v2 won't use v1 cache
```text

### Browser Caching (Client)

Use browser storage for user preferences and UI state.

#### Pattern 9: localStorage with Expiration

```javascript
// utils/storage.js
export function setWithExpiry(key, value, ttlMs) {
  const item = {
    value,
    expiry: Date.now() + ttlMs,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getWithExpiry(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  
  const item = JSON.parse(itemStr);
  
  // Check expiration
  if (Date.now() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  
  return item.value;
}

// Usage
setWithExpiry('theme', 'dark', 1000 * 60 * 60 * 24 * 7); // 7 days
const theme = getWithExpiry('theme'); // Returns null if expired
```text

#### Pattern 10: SWR (Stale-While-Revalidate) Pattern

```javascript
// Using SWR library for client-side caching
import useSWR from 'swr';

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher, {
    revalidateOnFocus: true,    // Refresh when window gains focus
    revalidateOnReconnect: true, // Refresh when network reconnects
    dedupingInterval: 2000,      // Dedupe requests within 2s
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading profile</div>;
  
  return <div>Hello {data.name}</div>;
}

// SWR automatically:
// - Caches responses in memory
// - Deduplicates simultaneous requests
// - Revalidates stale data in background
// - Handles race conditions
```text

### Cache Warming Strategies

Pre-populate cache before requests arrive:

```javascript
// Warm cache on server startup
async function warmCache() {
  console.log('Warming cache...');
  
  // Cache top 100 users
  const topUsers = await db.user.findMany({
    take: 100,
    orderBy: { lastActive: 'desc' },
  });
  
  for (const user of topUsers) {
    await redis.setex(
      `user:${user.id}`,
      3600,
      JSON.stringify(user)
    );
  }
  
  console.log('Cache warmed:', topUsers.length, 'users');
}

// Call on server start
if (process.env.NODE_ENV === 'production') {
  warmCache();
}
```text

### Cache Stampede Prevention

Prevent multiple requests from regenerating cache simultaneously:

```javascript
// lib/cache.js
const lockMap = new Map();

export async function getCachedWithLock(key, fetchFn, ttl = 300) {
  // Check cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // Check if another process is fetching
  if (lockMap.has(key)) {
    // Wait for other process to finish
    await lockMap.get(key);
    // Try cache again (should be populated now)
    const newCached = await redis.get(key);
    if (newCached) return JSON.parse(newCached);
  }
  
  // Acquire lock
  const lockPromise = (async () => {
    const data = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(data));
    lockMap.delete(key);
    return data;
  })();
  
  lockMap.set(key, lockPromise);
  return await lockPromise;
}
```text

### Decision Guide

**Choose in-memory caching when:**

- Data needed within single request (use `React.cache()`)
- Low-latency requirements (sub-millisecond)
- Simple deployment (single server instance)
- Small data set (< 100MB)

**Choose Redis caching when:**

- Multiple server instances need shared cache
- Cache should survive server restarts
- Need distributed cache invalidation
- Large data set (GBs of cache)
- Serverless deployment (external state required)

**Choose CDN caching when:**

- Serving static assets (images, CSS, JS)
- Public API responses (same for all users)
- Global distribution required (low latency worldwide)
- High read volume (millions of requests)

**Choose browser caching when:**

- User-specific UI state
- Offline support required
- Reduce server load for preferences
- Data doesn't need to be secure

### Common Mistakes to Avoid

❌ **Caching without TTL** - Memory leaks, stale data forever  
❌ **Generic cache keys** - Cache collisions, wrong data served  
❌ **No invalidation strategy** - Users see stale data after updates  
❌ **Caching sensitive data in browser** - Security vulnerability  
❌ **Over-caching dynamic data** - Users complain about stale data  
❌ **Not handling cache misses** - Stampede on cache expiration  
❌ **Forgetting to serialize/deserialize** - Objects become `[object Object]`  
❌ **Caching errors** - Bad responses cached and repeatedly served

### Cache Invalidation Patterns

Two hard problems in computer science:

1. Cache invalidation
2. Naming things
3. Off-by-one errors

**Write-through cache (strong consistency):**

```javascript
async function updateUser(userId, data) {
  // 1. Update database
  const user = await db.user.update({
    where: { id: userId },
    data,
  });
  
  // 2. Update cache immediately
  await redis.setex(`user:${userId}`, 600, JSON.stringify(user));
  
  return user;
}
```text

**Write-behind cache (eventual consistency):**

```javascript
async function updateUser(userId, data) {
  // 1. Update cache immediately
  await redis.setex(`user:${userId}`, 600, JSON.stringify(data));
  
  // 2. Queue database update (async)
  await queue.add('updateUser', { userId, data });
  
  return data;
}
```text

**Cache-aside (lazy loading):**

```javascript
async function getUser(userId) {
  // 1. Try cache
  let user = await redis.get(`user:${userId}`);
  if (user) return JSON.parse(user);
  
  // 2. Cache miss: fetch from DB
  user = await db.user.findUnique({ where: { id: userId } });
  
  // 3. Populate cache
  await redis.setex(`user:${userId}`, 600, JSON.stringify(user));
  
  return user;
}
```text

### TTL Strategy Guidelines

| Data Type | Suggested TTL | Reasoning |
| --------- | ------------- | --------- |
| User profile | 10-30 minutes | Changes infrequently |
| User session | 15-60 minutes | Balance security vs UX |
| API responses (public) | 1-24 hours | Depends on update frequency |
| Computed reports | 1-6 hours | Expensive to regenerate |
| Real-time data | 10-60 seconds | Must be fresh |
| Static content | 30-365 days | Rarely changes |
| User preferences | 7-30 days | Very stable |

**Adaptive TTL based on access pattern:**

```javascript
// Shorter TTL for rarely accessed data (conserve memory)
// Longer TTL for frequently accessed data (better performance)
function calculateTTL(accessCount, baseSeconds = 300) {
  if (accessCount > 100) return baseSeconds * 4; // Hot data: 20 min
  if (accessCount > 10) return baseSeconds * 2;  // Warm data: 10 min
  return baseSeconds;                             // Cold data: 5 min
}
```text

## Related Patterns

- See `auth-patterns.md` for caching authenticated user data
- See `api-design-patterns.md` for RESTful caching headers
- See `database-patterns.md` for query-level caching
- Consider libraries: `ioredis`, `lru-cache`, `swr`, `react-query`

## References

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [HTTP Caching (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [SWR Documentation](https://swr.vercel.app/)
- [React Cache API](https://react.dev/reference/react/cache)
- [LRU Cache npm](https://github.com/isaacs/node-lru-cache)

## See Also

- **[Cache Debugging](../ralph/cache-debugging.md)** - Debug cache issues in Ralph loop system
- **[State Management Patterns](../infrastructure/state-management-patterns.md)** - Managing state across distributed systems
- **[Observability Patterns](../infrastructure/observability-patterns.md)** - Monitoring and observability for cache metrics
- **[Database Patterns](database-patterns.md)** - Database query optimization and caching strategies
