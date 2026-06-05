# Performance Testing Guide — LinkedIn Agent

This document describes how performance is measured, monitored, and optimized in the LinkedIn Agent platform.

## 1. Performance Optimizations Implemented

### 1.1 In-Memory Cache (`lib/cache.ts`)
A lightweight TTL-based cache that reduces database load for frequently accessed data (campaigns, stats, prospect lists).

- **TTL-based expiration** (default 60s, configurable per key)
- **Pattern-based invalidation** when data changes
- **Hit/miss statistics** exposed via `/api/performance`
- **Automatic cleanup** of expired entries every 5 minutes

### 1.2 Performance Monitoring (`lib/performance-monitor.ts`)
Records the latency of every wrapped operation and computes aggregate statistics.

- **Per-operation metrics**: count, avg, min, max, p95
- **Slow query warnings** logged to console when an operation exceeds 500 ms
- **Bounded history** (last 1000 metrics) to avoid memory leaks
- **`measure()` helper** to wrap any async function

### 1.3 Rate Limiter (`lib/rate-limiter.ts`)
Enforces LinkedIn's daily and hourly limits to prevent account restrictions while maintaining throughput.

### 1.4 Database Optimizations (`db/schema.sql`)
Indexes on the columns most frequently used in WHERE clauses:

- `idx_notifications_user_id`, `idx_notifications_read`
- `idx_campaigns_status`
- `idx_messages_campaign_id`, `idx_messages_prospect_id`
- `idx_prospects_status`, `idx_prospects_score`, `idx_prospects_industry`
- `idx_agent_chat_user`
- `idx_templates_tag`

### 1.5 Connection Pooling
The PostgreSQL pool (`lib/db.ts`) reuses connections to Neon DB, reducing handshake overhead on every request.

## 2. Monitoring Endpoint

`GET /api/performance` returns a JSON snapshot:

```json
{
  "api": {
    "responseTime": 12.34,
    "operations": {
      "api:campaigns": { "count": 152, "avg": 45.2, "p95": 89.1 }
    }
  },
  "cache": { "size": 23, "hits": 487, "misses": 102, "hitRate": "82.69%" },
  "database": {
    "status": "ok",
    "latency": 18.4,
    "poolStats": { "total": 5, "idle": 4, "waiting": 0 }
  },
  "memory": { "rss": "187 MB", "heapUsed": "92 MB", "heapTotal": "118 MB" }
}
```

`DELETE /api/performance` resets metrics and the cache.

## 3. Benchmark Script

Measures response time and throughput per endpoint.

```bash
npm run benchmark
# or with custom parameters
ITERATIONS=50 CONCURRENCY=10 BASE_URL=http://localhost:3000 npm run benchmark
```

Output:

```
Endpoint                       OK/Total   Avg    P50    P95    P99    Req/s
GET /api/campaigns             20/20      42ms   38ms   78ms   95ms   118
GET /api/prospects             20/20      67ms   62ms   124ms  145ms  74
GET /api/stats                 20/20      28ms   25ms   45ms   52ms   178
```

## 4. Load Test Script

Simulates concurrent virtual users for a fixed duration.

```bash
npm run load-test
# or with custom parameters
USERS=20 DURATION=60 npm run load-test
```

Output:

```
Total requests:    1842
Successful:        1842 (100.00%)
Failed:            0 (0.00%)
Throughput:        61.40 req/s

Latency:
  avg:   83.42ms
  p50:   72.18ms
  p95:   178.45ms
  p99:   245.10ms
```

## 5. Performance Targets

| Metric                | Target    |
| --------------------- | --------- |
| API avg response time | < 200 ms  |
| API P95 response time | < 500 ms  |
| API P99 response time | < 1000 ms |
| Cache hit rate        | > 70 %    |
| DB query latency      | < 100 ms  |
| Error rate under load | < 1 %     |

## 6. How to Use During the Defense

1. Start the app: `npm run dev`
2. Open `http://localhost:3000/api/performance` to show live metrics
3. Run `npm run benchmark` in another terminal to demonstrate per-endpoint latency
4. Run `npm run load-test` to demonstrate behavior under concurrent load
5. Reload `/api/performance` afterward to show updated cache hit rate and operation stats
