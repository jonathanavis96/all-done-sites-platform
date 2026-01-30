# Deployment Patterns

## Why This Exists

Deploying applications to production involves complex decisions around CI/CD pipelines, containerization, environment management, database migrations, rollback strategies, zero-downtime deployments, and monitoring. Teams often struggle with deployment reliability, inconsistent environments, failed migrations, and lack of rollback plans. This knowledge base documents proven deployment patterns covering CI/CD best practices, Docker containerization, environment configuration, database migration strategies, health checks, monitoring, and rollback procedures.

**Problem solved:** Without standardized deployment patterns, teams experience production outages from failed deployments, environment drift between staging and production, broken database migrations, inability to rollback quickly, and lack of visibility into deployment health. This leads to longer incident response times, fear of deploying, and reduced deployment frequency.

## When to Use It

Reference this KB file when:

- Setting up CI/CD pipelines for automated deployments
- Containerizing applications with Docker
- Managing environment variables across dev/staging/production
- Planning database migration strategies for production
- Implementing zero-downtime deployment techniques
- Setting up health checks and monitoring
- Designing rollback and disaster recovery procedures
- Troubleshooting deployment failures

**Specific triggers:**

- Need to deploy a new application to production
- Deployment failures causing downtime
- Database migrations breaking production
- Environment-specific bugs (works in dev, fails in prod)
- Need to rollback a bad deployment quickly
- Setting up monitoring and alerting for new services

## Quick Reference

### Deployment Strategies

| Strategy          | Downtime | Risk     | Rollback | Best For                      |
|-------------------|----------|----------|----------|-------------------------------|
| **Rolling**       | Zero     | Low      | Slow     | Stateless apps, k8s default   |
| **Blue/Green**    | Zero     | Low      | Instant  | Critical apps, databases      |
| **Canary**        | Zero     | Very Low | Instant  | High-traffic, gradual rollout |
| **Recreate**      | Yes      | Medium   | Slow     | Dev/staging, breaking changes |
| **Feature Flags** | Zero     | Very Low | Instant  | Gradual features, A/B tests   |
| **Shadow**        | Zero     | Very Low | N/A      | Test new version with prod traffic |
| **A/B Testing**   | Zero     | Low      | Instant  | Compare versions, user experiments |

### CI/CD Pipeline Stages

| Stage                    | Purpose             | Fail = Block?  |
|--------------------------|---------------------|----------------|
| **Lint**                 | Code style, syntax  | Yes            |
| **Unit Tests**           | Logic correctness   | Yes            |
| **Build**                | Compile, bundle     | Yes            |
| **Integration Tests**    | API, database       | Yes            |
| **Security Scan**        | Vulnerabilities     | Yes (critical) |
| **Deploy to Staging**    | Pre-prod validation | Yes            |
| **E2E Tests**            | User flows          | Yes            |
| **Deploy to Production** | Release             | N/A            |

### Environment Configuration

| Environment    | Purpose     | Data         | Debug   |
|----------------|-------------|--------------|---------|
| **Local**      | Development | Mock/seed    | Full    |
| **Staging**    | Testing     | Copy of prod | Full    |
| **Production** | Live users  | Real         | Minimal |

### Common Mistakes

| ❌ Don't                        | ✅ Do                           |
|---------------------------------|---------------------------------|
| Deploy without tests            | Gate on test success            |
| Manual deployments              | Automate with CI/CD             |
| Same config everywhere          | Environment-specific configs    |
| Deploy database + code together | Migrate DB first, then deploy   |
| No rollback plan                | Blue/green or quick revert      |
| Skip staging                    | Always test in staging first    |
| Deploy on Fridays               | Deploy early in week            |
| No health checks                | Liveness + readiness probes     |

### Health Check Endpoints

| Endpoint            | Purpose                    | Response                  |
|---------------------|----------------------------|---------------------------|
| `/health`           | Basic liveness             | `200 OK`                  |
| `/health/live`      | Is process running?        | `200` or `503`            |
| `/health/ready`     | Can handle traffic?        | `200` or `503`            |
| `/health/detailed`  | Debug info (internal only) | JSON with deps status     |

## Details

### CI/CD Pipeline Patterns

**Problem:** Manual deployments are error-prone, slow, and inconsistent. Without automation, deployments become risky and infrequent.

**Solution:** Implement automated CI/CD pipelines that build, test, and deploy on every merge to main branch.

**GitHub Actions Example:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_ENV: production
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Run build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Key principles:**

- ✅ Run tests before deploying (gate deployments on test success)
- ✅ Deploy only from main/production branch
- ✅ Use secrets management (never hardcode credentials)
- ✅ Build once, deploy everywhere (same artifact for staging/production)
- ✅ Fail fast (stop pipeline on first failure)
- ✅ Log all deployment steps for debugging

---

### Docker Containerization

**Problem:** "Works on my machine" syndrome. Different environments have different dependencies, versions, and configurations.

**Solution:** Containerize applications with Docker for consistent environments across development, staging, and production.

**Multi-stage Dockerfile (Node.js/Next.js):**

```dockerfile
# Dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose for local development:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp  # pragma: allowlist secret
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Key principles:**

- ✅ Use multi-stage builds to minimize image size
- ✅ Run as non-root user for security
- ✅ Use `.dockerignore` to exclude unnecessary files
- ✅ Pin specific versions (avoid `latest` tag)
- ✅ Cache dependencies layer separately from code
- ✅ Use Alpine Linux for smaller images

---

### Environment Configuration

**Problem:** Hardcoded configuration makes applications inflexible. Different environments (dev/staging/prod) need different settings.

**Solution:** Use environment variables with validation and sensible defaults.

**Environment variable management:**

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);

// Usage:
// import { env } from '@/lib/env';
// const dbUrl = env.DATABASE_URL;
```

**`.env.example` template:**

```bash
# .env.example (commit this)
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp  # pragma: allowlist secret
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars-long
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3000
```

**Environment-specific files:**

```bash
.env.local          # Local overrides (gitignored)
.env.development    # Development defaults
.env.staging        # Staging configuration
.env.production     # Production configuration (use secrets manager)
```

**Key principles:**

- ✅ Validate environment variables at startup (fail fast)
- ✅ Use `NEXT_PUBLIC_` prefix only for client-safe values
- ✅ Never commit `.env.local` or `.env.production` to git
- ✅ Use secret management services in production (AWS Secrets Manager, HashiCorp Vault)
- ✅ Provide `.env.example` as documentation
- ✅ Set sensible defaults where appropriate

---

### Database Migrations in Production

**Problem:** Database migrations can break production if not handled carefully. Schema changes need to coordinate with code deployments.

**Solution:** Use backward-compatible migrations and deploy in phases.

**Safe migration strategy:**

#### Phase 1: Add new column (backward-compatible)

```sql
-- Migration 001: Add new column with default
ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT '';
```

Deploy code that populates `full_name` but still reads from old columns:

```typescript
// Code reads old columns, writes to both
const user = await db.user.findUnique({ where: { id } });
const fullName = user.full_name || `${user.first_name} ${user.last_name}`;
```

#### Phase 2: Backfill data

```sql
-- Migration 002: Backfill existing data
UPDATE users 
SET full_name = CONCAT(first_name, ' ', last_name) 
WHERE full_name = '';
```

#### Phase 3: Remove old columns (after all code updated)

```sql
-- Migration 003: Remove old columns
ALTER TABLE users DROP COLUMN first_name;
ALTER TABLE users DROP COLUMN last_name;
```

**Prisma migration workflow:**

```bash
# Development: Create migration
npx prisma migrate dev --name add_full_name

# Staging: Test migration
npx prisma migrate deploy

# Production: Apply migration
npx prisma migrate deploy

# Rollback (if needed)
# Revert schema.prisma, then create rollback migration
npx prisma migrate dev --name revert_full_name
```

**Key principles:**

- ✅ Always make migrations backward-compatible
- ✅ Deploy schema changes before code changes
- ✅ Test migrations on staging with production-like data
- ✅ Use transactions for atomic migrations (PostgreSQL)
- ✅ Keep migrations small and focused
- ✅ Never modify applied migrations (create new ones)
- ✅ Have rollback plan for every migration

---

### Zero-Downtime Deployments

**Problem:** Traditional deployments cause downtime during restarts. Users experience errors during deployment windows.

**Solution:** Use rolling deployments, health checks, and graceful shutdowns.

**Health check endpoint:**

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown',
    },
  };

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'ok';
  } catch (error) {
    checks.checks.database = 'error';
    checks.status = 'degraded';
  }

  try {
    // Check Redis connectivity
    await redis.ping();
    checks.checks.redis = 'ok';
  } catch (error) {
    checks.checks.redis = 'error';
    checks.status = 'degraded';
  }

  // Check memory usage
  const used = process.memoryUsage();
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
  checks.checks.memory = heapUsedPercent > 90 ? 'warning' : 'ok';

  const statusCode = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

**Graceful shutdown (Node.js server):**

```javascript
// server.js
const express = require('express');
const app = express();

let server;

function startServer() {
  server = app.listen(3000, () => {
    console.log('Server started on port 3000');
  });
}

function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    prisma.$disconnect();
    redis.quit();
    
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
```

**Rolling deployment strategy:**

```yaml
# kubernetes/deployment.yml (example)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Deploy 1 new pod at a time
      maxUnavailable: 0  # Keep all old pods until new ones ready
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

**Key principles:**

- ✅ Implement health check endpoints (`/health`, `/ready`)
- ✅ Use graceful shutdown to finish in-flight requests
- ✅ Deploy new version alongside old (rolling update)
- ✅ Wait for health checks before routing traffic
- ✅ Keep old version running until new version healthy
- ✅ Use readiness probes (Kubernetes) or health checks (AWS ELB)

---

### Rollback Strategies

**Problem:** Bad deployments happen. Need to revert to previous working version quickly.

**Solution:** Tag releases, keep previous versions, automate rollback.

**Git-based rollback:**

```bash
# Tag releases for easy rollback
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3

# Rollback to previous tag
git checkout v1.2.2
./deploy.sh

# Or revert specific commit
git revert <bad-commit-hash>
git push origin main
```

**Docker image rollback:**

```bash
# Always tag images with version and commit SHA
docker build -t myapp:1.2.3 -t myapp:$(git rev-parse --short HEAD) .
docker push myapp:1.2.3

# Rollback: Deploy previous image
docker pull myapp:1.2.2
docker stop myapp-container
docker run -d --name myapp-container myapp:1.2.2
```

**Database migration rollback:**

```bash
# Keep rollback migrations ready
# migrations/
#   001_add_column.up.sql
#   001_add_column.down.sql

# Rollback with Prisma (manual)
# Edit schema.prisma to previous state
npx prisma migrate dev --name rollback_add_column

# Rollback with custom tool
./migrate.sh down 001
```

**Automated rollback triggers:**

```yaml
# CI/CD rollback on health check failure
- name: Health check after deploy
  run: |
    sleep 10
    response=$(curl -s -o /dev/null -w "%{http_code}" https://myapp.com/api/health)
    if [ $response -ne 200 ]; then
      echo "Health check failed, rolling back"
      ./rollback.sh
      exit 1
    fi
```

**Key principles:**

- ✅ Tag every release with semantic version
- ✅ Keep previous 3-5 versions readily available
- ✅ Automate rollback process (tested regularly)
- ✅ Monitor health checks post-deployment
- ✅ Have database rollback migrations prepared
- ✅ Document rollback procedure in runbook
- ✅ Practice rollbacks in staging environment

---

### Monitoring and Observability

**Problem:** Deployments succeed but application behaves incorrectly. Need visibility into application health and performance.

**Solution:** Implement logging, metrics, and alerting.

**Structured logging:**

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
});

// Usage:
logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ error: err, userId: 123 }, 'Failed to process payment');
```

**Application metrics:**

```typescript
// lib/metrics.ts
import { Counter, Histogram } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
});

// Middleware to record metrics
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ 
      method: req.method, 
      route: req.route?.path || 'unknown',
      status: res.statusCode,
    });
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || 'unknown' },
      duration
    );
  });
  
  next();
}
```

**Alerting rules (example):**

```yaml
# prometheus/alerts.yml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "95th percentile latency > 1s"
```

**Key principles:**

- ✅ Use structured logging (JSON format)
- ✅ Log request IDs for tracing
- ✅ Monitor key metrics (error rate, latency, throughput)
- ✅ Set up alerts for critical issues
- ✅ Use APM tools (Datadog, New Relic, Sentry)
- ✅ Dashboard key metrics for visibility
- ✅ Log deployment events for correlation

---

## Common Mistakes to Avoid

❌ **Deploying without tests** - Always run tests in CI/CD before deploying  
❌ **No rollback plan** - Every deployment should have a tested rollback procedure  
❌ **Breaking database migrations** - Use backward-compatible migrations  
❌ **Hardcoded environment config** - Use environment variables  
❌ **No health checks** - Implement `/health` endpoint for monitoring  
❌ **Deploying at peak hours** - Schedule deployments during low traffic  
❌ **No deployment monitoring** - Watch logs and metrics during/after deploy  
❌ **Single point of failure** - Use multiple replicas/instances  
❌ **No graceful shutdown** - Handle SIGTERM to finish in-flight requests  
❌ **Testing only in dev** - Always test in staging environment first

---

## When NOT to Use It

- **Static websites** - Simple hosting (Netlify/Vercel) handles deployment automatically
- **Serverless functions** - Platform manages deployment (AWS Lambda, Vercel Functions)
- **Very early prototypes** - Manual deployment acceptable initially (but plan for automation)

**Note:** Even for simple projects, basic CI/CD (automated tests + deployment) provides significant value. Start simple and expand as needs grow.

---

### Blue/Green Deployment Pattern

**Problem:** Need instant rollback capability and zero-downtime deployments for critical applications.

**Solution:** Maintain two identical production environments (Blue and Green). Deploy to inactive environment, test, then switch traffic.

**Implementation:**

```bash
# AWS with ELB/ALB
# 1. Deploy new version to Green environment
aws deploy create-deployment \
  --application-name myapp \
  --deployment-group-name green-env \
  --s3-location bucket=mybucket,key=myapp-v2.zip

# 2. Run smoke tests against Green
curl https://green.myapp.com/health

# 3. Switch traffic: Update load balancer target group
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --default-actions TargetGroupArn=arn:aws:elasticloadbalancing:...green

# 4. Monitor for issues (keep Blue running)
# If problems detected, switch back to Blue instantly
```

**Kubernetes Blue/Green:**

```yaml
# blue-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
  labels:
    app: myapp
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.2.2
        ports:
        - containerPort: 8080

---
# green-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
  labels:
    app: myapp
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:v1.2.3  # New version
        ports:
        - containerPort: 8080

---
# service.yaml - Switch traffic by changing selector
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
    version: blue  # Change to 'green' to switch traffic
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

**Database considerations:**

```sql
-- Blue/Green with databases requires careful planning
-- Option 1: Shared database (backward-compatible changes only)
-- Deploy schema changes first, then switch app traffic

-- Option 2: Separate databases (full isolation)
-- Replicate Blue DB to Green, test thoroughly
-- Switch traffic, then migrate data back if rollback needed

-- Example: Backward compatible change
-- Phase 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Phase 2: Deploy Green app (uses new column)
-- Switch traffic to Green

-- Phase 3: Backfill data
UPDATE users SET email_verified = TRUE WHERE confirmed_at IS NOT NULL;

-- Phase 4: Make column non-nullable (after Green stable)
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

**Key principles:**

- ✅ Two identical environments (same infrastructure, configs)
- ✅ Deploy to inactive environment first
- ✅ Run full smoke tests before switching
- ✅ Instant rollback by switching back
- ✅ Keep old environment running for 24-48h after switch
- ✅ Database changes must be backward-compatible OR use separate DBs

**Trade-offs:**

- **Pros:** Instant rollback, full pre-prod testing in prod-like environment, zero downtime
- **Cons:** 2x infrastructure cost, database complexity, requires load balancer/DNS switching

---

### Canary Deployment Pattern

**Problem:** Want to test new version with small subset of users before full rollout.

**Solution:** Deploy new version to small percentage of servers/pods, gradually increase traffic if metrics look good.

**Kubernetes Canary with Istio:**

```yaml
# canary-virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp.example.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: myapp
        subset: canary
  - route:
    - destination:
        host: myapp
        subset: stable
      weight: 90  # 90% to stable version
    - destination:
        host: myapp
        subset: canary
      weight: 10  # 10% to canary version
```

**Progressive rollout script:**

```bash
#!/bin/bash
# canary-rollout.sh - Gradually increase canary traffic

set -euo pipefail

CANARY_WEIGHTS=(10 25 50 75 100)
CHECK_INTERVAL=300  # 5 minutes between stages

for weight in "${CANARY_WEIGHTS[@]}"; do
  stable_weight=$((100 - weight))
  
  echo "Setting canary weight to ${weight}%..."
  kubectl patch virtualservice myapp --type merge -p "
    spec:
      http:
      - route:
        - destination:
            host: myapp
            subset: stable
          weight: ${stable_weight}
        - destination:
            host: myapp
            subset: canary
          weight: ${weight}
  "
  
  echo "Waiting ${CHECK_INTERVAL}s for metrics..."
  sleep "${CHECK_INTERVAL}"
  
  # Check error rate
  error_rate=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])' | jq -r '.data.result[0].value[1]')
  
  if (( $(echo "$error_rate > 0.01" | bc -l) )); then
    echo "❌ Error rate too high: ${error_rate}. Rolling back!"
    kubectl patch virtualservice myapp --type merge -p "
      spec:
        http:
        - route:
          - destination:
              host: myapp
              subset: stable
            weight: 100
    "
    exit 1
  fi
  
  echo "✅ Metrics good at ${weight}% canary"
done

echo "🎉 Canary rollout complete!"
```

**Monitoring during canary:**

```typescript
// metrics.ts - Track canary metrics
import { Counter, Histogram } from 'prom-client';

const errorCounter = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['version', 'status_code']
});

const latencyHistogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['version', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export function recordMetrics(version: string, route: string, statusCode: number, duration: number) {
  if (statusCode >= 500) {
    errorCounter.inc({ version, status_code: statusCode });
  }
  latencyHistogram.observe({ version, route }, duration);
}

// In request handler
app.use((req, res, next) => {
  const start = Date.now();
  const version = process.env.APP_VERSION || 'unknown';
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    recordMetrics(version, req.path, res.statusCode, duration);
  });
  
  next();
});
```

**Key principles:**

- ✅ Start with small percentage (5-10%)
- ✅ Monitor error rates, latency, business metrics
- ✅ Gradually increase if metrics healthy
- ✅ Instant rollback if issues detected
- ✅ Use feature flags or routing rules to control traffic
- ✅ Run for 24h at each stage before increasing

**Trade-offs:**

- **Pros:** Safe gradual rollout, early problem detection, minimal user impact
- **Cons:** Slower rollout, requires sophisticated routing/monitoring, mixed versions in production

---

### Shadow Deployment Pattern

**Problem:** Want to test new version with production traffic without affecting users.

**Solution:** Mirror production traffic to new version, compare responses, but only serve stable version responses to users.

**Implementation with Envoy/Istio:**

```yaml
# shadow-virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp.example.com
  http:
  - route:
    - destination:
        host: myapp
        subset: stable
      weight: 100
    mirror:
      host: myapp
      subset: shadow
    mirrorPercentage:
      value: 100.0  # Mirror 100% of traffic
```

**Response comparison script:**

```python
#!/usr/bin/env python3
# compare-shadow-responses.py

import requests
import json
import sys
import time
from dataclasses import dataclass
from typing import Optional

@dataclass
class ResponseDiff:
    status_match: bool
    body_match: bool
    latency_diff_ms: float
    stable_status: int
    shadow_status: int
    
def compare_responses(endpoint: str, stable_url: str, shadow_url: str) -> ResponseDiff:
    """Send same request to both versions, compare responses."""
    
    # Send to stable
    stable_start = time.time()
    stable_resp = requests.get(f"{stable_url}{endpoint}")
    stable_latency = (time.time() - stable_start) * 1000
    
    # Send to shadow
    shadow_start = time.time()
    shadow_resp = requests.get(f"{shadow_url}{endpoint}")
    shadow_latency = (time.time() - shadow_start) * 1000
    
    return ResponseDiff(
        status_match=stable_resp.status_code == shadow_resp.status_code,
        body_match=stable_resp.text == shadow_resp.text,
        latency_diff_ms=shadow_latency - stable_latency,
        stable_status=stable_resp.status_code,
        shadow_status=shadow_resp.status_code
    )

def main():
    endpoints = ["/api/users", "/api/products", "/api/orders"]
    stable_url = "https://stable.myapp.com"
    shadow_url = "https://shadow.myapp.com"
    
    total_requests = 0
    mismatches = 0
    
    for endpoint in endpoints:
        for _ in range(100):  # Test each endpoint 100 times
            diff = compare_responses(endpoint, stable_url, shadow_url)
            total_requests += 1
            
            if not diff.status_match or not diff.body_match:
                mismatches += 1
                print(f"❌ Mismatch at {endpoint}: stable={diff.stable_status}, shadow={diff.shadow_status}")
            
            if diff.latency_diff_ms > 100:
                print(f"⚠️  Latency regression at {endpoint}: +{diff.latency_diff_ms:.1f}ms")
    
    mismatch_rate = (mismatches / total_requests) * 100
    print(f"\n📊 Results: {mismatches}/{total_requests} mismatches ({mismatch_rate:.2f}%)")
    
    sys.exit(0 if mismatch_rate < 1.0 else 1)

if __name__ == "__main__":
    main()
```

**Key principles:**

- ✅ Users always get stable version response
- ✅ Shadow version receives copy of all production traffic
- ✅ Compare responses, latency, error rates
- ✅ Safe way to test with real production load
- ✅ Catch bugs before actual deployment

**Trade-offs:**

- **Pros:** Zero user risk, test with real traffic, catch production-only bugs
- **Cons:** 2x backend load, no user feedback on shadow version, complex routing setup

---

### Feature Flag Deployment

**Problem:** Want to deploy code without immediately enabling new features.

**Solution:** Wrap new features in runtime flags, deploy code, enable features gradually per user/team/region.

**Implementation:**

```typescript
// feature-flags.ts
interface FeatureFlags {
  newCheckout: boolean;
  aiRecommendations: boolean;
  darkMode: boolean;
}

class FeatureFlagService {
  async getFlags(userId: string): Promise<FeatureFlags> {
    // Check remote config (LaunchDarkly, Flagsmith, etc.)
    const flags = await this.remoteFlagService.getFlags(userId);
    
    // Local overrides for testing
    const localOverrides = this.getLocalOverrides();
    
    return { ...flags, ...localOverrides };
  }
  
  async isEnabled(userId: string, flagName: keyof FeatureFlags): Promise<boolean> {
    const flags = await this.getFlags(userId);
    return flags[flagName] ?? false;
  }
  
  // Percentage rollout
  async isEnabledForPercentage(userId: string, flagName: keyof FeatureFlags, percentage: number): Promise<boolean> {
    const hash = this.hashUserId(userId);
    return (hash % 100) < percentage;
  }
  
  private hashUserId(userId: string): number {
    // Simple hash function for consistent user bucketing
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Usage in application
app.get('/checkout', async (req, res) => {
  const userId = req.user.id;
  const useNewCheckout = await featureFlags.isEnabled(userId, 'newCheckout');
  
  if (useNewCheckout) {
    return res.render('new-checkout');
  }
  
  return res.render('old-checkout');
});
```

**LaunchDarkly example:**

```typescript
import LaunchDarkly from 'launchdarkly-node-server-sdk';

const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY);

await ldClient.waitForInitialization();

const user = {
  key: req.user.id,
  email: req.user.email,
  custom: {
    plan: req.user.plan,
    region: req.user.region
  }
};

const showNewFeature = await ldClient.variation('new-feature', user, false);
```

**Gradual rollout strategy:**

```text
1. Deploy code with feature flag OFF (default: false)
2. Enable for internal users (dev team, QA)
3. Enable for beta users (5% of production users)
4. Monitor metrics for 24-48h
5. Increase to 25% if metrics good
6. Increase to 50% → 100% over next week
7. Remove feature flag after stable for 2 weeks
```

**Key principles:**

- ✅ Deploy code without enabling features
- ✅ Enable features gradually per user cohort
- ✅ Instant disable if issues found
- ✅ A/B test different implementations
- ✅ Clean up old flags after rollout complete

---

### CI/CD Pipeline Optimization

**Problem:** CI/CD pipelines taking too long, blocking deployments.

**Solution:** Parallelize jobs, cache dependencies, optimize Docker builds.

**Optimized GitHub Actions:**

```yaml
# .github/workflows/optimized-deploy.yml
name: Optimized Deploy

on:
  push:
    branches: [main]

jobs:
  # Run lint, test, build in parallel
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/
  
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
  
  # Deploy only after all checks pass
  deploy:
    needs: [lint, test, build]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/myapp \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }}
```

**Docker build optimization:**

```dockerfile
# Multi-stage build with caching
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

CMD ["npm", "start"]
```

**Key optimizations:**

- ✅ Parallelize independent jobs (lint, test, build)
- ✅ Cache dependencies (npm, pip, gem)
- ✅ Use multi-stage Docker builds
- ✅ Cache Docker layers between builds
- ✅ Run only changed tests (if supported)
- ✅ Skip CI for docs-only changes

---

**Note:** Even for simple projects, basic CI/CD (automated tests + deployment) provides significant value. Start simple and expand as needs grow.

---

## See Also

- **[Database Patterns](../backend/database-patterns.md)** - Schema migrations and connection pooling
- **[Security Patterns](security-patterns.md)** - Secret management and HTTPS configuration
- **[Caching Patterns](../backend/caching-patterns.md)** - Cache invalidation during deployments
- **[Error Handling Patterns](../backend/error-handling-patterns.md)** - Production error logging and monitoring
- **[Testing Patterns](../code-quality/testing-patterns.md)** - CI/CD integration and test automation
- **[Observability Patterns](observability-patterns.md)** - Monitoring deployments and rollout health
- **[Disaster Recovery Patterns](disaster-recovery-patterns.md)** - Backup strategies and rollback procedures
