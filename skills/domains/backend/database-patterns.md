# Database Patterns

## 🚨 Quick Reference (Database Decision Guide)

**Use this table when making database architecture decisions:**

| Decision Point | Question | Quick Answer | Pattern Reference |
| ---------------- | ---------- | -------------- | ------------------- |
| **SQL vs NoSQL** | Which database type? | Structured data with relationships → SQL; Flexible schema → NoSQL | [SQL vs NoSQL Decision Matrix](#sql-vs-nosql-decision-matrix) |
| **ORM Selection** | Which ORM for my language? | TypeScript → Prisma; Python → SQLAlchemy; Go → GORM | [ORM Selection Guide](#orm-selection-guide) |
| **Schema Design** | How to normalize? | 3NF for most apps; denormalize for read-heavy queries | [Pattern 1: Normalization Strategy](#pattern-1-normalization-strategy) |
| **Performance** | Query is slow? | Add index → prevent N+1 → use eager loading | [Pattern 4: N+1 Query Prevention](#pattern-4-n1-query-prevention) |
| **Transactions** | Need ACID guarantees? | Use transactions for multi-step writes; isolate for concurrency | [Pattern 7: ACID Transactions](#pattern-7-acid-transactions) |
| **Scaling** | Too many connections? | Configure connection pool (min=10, max=20-30) | [Pattern 10: Connection Pool Configuration](#pattern-10-connection-pool-configuration) |
| **Migrations** | How to change schema? | Version migrations, test rollbacks, avoid data loss | [Pattern 9: Safe Schema Migrations](#pattern-9-safe-schema-migrations) |
| **Indexing** | Which columns to index? | WHERE/JOIN/ORDER BY columns; avoid over-indexing | [Pattern 5: Indexing Strategy](#pattern-5-indexing-strategy) |

**Common Quick Fixes:**

- Slow query → Add index on WHERE/JOIN columns
- N+1 queries → Use `include`/`populate`/`prefetch_related`
- Connection exhaustion → Reduce pool max or fix connection leaks
- Migration failed → Test rollback, add IF NOT EXISTS checks
- Data race → Wrap in transaction with proper isolation level

---

## Why This Exists

Database design and interaction patterns are fundamental to building scalable, maintainable applications. Poor database choices lead to performance bottlenecks (N+1 queries, missing indexes), data integrity issues, difficult migrations, and expensive refactoring. This knowledge base documents proven database patterns across SQL and NoSQL systems, ORM usage, schema design, query optimization, and transaction management, helping teams make informed decisions and avoid common pitfalls.

**Problem solved:** Without standardized database patterns, teams struggle with schema design decisions, write inefficient queries, misuse ORMs, create unmaintainable migrations, and encounter scaling issues that require costly rewrites.

## When to Use It

Reference this KB file when:

- Designing database schemas or choosing between SQL vs NoSQL
- Selecting an ORM or writing raw queries
- Optimizing slow database queries or reducing query counts
- Planning database migrations or schema changes
- Implementing transactions or handling concurrent updates
- Scaling database access (connection pooling, read replicas)
- Debugging N+1 query problems or performance issues

**Specific triggers:**

- Application performance profiling shows database as bottleneck
- Query execution times exceeding 100ms
- Database connection pool exhaustion
- Data integrity issues or race conditions
- Need to handle millions of rows or high write throughput
- Choosing between Prisma, TypeORM, Sequelize, SQLAlchemy, or raw SQL
- Planning multi-tenant database architecture

## Details

### SQL vs NoSQL Decision Matrix

Choose the right database type for your use case:

| Use Case | Recommendation | Reasoning |
| ---------- | --------------- | ----------- |
| Structured data with relationships | **SQL** (PostgreSQL, MySQL) | ACID guarantees, joins, constraints |
| Document storage, flexible schema | **NoSQL** (MongoDB) | Schema flexibility, horizontal scaling |
| Key-value cache | **Redis** | Speed, TTL support |
| Time-series data | **TimescaleDB, InfluxDB** | Optimized for time-based queries |
| Graph relationships | **Neo4j** | Efficient graph traversals |
| Full-text search | **Elasticsearch** | Advanced search capabilities |
| Analytics/OLAP | **BigQuery, Snowflake** | Column-oriented, aggregation optimized |

**When to use SQL (most common):**

- You have clear relationships (users, posts, comments)
- Need ACID transactions (financial data, inventory)
- Complex queries with joins across multiple tables
- Schema is relatively stable
- Strong consistency requirements

**When to use NoSQL:**

- Schema frequently changes or varies by document
- Denormalized data acceptable (faster reads, slower writes)
- Horizontal scaling critical (millions of documents)
- Simple queries, no complex joins needed

### ORM Selection Guide

| ORM | Language | Best For | Pros | Cons |
| ----- | ---------- | ---------- | ------ | ------ |
| **Prisma** | TypeScript/JS | Modern Node.js apps | Type-safe, great DX, migrations | Less mature ecosystem |
| **TypeORM** | TypeScript/JS | Enterprise Node.js | Decorator-based, supports multiple DBs | Complex decorators |
| **Sequelize** | JavaScript | Legacy Node.js | Mature, widely adopted | No TypeScript first-class support |
| **SQLAlchemy** | Python | Python apps | Powerful, flexible | Steeper learning curve |
| **Django ORM** | Python | Django projects | Integrated with Django | Tightly coupled |
| **GORM** | Go | Go applications | Simple API, auto-migrations | Less powerful than SQLAlchemy |

**Raw SQL vs ORM decision:**

- Use ORM for: CRUD operations, simple queries, rapid development, type safety
- Use raw SQL for: Complex queries with performance critical, data migrations, analytics queries
- Hybrid approach (recommended): ORM for 80% of queries, raw SQL for complex edge cases

### Schema Design Patterns

#### Pattern 1: Normalization Strategy

**3rd Normal Form (3NF) - Standard approach:**

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts table (normalized - no user data duplication)
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments table (normalized)
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for foreign keys and common queries
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published_at ON posts(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
```text

**When to normalize:**

- Data changes frequently (avoid update anomalies)
- Strong consistency required
- Storage is not a primary concern
- Write-heavy workloads

#### Pattern 2: Denormalization for Performance

**Selective denormalization for read-heavy workloads:**

```sql
-- Add commonly accessed fields to avoid joins
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  -- Denormalized for performance
  user_username VARCHAR(50) NOT NULL,  -- Duplicates users.username
  user_avatar_url TEXT,                -- Duplicates users.avatar_url
  
  title VARCHAR(255) NOT NULL,
  content TEXT,
  comment_count INTEGER DEFAULT 0,     -- Denormalized aggregate
  like_count INTEGER DEFAULT 0,        -- Denormalized aggregate
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to keep denormalized data in sync
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
```text

**When to denormalize:**

- Read-heavy workloads (10:1 read:write ratio or higher)
- Avoiding expensive joins improves user experience significantly
- Aggregates are expensive to compute on-the-fly
- Can maintain consistency with triggers or application logic

**Trade-off:** Faster reads, more complex writes, potential consistency issues.

#### Pattern 3: Soft Deletes

```sql
-- Add deleted_at column for soft deletes
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  deleted_at TIMESTAMP NULL,  -- NULL = not deleted
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index to exclude soft-deleted records efficiently
CREATE INDEX idx_posts_not_deleted ON posts(id) WHERE deleted_at IS NULL;

-- Query pattern: always filter out soft-deleted
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Restore capability
UPDATE posts SET deleted_at = NULL WHERE id = 123;

-- Hard delete after retention period (run periodically)
DELETE FROM posts WHERE deleted_at < NOW() - INTERVAL '90 days';
```text

**When to use soft deletes:**

- Need audit trail or recovery capability
- Regulatory compliance requires data retention
- Users expect "undo" functionality

**When NOT to use:**

- GDPR "right to be forgotten" requires hard deletes
- Storage costs are critical
- Unique constraints conflict with soft-deleted rows

### Query Optimization Patterns

#### Pattern 4: N+1 Query Prevention

**Problem - N+1 queries (antipattern):**

```javascript
// BAD: Fetches 1 + N queries (1 for posts, N for users)
const posts = await db.post.findMany();

for (const post of posts) {
  post.author = await db.user.findUnique({ 
    where: { id: post.userId } 
  }); // Executes N times!
}
```text

**Solution 1 - Eager loading with ORM:**

```javascript
// GOOD: 1 or 2 queries total (depending on ORM)
const posts = await db.post.findMany({
  include: {
    author: true,  // Prisma joins or batches this
  }
});
```text

**Solution 2 - Manual batching (DataLoader pattern):**

```javascript
import DataLoader from 'dataloader';

// Batch load users by ID
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: userIds } }
  });
  
  // Return in same order as requested IDs
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id));
});

// Usage: automatically batched
const posts = await db.post.findMany();
const postsWithAuthors = await Promise.all(
  posts.map(async post => ({
    ...post,
    author: await userLoader.load(post.userId)
  }))
);
```text

**Solution 3 - Raw SQL with JOIN:**

```sql
-- GOOD: Single query with JOIN
SELECT 
  posts.*,
  users.username,
  users.email
FROM posts
INNER JOIN users ON posts.user_id = users.id
WHERE posts.published_at IS NOT NULL;
```text

#### Pattern 5: Indexing Strategy

**Essential indexes:**

```sql
-- Primary key (automatic)
CREATE TABLE users (
  id SERIAL PRIMARY KEY  -- Automatically indexed
);

-- Foreign keys (always index for joins)
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Unique constraints (automatic index)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Covering index (includes extra columns to avoid table lookup)
CREATE INDEX idx_posts_user_published 
ON posts(user_id, published_at) 
INCLUDE (title, created_at);

-- Partial index (smaller, faster for filtered queries)
CREATE INDEX idx_posts_published 
ON posts(published_at) 
WHERE published_at IS NOT NULL;

-- Composite index (order matters! Most selective first)
CREATE INDEX idx_users_tenant_active 
ON users(tenant_id, is_active, created_at);
```text

**Index guidelines:**

- Index foreign keys used in JOINs
- Index columns in WHERE, ORDER BY, GROUP BY clauses
- Composite index order: Equality filters → Range filters → Sort columns
- Partial indexes for common filtered queries (published posts, active users)
- Monitor index usage: Remove unused indexes (they slow writes)

**Check index usage (PostgreSQL):**

```sql
-- Find unused indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0 
  AND indexname NOT LIKE 'pg_toast%'
ORDER BY schemaname, tablename;

-- Query performance analysis
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 123 AND published_at IS NOT NULL;
```text

#### Pattern 6: Pagination

**Offset-based (simple but slow for large offsets):**

```javascript
// BAD for large datasets: OFFSET 10000 scans and discards 10000 rows
const posts = await db.post.findMany({
  skip: page * pageSize,     // OFFSET
  take: pageSize,            // LIMIT
  orderBy: { createdAt: 'desc' }
});
```text

**Cursor-based (efficient for large datasets):**

```javascript
// GOOD: Uses indexed column (created_at or id) as cursor
const posts = await db.post.findMany({
  take: pageSize,
  cursor: lastPostId ? { id: lastPostId } : undefined,
  skip: lastPostId ? 1 : 0,  // Skip the cursor itself
  orderBy: { createdAt: 'desc' }
});

// Return cursor for next page
return {
  posts,
  nextCursor: posts[posts.length - 1]?.id
};
```text

**SQL cursor pattern:**

```sql
-- Fetch next 20 posts after cursor
SELECT * FROM posts
WHERE created_at < '2024-01-15 10:00:00'  -- Cursor value
ORDER BY created_at DESC
LIMIT 20;
```text

### Transaction Patterns

#### Pattern 7: ACID Transactions

```javascript
// Prisma transaction
await db.$transaction(async (tx) => {
  // Debit account A
  await tx.account.update({
    where: { id: accountA },
    data: { balance: { decrement: 100 } }
  });
  
  // Credit account B
  await tx.account.update({
    where: { id: accountB },
    data: { balance: { increment: 100 } }
  });
  
  // Log transaction
  await tx.transaction.create({
    data: { from: accountA, to: accountB, amount: 100 }
  });
  
  // All succeed or all rollback
});
```text

**PostgreSQL transaction isolation levels:**

```sql
-- Read Committed (default) - sees committed data only
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read - consistent snapshot of data
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable - strictest, prevents all anomalies
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```text

**When to use transactions:**

- Multi-step operations that must all succeed or fail together
- Financial operations (transfers, payments)
- Inventory updates with reservations
- Referential integrity across tables

**When NOT to use long transactions:**

- Avoid holding transactions during external API calls
- Keep transaction scope minimal (lock contention)
- Consider eventual consistency for non-critical operations

#### Pattern 8: Optimistic Locking

```javascript
// Version-based optimistic locking
const post = await db.post.findUnique({ where: { id: 123 } });

// User edits...

// Update only if version matches (prevents lost updates)
const updated = await db.post.updateMany({
  where: { 
    id: 123, 
    version: post.version  // Ensures no changes since fetch
  },
  data: { 
    content: newContent,
    version: { increment: 1 }  // Increment version
  }
});

if (updated.count === 0) {
  throw new Error('Post was modified by another user. Please refresh.');
}
```text

**Schema for optimistic locking:**

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  content TEXT,
  version INTEGER DEFAULT 1,  -- Increment on every update
  updated_at TIMESTAMP DEFAULT NOW()
);
```text

**When to use:**

- Concurrent edits are rare but possible
- Lower latency than pessimistic locking
- Can handle conflicts in application layer

### Migration Patterns

#### Pattern 9: Safe Schema Migrations

**Zero-downtime migration strategy:**

```javascript
// Step 1: Add new column (nullable, default null)
await db.$executeRaw`
  ALTER TABLE users 
  ADD COLUMN full_name VARCHAR(255) NULL;
`;

// Step 2: Backfill data (in batches)
let cursor = 0;
while (true) {
  const users = await db.user.findMany({
    where: { fullName: null },
    take: 1000,
    skip: cursor
  });
  
  if (users.length === 0) break;
  
  await db.$transaction(
    users.map(u => 
      db.user.update({
        where: { id: u.id },
        data: { fullName: `${u.firstName} ${u.lastName}` }
      })
    )
  );
  
  cursor += users.length;
}

// Step 3: Make column non-nullable (after backfill complete)
await db.$executeRaw`
  ALTER TABLE users 
  ALTER COLUMN full_name SET NOT NULL;
`;

// Step 4: Drop old columns (after rollback window)
await db.$executeRaw`
  ALTER TABLE users 
  DROP COLUMN first_name,
  DROP COLUMN last_name;
`;
```text

**Migration best practices:**

- **Additive changes first**: Add columns before removing
- **Backfill in batches**: Avoid locking entire table
- **Test rollback**: Ensure migration can be reverted
- **Coordinate with deploys**: Schema must support old and new code temporarily
- **Use transactions for DDL** (PostgreSQL supports this, MySQL doesn't)

**Prisma migration workflow:**

```bash
# Create migration file
npx prisma migrate dev --name add_full_name

# Apply to production
npx prisma migrate deploy

# Rollback (manual)
# Edit schema.prisma to previous state, then:
npx prisma migrate dev --name revert_full_name
```text

### Connection Pooling

#### Pattern 10: Connection Pool Configuration

```javascript
// Prisma connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool config
  // Formula: (num_physical_cpus * 2) + effective_spindle_count
  // For most apps: 10-20 connections per instance
  connection_limit: 10,
});

// PostgreSQL URL with pool settings
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?connection_limit=10&pool_timeout=20"  # pragma: allowlist secret
```text

**Node.js pg pool:**

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  user: 'postgres',
  password: 'secret',  // pragma: allowlist secret
  max: 20,              // Maximum pool size
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Fail fast if no connection available
});

// Always release connections
async function queryUser(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1', 
      [userId]
    );
    return result.rows[0];
  } finally {
    client.release();  // Critical: return to pool
  }
}
```text

**Pool sizing guidelines:**

- **Small apps (< 1000 req/s)**: 10-20 connections
- **Medium apps (1000-10000 req/s)**: 20-50 connections
- **Large apps (> 10000 req/s)**: 50-100 connections, consider read replicas
- **Serverless (Lambda)**: Use connection pooler like PgBouncer or RDS Proxy (cold starts exhaust pools)

**Warning:** More connections ≠ better performance. Too many connections cause context switching overhead.

### Multi-Tenancy Patterns

#### Pattern 11: Tenant Isolation Strategies

**Strategy 1 - Row-level (shared tables):**

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- Every row tagged with tenant
  title VARCHAR(255),
  content TEXT
);

-- Index for tenant queries
CREATE INDEX idx_posts_tenant ON posts(tenant_id);

-- Row-Level Security (PostgreSQL)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON posts
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```text

```javascript
// Set tenant context per request
await db.$executeRaw`SET app.current_tenant = ${tenantId}`;
const posts = await db.post.findMany();  // Automatic filtering
```text

**Strategy 2 - Schema-level (separate schemas per tenant):**

```sql
-- Create schema per tenant
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

-- Same table structure in each schema
CREATE TABLE tenant_acme.posts (...);
CREATE TABLE tenant_globex.posts (...);
```text

```javascript
// Switch schema per request
await db.$executeRaw`SET search_path = ${tenantSchema}`;
const posts = await db.post.findMany();
```text

**Strategy 3 - Database-level (separate database per tenant):**

```javascript
// Different connection per tenant
const tenantDb = new PrismaClient({
  datasources: {
    db: { url: `postgresql://localhost/${tenantId}` }
  }
});
```text

**Decision matrix:**

| Strategy | Best For | Pros | Cons |
| ---------- | ---------- | ------ | ------ |
| Row-level | Many small tenants | Easy to manage, shared resources | Queries must always filter tenant_id |
| Schema-level | Medium tenants (10-1000) | Logical isolation, easier backups | More complex migrations |
| Database-level | Few large tenants, high isolation | Strong isolation, independent scaling | High overhead per tenant |

## Common Anti-Patterns

**❌ SELECT * (retrieve unnecessary columns):**

```sql
-- BAD: Fetches megabytes of data
SELECT * FROM posts;

-- GOOD: Fetch only needed columns
SELECT id, title, created_at FROM posts;
```text

**❌ Missing indexes on foreign keys:**

```sql
-- BAD: No index on user_id
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id)
);

-- GOOD: Index foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);
```text

**❌ Storing JSON blobs instead of proper schema:**

```sql
-- BAD: Difficult to query, no validation
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  data JSONB  -- Everything in JSON blob
);

-- GOOD: Proper columns with types
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  preferences JSONB  -- Only dynamic data in JSON
);
```text

**❌ Using ORM for complex queries (slow):**

```javascript
// BAD: ORM generates inefficient query
const users = await db.user.findMany({
  include: {
    posts: {
      include: {
        comments: {
          include: { author: true }
        }
      }
    }
  }
});

// GOOD: Raw SQL with explicit JOINs
const result = await db.$queryRaw`
  SELECT 
    u.id, u.username,
    p.id as post_id, p.title,
    c.id as comment_id, c.content,
    a.username as comment_author
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  LEFT JOIN comments c ON p.id = c.post_id
  LEFT JOIN users a ON c.user_id = a.id
`;
```text

**❌ Long-running transactions with external calls:**

```javascript
// BAD: Holds transaction during API call
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await sendEmail(order);  // External API - might take seconds!
  await tx.payment.create({ data });
});

// GOOD: Keep transactions short
const order = await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await tx.payment.create({ data });
  return order;
});
await sendEmail(order);  // After transaction committed
```text

## Related Patterns

- See `caching-patterns.md` for query result caching and cache invalidation
- See `api-design-patterns.md` for database-backed API design
- See `testing-patterns.md` for database testing strategies (fixtures, transactions)
- See `auth-patterns.md` for session storage (database vs Redis)

## See Also

- **[Caching Patterns](caching-patterns.md)** - Query result caching and cache invalidation strategies
- **[Error Handling Patterns](error-handling-patterns.md)** - Database error handling and transaction rollback
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Database testing strategies (fixtures, transactions)
- **[Auth Patterns](auth-patterns.md)** - Session storage (database vs Redis)

## References

- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [SQL Indexing and Tuning](https://use-the-index-luke.com/)
- [Database Design Patterns](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
