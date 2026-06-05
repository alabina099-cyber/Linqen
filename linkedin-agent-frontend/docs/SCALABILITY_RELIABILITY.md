# Scalability & Reliability — LinkedIn Agent

## 1. Horizontal Scaling

### Architecture

```
┌─────────────────┐
│  Nginx (LB)     │  ← Single entry point on port 80
└────────┬────────┘
         │
   ┌─────┴─────┬─────────┐
   ▼           ▼         ▼
┌──────┐   ┌──────┐  ┌──────┐
│ App1 │   │ App2 │  │ App3 │  ← N Next.js instances (scalable)
└──┬───┘   └──┬───┘  └──┬───┘
   └──────────┼─────────┘
              ▼
        ┌──────────┐
        │ Neon DB  │  ← Shared serverless PostgreSQL
        └──────────┘
```

### Files

- `docker-compose.yml` — Multi-instance orchestration
- `nginx.conf` — Load balancer with `least_conn` algorithm
- `linkedin-agent-frontend/Dockerfile` — App container

### Usage

```bash
# Start with 3 instances of the app
docker-compose up --scale app=3

# Scale up to 5 instances without downtime
docker-compose up -d --scale app=5

# Check load distribution
curl http://localhost/api/health
# Each request returns a different "instance" hostname
```

### Features

- **Least-connection load balancing** — Nginx routes requests to the least busy instance
- **Health checks** — Unhealthy instances automatically removed from pool
- **Static asset caching** — Nginx caches `_next/static/*` for 60 min
- **Request rate limiting** — 100 req/s for API, 50 req/s for pages
- **Stateless app instances** — All state in Neon DB, instances can be added/removed freely
- **Resource limits** — Each instance limited to 1 CPU / 512MB RAM

## 2. Automated Backup & Recovery

### Files

- `scripts/backup.js` — Export all tables to JSON with manifest
- `scripts/restore.js` — Restore from a backup folder

### Usage

```bash
# Manual backup
npm run backup

# Output: backups/backup-2026-05-24T13-30-45/
#   ├── users.json
#   ├── campaigns.json
#   ├── prospects.json
#   ├── ...
#   ├── _schema.json     (table column definitions)
#   └── _manifest.json   (backup metadata + row counts)

# List available backups
npm run restore

# Restore a specific backup
npm run restore backup-2026-05-24T13-30-45
```

### Features

- **9 tables backed up**: users, campaigns, prospects, messages, templates, notifications, linkedin_actions_queue, scheduled_followups, agent_chat_history
- **Manifest with row counts** for verification
- **Schema snapshot** for restore validation
- **Automatic retention** — Backups older than 30 days are deleted (configurable via `BACKUP_RETENTION_DAYS`)
- **JSONB-aware** — Handles JSON columns correctly during restore
- **5-second grace period** before restore overwrites data

### Production Schedule

Configure a cron job for daily backups:

```bash
# Linux/Mac crontab
0 2 * * * cd /path/to/linkedin-agent-frontend && npm run backup

# Windows Task Scheduler — daily at 02:00
```

In addition, **Neon DB provides built-in point-in-time recovery** for the last 7 days as a safety net.

## 3. Real-Time Monitoring

### Endpoints

| Endpoint            | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `GET /api/health`   | Quick health check (DB + memory + pool)       |
| `GET /api/monitoring` | Full system snapshot for dashboards         |
| `GET /api/performance` | Performance metrics (APIs, cache, latency) |

### `/api/monitoring` Response

```json
{
  "timestamp": "2026-05-24T13:45:00Z",
  "uptime": 3600,
  "system": {
    "nodeVersion": "v20.x",
    "memory": { "rss": "187 MB", "heapUsed": "92 MB" },
    "instance": "app-1"
  },
  "database": {
    "latency": 18.4,
    "pool": { "total": 5, "idle": 4, "waiting": 0 },
    "actions": { "pending": 12, "completed": 487, "failed": 3 },
    "prospects": { "identified": 245, "contacted": 132, "responded": 47 },
    "lastHour": [...]
  },
  "performance": {
    "api": { "GET:campaigns": { "avg": 45, "p95": 89 } },
    "cache": { "hits": 487, "misses": 102, "hitRate": "82.69%" }
  },
  "logs": { "stats": { "total": 542, "byLevel": {...} } },
  "extension": {
    "status": "connected",
    "lastAction": "2026-05-24T13:44:30Z",
    "minutesSinceLast": 0,
    "recentActions": 8
  }
}
```

### Structured Logger (`lib/logger.ts`)

Replaces ad-hoc `console.log` with a leveled logger:

- 5 levels: `debug`, `info`, `warn`, `error`, `fatal`
- In-memory buffer of last 1000 entries
- Errors persisted to `error_logs` table for post-mortem analysis
- Configurable minimum level via `LOG_LEVEL` env var

```typescript
import { logger } from "@/lib/logger";

logger.info("Campaign started", { campaignId: 42 });
logger.warn("Rate limit close to threshold", { remaining: 3 });
logger.error("LinkedIn action failed", { actionId: 17, error });
```

## 4. Graceful Handling of LinkedIn Interface Changes

### Resilient Selectors (`linkedin-chrome-extension/selectors.js`)

Each LinkedIn DOM element has **multiple fallback selectors** tried in order:

```javascript
profileName: [
  "h1.text-heading-xlarge",        // Current LinkedIn
  "h1[class*='heading-xlarge']",   // Variant
  ".pv-text-details__left-panel h1", // Old layout
  "h1",                            // Ultimate fallback
]
```

### Strategies

1. **Multi-selector fallback** — When LinkedIn changes a CSS class, the next selector in the list is tried automatically
2. **Text-based fallback** — `findButtonByText()` finds buttons by visible text or `aria-label` (more stable than CSS classes)
3. **Async wait** — `waitForElement()` retries up to 20 times with 500ms delays for slow-loading content
4. **Health check** — `checkSelectorsHealth()` reports which selectors are still working on the current page

### Adapting to Changes

When LinkedIn updates its DOM, only `selectors.js` needs to be updated. No business logic changes required:

```javascript
// Add the new selector at the top of the list
profileName: [
  "h1.new-linkedin-2026-class",  // ← Just add this
  "h1.text-heading-xlarge",
  ...
]
```

## 5. Retry & Recovery Mechanisms

### Existing in `linkedin-chrome-extension/background.js`

- **Stale action recovery** (lines 184-224): Actions stuck in `processing` for >5 minutes are automatically marked as `completed` with a recovery flag
- **Inbox polling** (every 5 min): Detects replies in case real-time messaging fails
- **Connection status polling** (every 2 min): Verifies pending connections were accepted

### Database Connection Pool

`pg.Pool` automatically reconnects on connection loss, retries transient errors, and limits concurrent connections to prevent overload.

## 6. Defense Presentation Guide

1. **Show `docker-compose.yml` + `nginx.conf`** → explain horizontal scaling
2. **Run `docker-compose up --scale app=3`** → demonstrate live scaling
3. **Run `npm run backup`** → show backup output
4. **Open `/api/monitoring`** in browser → show real-time system state
5. **Open `/api/health`** → show health check returning 200 OK
6. **Show `linkedin-chrome-extension/selectors.js`** → explain resilience to LinkedIn changes
7. **Show `lib/logger.ts`** → explain structured logging with DB persistence
