# Observability Patterns

**Purpose:** Provide comprehensive guidance on implementing observability in production systems through logging, metrics, and tracing.

**When to use:** All production systems, microservices architectures, distributed systems, performance troubleshooting.

---

## Quick Reference

| Pattern | Use Case | Tools | Complexity |
| ------- | -------- | ----- | ---------- |
| Structured Logging | Searchable, queryable logs | ELK, Splunk, Datadog | Low |
| Metrics Collection | System health, performance trends | Prometheus, Grafana, CloudWatch | Medium |
| Distributed Tracing | Request flow across services | Jaeger, Zipkin, Tempo | High |
| APM (Application Performance Monitoring) | End-to-end performance | New Relic, Dynatrace, Datadog APM | Medium |
| Log Aggregation | Centralized log search | Elasticsearch, Loki, CloudWatch Logs | Medium |
| Alerting | Proactive incident detection | Alertmanager, PagerDuty, Opsgenie | Low |

---

## The Three Pillars of Observability

Observability is built on three complementary data sources:

### 1. Logs - What happened

**Purpose:** Discrete events with context about system state changes.

**Best practices:**

- Use structured logging (JSON) for machine-readability
- Include correlation IDs for request tracing
- Set appropriate log levels (DEBUG, INFO, WARN, ERROR)
- Never log sensitive data (passwords, tokens, PII)
- Add contextual metadata (user_id, request_id, service_name)

**Example - Structured logging (Node.js with Winston):**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.Console()
  ]
});

// Good: Structured log with context
logger.info('User login successful', {
  user_id: '12345',
  request_id: 'req-abc-123',
  ip_address: '192.168.1.1',
  auth_method: 'oauth2'
});

// Bad: Unstructured string
logger.info(`User 12345 logged in from 192.168.1.1`);
```

**Example - Python structured logging:**

```python
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
        }
        # Extract custom fields from record.__dict__ (passed via logger's extra parameter)
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName',
                          'levelname', 'levelno', 'lineno', 'module', 'msecs',
                          'message', 'pathname', 'process', 'processName', 'relativeCreated',
                          'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info']:
                log_data[key] = value
        return json.dumps(log_data)

logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage with context
logger.info('Database query executed', extra={
    'query_time_ms': 145,
    'table': 'users',
    'rows_affected': 1,
    'request_id': 'req-xyz-789'
})
```

### 2. Metrics - How much and how often

**Purpose:** Numeric measurements aggregated over time to track trends and patterns.

**Key metric types:**

- **Counters:** Monotonically increasing values (total requests, errors)
- **Gauges:** Point-in-time values (CPU usage, memory, active connections)
- **Histograms:** Distribution of values (request duration, response sizes)
- **Summaries:** Similar to histograms with configurable quantiles

**Example - Prometheus metrics (Go):**

```go
package main

import (
    "fmt"
    "net/http"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    activeConnections = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func metricsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        activeConnections.Inc()
        defer activeConnections.Dec()
        
        // Wrap ResponseWriter to capture status code
        wrappedWriter := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        
        // Call the actual handler
        next(wrappedWriter, r)
        
        duration := time.Since(start).Seconds()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, fmt.Sprintf("%d", wrappedWriter.statusCode)).Inc()
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/api/users", metricsMiddleware(handleUsers))
    http.ListenAndServe(":8080", nil)
}
```

**Example - Custom metrics with StatsD (Node.js):**

```javascript
const StatsD = require('node-statsd');
const client = new StatsD({ host: 'localhost', port: 8125 });

class MetricsService {
  // Increment counter
  incrementCounter(metric, tags = {}) {
    client.increment(metric, 1, tags);
  }
  
  // Record timing
  recordTiming(metric, duration, tags = {}) {
    client.timing(metric, duration, tags);
  }
  
  // Set gauge value
  setGauge(metric, value, tags = {}) {
    client.gauge(metric, value, tags);
  }
  
  // Track function execution time
  async trackExecution(metricName, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordTiming(metricName, duration, { status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordTiming(metricName, duration, { status: 'error' });
      this.incrementCounter(`${metricName}.error`);
      throw error;
    }
  }
}

// Usage
const metrics = new MetricsService();

app.get('/api/orders/:id', async (req, res) => {
  await metrics.trackExecution('api.orders.get', async () => {
    const order = await db.getOrder(req.params.id);
    metrics.setGauge('orders.active', await db.countActiveOrders());
    return res.json(order);
  });
});
```

### 3. Traces - Where time was spent

**Purpose:** Track request flow across distributed services to identify bottlenecks.

**Concepts:**

- **Trace:** End-to-end journey of a request through the system
- **Span:** Single operation within a trace (function call, DB query, HTTP request)
- **Context Propagation:** Passing trace/span IDs between services

**Example - OpenTelemetry tracing (Python):**

```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from flask import Flask
import requests

# Initialize tracing
trace.set_tracer_provider(
    TracerProvider(
        resource=Resource.create({SERVICE_NAME: "order-service"})
    )
)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Auto-instrument Flask and requests
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.route('/orders/<order_id>')
def get_order(order_id):
    # Create custom span for business logic
    with tracer.start_as_current_span("fetch_order_details") as span:
        span.set_attribute("order.id", order_id)
        
        # Fetch from database (auto-instrumented if using instrumented driver)
        order = fetch_from_db(order_id)
        span.set_attribute("order.status", order['status'])
        
        # Call external service (auto-traced by RequestsInstrumentor)
        with tracer.start_as_current_span("fetch_customer_info"):
            customer = requests.get(f"http://customer-service/api/customers/{order['customer_id']}").json()
        
        # Add event to span
        span.add_event("Order processing completed", {
            "order.total": order['total'],
            "customer.tier": customer['tier']
        })
        
        return {"order": order, "customer": customer}

def fetch_from_db(order_id):
    with tracer.start_as_current_span("db.query") as span:
        # SECURITY: Always use parameterized queries, never interpolate values into SQL
        # PostgreSQL uses %s placeholders (psycopg2) or $1 (asyncpg)
        span.set_attribute("db.statement", "SELECT * FROM orders WHERE id = %s")
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", "SELECT")
        # Actual DB query here (using parameterized query to prevent SQL injection)
        # cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        return {"id": order_id, "status": "shipped", "customer_id": "123", "total": 99.99}
```

**Example - Distributed tracing context propagation (Node.js):**

```javascript
const { trace, context, propagation } = require('@opentelemetry/api');
const axios = require('axios');

class TracingService {
  // Extract trace context from incoming request
  extractContext(req) {
    return propagation.extract(context.active(), req.headers);
  }
  
  // Inject trace context into outgoing request
  injectContext(headers = {}) {
    const ctx = context.active();
    propagation.inject(ctx, headers);
    return headers;
  }
  
  // Make traced HTTP call
  async tracedHttpCall(url, options = {}) {
    const tracer = trace.getTracer('http-client');
    
    return tracer.startActiveSpan(`HTTP ${options.method || 'GET'}`, async (span) => {
      try {
        span.setAttribute('http.url', url);
        span.setAttribute('http.method', options.method || 'GET');
        
        // Inject trace context into headers
        const headers = this.injectContext(options.headers || {});
        
        const response = await axios({ url, ...options, headers });
        
        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: 0 }); // OK
        
        return response.data;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

// Usage in Express middleware
app.use((req, res, next) => {
  const tracingService = new TracingService();
  const extractedContext = tracingService.extractContext(req);
  
  context.with(extractedContext, () => {
    const tracer = trace.getTracer('api-server');
    const span = tracer.startSpan(`${req.method} ${req.path}`);
    
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      span.end();
    });
    
    next();
  });
});
```

---

## Alerting Strategies

**Purpose:** Proactive notification of issues before they impact users.

### Alert Design Principles

1. **Alert on symptoms, not causes:** Alert on "API response time > 2s" not "CPU > 80%"
2. **Reduce noise:** Every alert should be actionable
3. **Set appropriate thresholds:** Use percentiles (p95, p99) not averages
4. **Include context:** Alert messages should have enough info to start debugging
5. **Escalation policies:** Define who gets notified and when

### Example - Prometheus AlertManager rules

```yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # Symptom-based alert
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High API latency detected"
          description: "95th percentile latency is {{ $value }}s (threshold: 2s) on {{ $labels.instance }}"
          runbook_url: "https://wiki.company.com/runbooks/high-api-latency"
      
      # Error rate alert
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
          page: true
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook_url: "https://wiki.company.com/runbooks/high-error-rate"
      
      # Resource saturation alert
      - alert: ServiceDown
        expr: up{job="api-server"} == 0
        for: 1m
        labels:
          severity: critical
          team: backend
          page: true
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
          runbook_url: "https://wiki.company.com/runbooks/service-down"
```

### Example - Dynamic threshold alerting (Python)

```python
import numpy as np
from datetime import datetime, timedelta

class AnomalyDetector:
    """Detect anomalies using statistical methods"""
    
    def __init__(self, window_size=100, threshold_stddev=3):
        self.window_size = window_size
        self.threshold_stddev = threshold_stddev
        self.values = []
    
    def add_value(self, value):
        """Add new metric value and check for anomaly"""
        self.values.append(value)
        if len(self.values) > self.window_size:
            self.values.pop(0)
        
        if len(self.values) < 10:
            return False  # Not enough data
        
        mean = np.mean(self.values)
        stddev = np.std(self.values)
        
        # Check if current value is anomalous
        z_score = abs((value - mean) / stddev) if stddev > 0 else 0
        is_anomaly = z_score > self.threshold_stddev
        
        if is_anomaly:
            return {
                'is_anomaly': True,
                'value': value,
                'mean': mean,
                'stddev': stddev,
                'z_score': z_score,
                'threshold': self.threshold_stddev
            }
        
        return {'is_anomaly': False}

# Usage
detector = AnomalyDetector(window_size=100, threshold_stddev=3)

def check_metric(metric_name, current_value):
    result = detector.add_value(current_value)
    
    if result.get('is_anomaly'):
        send_alert(
            title=f"Anomaly detected: {metric_name}",
            description=f"Value {result['value']:.2f} is {result['z_score']:.1f} standard deviations from mean {result['mean']:.2f}",
            severity='warning'
        )
```

---

## Runbooks

**Purpose:** Standardized procedures for responding to alerts and incidents.

### Runbook Template

```text
# Runbook: High API Latency

## Alert Details
- **Alert Name:** HighAPILatency
- **Severity:** Warning
- **Team:** Backend
- **On-Call:** backend-oncall@company.com

## Symptoms
- API response times exceed 2 seconds (p95)
- Users experience slow page loads
- Timeout errors may occur

## Investigation Steps

1. **Check service health**
   
   kubectl get pods -n production
   curl https://api.company.com/health

2. **Check current latency**
   - Open Grafana: https://grafana.company.com/d/api-latency
   - Check p50, p95, p99 latencies
   - Identify which endpoints are slow

3. **Check dependencies**
   - Database: Check slow query log
   - External APIs: Check status pages
   - Redis: Check connection count and memory

4. **Check recent deployments**

   kubectl rollout history deployment/api-server -n production

## Common Causes

| Cause | How to Check | Fix |
| ----- | ------------ | --- |
| Database slow queries | Check pg_stat_statements | Add indexes, optimize queries |
| High traffic | Check request rate in Grafana | Scale horizontally |
| Memory leak | Check pod memory usage | Restart pods, investigate code |
| External API timeout | Check external service status | Increase timeout, add circuit breaker |
| Unoptimized code | Check APM traces | Optimize hot paths, add caching |

## Immediate Actions

### If latency > 5 seconds (Critical)

# Scale up immediately
kubectl scale deployment/api-server --replicas=10 -n production

# Check if helps within 2 minutes
# If not, consider rollback
kubectl rollout undo deployment/api-server -n production

### If latency 2-5 seconds (Warning)

- Monitor for 5 more minutes
- Investigate root cause
- Prepare to scale if worsens

## Resolution Steps

1. Identify root cause using investigation steps
2. Apply fix (code change, scaling, config update)
3. Verify latency returns to normal (< 1s p95)
4. Document incident in post-mortem template

## Post-Incident

- Create post-mortem document
- Identify action items to prevent recurrence
- Update this runbook if new information discovered

## Related Links

- API Performance Dashboard: https://grafana.company.com/d/api-perf
- Database Monitoring: https://grafana.company.com/d/db-monitor
- Post-Mortem Template: https://wiki.company.com/templates/post-mortem
```

---

## Debugging Production Issues

### Correlation IDs

**Purpose:** Track a single request across multiple services.

**Implementation:**

```typescript
// middleware/correlation-id.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract from header or generate new
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Store in request context
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-Id', correlationId);
  
  // Add to all log statements
  req.log = req.log.child({ correlation_id: correlationId });
  
  next();
};

// Usage in service calls
async function callDownstreamService(url: string, data: any, req: Request) {
  return axios.post(url, data, {
    headers: {
      'X-Correlation-Id': req.correlationId
    }
  });
}
```

### Log Sampling

**Purpose:** Reduce log volume while maintaining visibility into issues.

```python
import random
from functools import wraps

class SamplingLogger:
    def __init__(self, logger, sample_rate=0.1):
        self.logger = logger
        self.sample_rate = sample_rate
        self.error_buffer = []
        self.error_buffer_size = 100
    
    def should_sample(self, level):
        # Always log errors and warnings
        if level in ['ERROR', 'WARNING']:
            return True
        
        # Sample INFO and DEBUG based on rate
        return random.random() < self.sample_rate
    
    def log(self, level, message, **kwargs):
        if self.should_sample(level):
            self.logger.log(level, message, **kwargs)
        
        # Buffer errors for debugging
        if level == 'ERROR':
            self.error_buffer.append({
                'timestamp': datetime.utcnow(),
                'message': message,
                'context': kwargs
            })
            if len(self.error_buffer) > self.error_buffer_size:
                self.error_buffer.pop(0)
    
    def get_recent_errors(self, count=10):
        return self.error_buffer[-count:]

# Decorator for sampling function calls
def sample_logs(sample_rate=0.1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if random.random() < sample_rate:
                logger.info(f"Calling {func.__name__}", extra={
                    'args': str(args)[:100],
                    'kwargs': str(kwargs)[:100]
                })
            return func(*args, **kwargs)
        return wrapper
    return decorator

@sample_logs(sample_rate=0.05)  # Log 5% of calls
def process_order(order_id):
    # Business logic
    pass
```

---

## OpenTelemetry Integration

**Purpose:** Unified observability with vendor-neutral instrumentation.

### Complete setup example (Node.js)

```javascript
// tracing.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

function initTracing() {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'my-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
  });

  // Configure Jaeger exporter
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
  provider.register();

  // Auto-instrument common libraries
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  console.log('Tracing initialized');
}

module.exports = { initTracing };
```

---

## Common Mistakes

1. **Logging too much:** Excessive DEBUG logs in production slow systems and increase costs
   - **Fix:** Use log sampling or dynamic log levels

2. **Not using correlation IDs:** Impossible to trace requests across services
   - **Fix:** Generate/propagate correlation IDs in all requests

3. **Alerting on everything:** Alert fatigue leads to ignored critical alerts
   - **Fix:** Alert only on actionable issues with clear runbooks

4. **Ignoring cardinality:** High-cardinality labels (user IDs) explode metric storage
   - **Fix:** Use labels sparingly, aggregate user-level data separately

5. **No runbooks:** Alerts fire but no one knows how to respond
   - **Fix:** Create runbooks for all critical alerts

6. **Averages hide problems:** Average latency looks fine while p99 is terrible
   - **Fix:** Use percentiles (p50, p95, p99) for latency metrics

7. **Missing context in logs:** Logs don't have enough information to debug
   - **Fix:** Add request ID, user ID, service name to all logs

8. **Vendor lock-in:** Using proprietary instrumentation makes migration hard
   - **Fix:** Use OpenTelemetry for vendor-neutral observability

---

## See Also

- **[deployment-patterns.md](./deployment-patterns.md)** - Deployment strategies and CI/CD
- **[security-patterns.md](./security-patterns.md)** - Security best practices
- **[state-management-patterns.md](./state-management-patterns.md)** - Managing distributed state
- **[testing-patterns.md](../code-quality/testing-patterns.md)** - Testing strategies
