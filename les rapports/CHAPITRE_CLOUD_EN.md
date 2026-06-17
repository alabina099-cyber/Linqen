# Chapter: Cloud Infrastructure & DevOps

## 1. Context and Problem Statement

### 1.1 Why a cloud infrastructure?

The LinkedIn Agent we developed is a critical system composed of three parts:

- A **web application** (Next.js) for campaign management
- A **worker** (Node.js + Puppeteer) to execute LinkedIn actions
- A **Chrome extension** for user interaction

These components must run **24/7**: the worker continuously polls an action queue, the web application must remain accessible, and data (prospects, actions, campaigns) must persist reliably.

Without cloud infrastructure:

- The application would be local and inaccessible to users
- The worker would stop as soon as the machine is shut down
- No guarantee of availability, backups, or monitoring

### 1.2 Project Constraints

| Constraint                                         | Impact on choices                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Budget **€0**                                      | Entirely free stack (Oracle Free Tier, Neon, Cloudflare R2)         |
| Limited technical skills                           | Choice of simple-to-deploy tools (Coolify vs Kubernetes)            |
| Sensitive data (LinkedIn passwords, emails)        | Backup encryption + endpoint authentication                         |
| Potential scalability                              | Horizontally scalable multi-container architecture                  |

### 1.3 Infrastructure Objectives

1. **High availability**: the application and worker must never stop simultaneously
2. **Automated CI/CD**: one-click deployment from `git push` on `main`
3. **Full observability**: metrics, logs, alerting, health checks
4. **Resilience**: automatic rollback on failed deployment
5. **Security**: vulnerability scanning, authentication, least privilege
6. **Zero cost**: €0/month

---

## 2. Global Architecture

### 2.1 Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Actions (CI/CD)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │   ci.yml    │ │ security.yml│ │  deploy.yml  │ │  backup.yml (cron) │  │
│  │ Lint+Test   │ │ Trivy+Semgr │ │ Build+Push+  │ │  GPG+R2 daily      │  │
│  └─────────────┘ └─────────────┘ │ Migrate+Smoke│ └────────────────────┘  │
│                                    │ Rollback     │                         │
│  ┌─────────────┐ ┌─────────────┐  └──────────────┘ ┌────────────────────┐  │
│  │ chrome-ext  │ │ worker-ci   │  │ deploy-stg   │  │  e2e.yml           │  │
│  │   -ci.yml   │ │             │  │ lighthouse   │  │  backup-restore    │  │
│  │             │ │             │  │              │  │  -test.yml         │  │
│  └─────────────┘ └─────────────┘  └──────────────┘  └────────────────────┘  │
└────────────────────────────────────────┬────────────────────────────────────┘
                                           │ push images
                                           ▼
                              ┌────────────────────┐
                              │   ghcr.io (GHCR)   │
                              │  Docker Registry   │
                              │  Frontend + Worker │
                              └────────┬───────────┘
                                       │ pull
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Oracle Cloud VM (Always Free — ARM A1.Flex)              │
│                     4 vCPU ARM + 24 GB RAM + 200 GB SSD                      │
│                                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────────────────┐ │
│   │  nginx   │   │ Next.js  │   │  Worker  │   │  Observability Stack   │ │
│   │  Load    │   │ Frontend │   │ Puppeteer│   │  Prometheus + Grafana  │ │
│   │ Balancer │   │  + BI    │   │  × M     │   │  Loki + Promtail       │ │
│   │  :80     │   │ Dashboard│   │  :9090   │   │  Uptime Kuma           │ │
│   │          │   │  :3000   │   │          │   │  cAdvisor + NodeExport │ │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────────────────────────┘ │
│        │              │              │                                        │
│        └──────────────┴──────────────┘                                        │
│                                                                              │
│   Coolify (self-hosted PaaS) manages Docker deployments                      │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │   Neon PostgreSQL   │
                           │  Serverless (Free)  │
                           │    500 MB SSD       │
                           └─────────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │   Cloudflare R2     │
                           │  Encrypted Backups  │
                           │   (10 GB free)      │
                           └─────────────────────┘
```

> **Note on BI Dashboard:** The Business Intelligence module (KPIs, geo analytics, forecast, conversion funnel, agent analytics) is integrated into the Next.js frontend and shares the same Neon database. It exposes 6 dedicated API endpoints (`/api/bi/*`) and is automatically deployed with the frontend via the same Docker container.

### 2.2 Justified Technology Choices

| Component                | Choice                              | Rejected Alternative       | Why this choice                                                                                          |
| ------------------------ | ----------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Cloud Provider**       | Oracle Cloud Always Free            | AWS/GCP/Azure Free Tier    | ARM A1.Flex = 4 CPU + 24 GB permanently free (superior to AWS/GCP offers)                               |
| **PaaS / Orchestrator**  | Coolify (self-hosted)               | Kubernetes, Docker Swarm   | Coolify delivers Vercel/Render-like experience without K8s complexity. Deployment in 2 clicks via webhooks |
| **Reverse Proxy**        | nginx                               | Traefik, Apache            | Lightweight, simple configuration, built-in load balancing, de facto standard                           |
| **Database**             | Neon PostgreSQL (Free)              | Supabase, PlanetScale, RDS | Serverless, instant branch, 500 MB free, connection without IP whitelist                                 |
| **Registry**             | GitHub Container Registry (GHCR)    | Docker Hub, ECR            | Native GitHub Actions integration, free for public, no rate-limit                                       |
| **CI/CD**                | GitHub Actions                      | GitLab CI, CircleCI        | Free (2000 min/month), parallel job matrix, native GHCR integration                                     |
| **Monitoring**           | Prometheus + Grafana + Alertmanager | Datadog, New Relic         | Free, open-source, no time-series limit, native alerting                                                 |
| **Logs**                 | Loki + Promtail                     | ELK, Splunk                | Loki is "Prometheus for logs" — same query language, efficient storage                                   |
| **Backups**              | rclone → Cloudflare R2              | S3, Google Cloud Storage   | R2 = €0 egress, 10 GB free, S3-compatible API                                                           |

### 2.3 Nginx Configuration: Load Balancer and Hardening

The `nginx.conf` file configures a reverse proxy with the following characteristics:

| Feature                   | Implementation                                                                | Source file              |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| **Load balancing**        | `least_conn` algorithm routes to the least busy instance                      | `nginx.conf:30-35`       |
| **API rate limiting**     | 100 requests/second per IP, burst of 20                                       | `nginx.conf:26,61`       |
| **General rate limiting** | 50 requests/second per IP, burst of 20                                        | `nginx.conf:27,86`       |
| **Asset cache**           | 1 GB max, TTL 60 min for `/_next/static/`                                     | `nginx.conf:38-39,76-82` |
| **Security headers**      | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | `nginx.conf:46-48`       |
| **Nginx health check**    | `/health` endpoint returning `200 OK`                                         | `nginx.conf:53-57`       |
| **Proxy headers**         | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`                           | `nginx.conf:67-69,91-92` |
| **Max body size**         | 10 MB (`client_max_body_size`)                                                | `nginx.conf:50`          |

### 2.4 Docker Compose: Health Checks and Resource Limits

The `docker-compose.yml` file defines operational controls for each service:

| Service                                         | Health Check                                  | CPU/RAM Limits       | Start Period |
| ----------------------------------------------- | --------------------------------------------- | -------------------- | ------------ |
| **nginx**                                       | `wget` on `/health` every 30s                 | Not defined          | —            |
| **app (Next.js)**                               | `wget` on `:3000/api/health` every 30s        | 1.0 CPU / 512 MB max | 40s          |
| **worker (Puppeteer)**                          | `wget` on `:9090/health` every 30s            | 1.0 CPU / 1 GB max   | 30s          |
| **postgres** _(profile `local-db` only)_        | `pg_isready` every 10s                        | Not defined          | —            |

> **Note:** In production, the database is **Neon PostgreSQL serverless** (managed, external). The `postgres` service in `docker-compose.yml` is only activated in local dev via the `local-db` profile.

**Restart policy:** `restart: unless-stopped` on all services (nginx, app, worker, postgres), ensuring containers automatically restart after a crash unless manually stopped.

**Secret injection:** Sensitive variables (`DATABASE_URL`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`) are injected at runtime via the Docker environment, never baked into the image. A documented `.env.example` file at the repo root lists all required variables.

**Docker Compose profiles:** Observability services (Prometheus, Grafana, Loki, etc.) are isolated via `profiles: ["observability"]` and only start with `docker compose --profile observability up -d`. The local Postgres service is isolated via `profiles: ["local-db"]`. This separation allows starting only app + worker in production without embedding the monitoring stack on the same machine.

### 2.5 Multi-Stage Dockerfiles: Optimization and Security

Both applications (`frontend` and `worker`) use **multi-stage Dockerfiles** to minimize final image size and apply the principle of least privilege.

| Image                | Base             | Stages                               | Final size              | Runtime user                  |
| -------------------- | ---------------- | ------------------------------------ | ----------------------- | ----------------------------- |
| **Frontend Next.js** | `node:22-alpine` | 4 (`base → deps → builder → runner`) | ~180 MB                 | `nextjs` (UID 1001, non-root) |
| **Worker Puppeteer** | `node:20-alpine` | 2 (`builder → runner`)               | ~420 MB (with Chromium) | `worker` (UID 1001, non-root) |

**Key optimizations:**

- **Next.js standalone output** (`output: 'standalone'`) — bundles only strictly necessary runtime dependencies (no `devDependencies`)
- **Worker**: Chromium installed via Alpine system package (`apk add chromium`) instead of downloading the Puppeteer binary (~150 MB saved). Variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` + `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- **Multi-arch buildx**: QEMU emulates ARM64 on GitHub x86 runners → images compatible with Oracle Cloud A1.Flex (ARM)
- **GitHub Actions build cache** (`cache-from: type=gha, scope=frontend`) → builds 3-5× faster after first run
- **Non-root user**: `addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs` then `USER nextjs` at the end → if the app is compromised, the attacker has no root privileges on the container

### 2.6 HTTPS / TLS: Encrypting Traffic in Transit

All external connections to the application are encrypted with **TLS 1.2/1.3** (Mozilla "Intermediate" 2024 configuration):

| Aspect                  | Implementation                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Protocols**           | TLS 1.2 and TLS 1.3 only (TLS 1.0/1.1/SSL disabled)                              |
| **Cipher suites**       | ECDHE + AES-GCM + ChaCha20-Poly1305 (mandatory forward secrecy)                  |
| **HTTP→HTTPS redirect** | Port 80 returns `301 Moved Permanently` to `https://`                            |
| **HSTS**                | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2 yrs) |
| **OCSP Stapling**       | Enabled to reduce certificate verification latency                                |
| **HTTP/2**              | Enabled on port 443 (`http2 on`)                                                  |
| **Certificate**         | Let's Encrypt via Certbot (auto-renewed every 60 days)                            |
| **ACME challenge**      | Webroot HTTP-01 (`/.well-known/acme-challenge/`) served on port 80                |
| **Alternative**         | Cloudflare Origin Certificate (15 years) in SSL/TLS Full (strict) mode           |

**Additional security headers** (sent on all HTTPS responses):

- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff` (anti MIME-sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` (disables sensitive browser APIs)

> **Expected score on SSL Labs / Mozilla Observatory: A+** (configuration validated against Mozilla SSL 2024 recommendations).

---

## 3. CI/CD Pipeline: From `git push` to Production Deployment

### 3.1 Philosophy: "Shift Left" Security

The **Shift Left** principle consists of detecting problems as early as possible in the pipeline. No vulnerable or untested code should ever reach production.

**Full pipeline (`deploy.yml`):**

```
git push main
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Build & Push Docker Images (Frontend + Worker)                     │
│ ─ Multi-architecture: linux/amd64 + linux/arm64 (QEMU + Buildx)           │
│ ─ Frontend image: ghcr.io/<user>/<repo>:sha-XXXXX                         │
│ ─ Worker image:   ghcr.io/<user>/<repo>-worker:sha-XXXXX                  │
│ ─ Buildx GHA cache to speed up builds                                     │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Vulnerability Scan (Trivy — BLOCKING)                              │
│ ─ CRITICAL scan → exit-code 1 (blocks pipeline if vulnerability found)    │
│ ─ HIGH + CRITICAL scan → audit (non-blocking but reported in GitHub Sec)  │
│ ─ SARIF scan → upload to GitHub Security tab                              │
│ ─ BOTH images scanned (frontend + worker) via matrix strategy             │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Database Migrations                                                │
│ ─ Idempotent script with SHA-256 checksum per file                        │
│ ─ Postgres advisory lock (`pg_try_advisory_lock`)                         │
│ → prevents 2 concurrent executions (e.g. 2 overlapping workflows)        │
│ ─ Expand/contract rule: each migration stays backward-compatible          │
│   with the previous code version for ~60s                                 │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Coolify Deployment (Frontend + Worker)                             │
│ ─ Coolify webhook with 3× retry (10s backoff)                             │
│ ─ Snapshot of previous SHA via `/api/health` for future rollback          │
│ ─ BOTH resources (app + worker) triggered in parallel                     │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Post-Deployment Smoke Test                                         │
│ ─ 10 attempts × 30s on `/api/health`                                      │
│ ─ Verifies the new version responds correctly                             │
│ ─ If OK → marks SHA as "successfully deployed" (GitHub variable)          │
│ ─ If KO → triggers automatic rollback                                     │
└────────────────────────────────────────────────────────────────────────────┘
│
├──▶ ✅ Success → Mark `LAST_DEPLOYED_SHA` → Pipeline complete
│
└──▶ ❌ Failure → Automatic rollback
│
▼
┌─────────────────────────────────────────────────────────┐
│ ROLLBACK: Coolify API (PATCH + Redeploy)                │
│ ─ Retrieves previous SHA (health → fallback variable)   │
│ ─ PATCH `docker_registry_image_tag` → previous SHA      │
│ ─ POST `/api/v1/deploy?force=true`                      │
│ → Back to stable version in < 2 minutes                │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Why This Pipeline Is Professional

| Characteristic                    | Concrete benefit                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| **Multi-arch ARM/AMD64**          | Image runs equally on Oracle ARM (free) and x86 (CI/local)                              |
| **Blocking CRITICAL scan**        | No image with a critical CVE can reach production                                        |
| **Migrations with advisory lock** | 2 overlapping workflows cannot corrupt the database                                      |
| **Smoke test + rollback**         | If deployment breaks the app, the system automatically reverts to the stable version     |
| **SHA tracking**                  | We know exactly which commit is running in prod, enabling a precise rollback             |
| **3× webhook retry**              | Avoids false-positive deployment failures caused by a temporary network timeout          |

### 3.3 Additional Workflows

In addition to the main pipeline (`deploy.yml`), several specialized workflows run in parallel:

| Workflow                  | Trigger                                    | Role                                                              |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `ci.yml`                  | `push` / `PR` on `main`/`develop`          | ESLint + strict TypeScript (`tsc --noEmit`) + Vitest unit tests   |
| `security.yml`            | `push` + weekly `cron` (Mon 6h UTC)        | npm audit + Trivy (vuln/secret/misconfig) + Semgrep + Gitleaks    |
| `chrome-extension-ci.yml` | `push` on `linkedin-chrome-extension/**`   | Lint, build and package validation of the Chrome extension        |
| `worker-ci.yml`           | `push` on `linkedin-agent-worker/**`       | Build and tests of the Puppeteer worker (TypeScript compile)      |
| `deploy-staging.yml`      | `push` on `develop`                        | Automatic deployment to the staging environment                   |
| `e2e.yml`                 | `push` on `main`                           | End-to-End tests with Playwright (headless Chromium)              |
| `lighthouse.yml`          | `push` on `main`                           | Lighthouse performance audit of the frontend (Perf/A11y/SEO)     |
| `backup-restore-test.yml` | Weekly `cron` (Sunday 3h UTC)              | Restore latest backup on disposable Postgres + verifications      |

---

## 4. Observability: "You Can't Improve What You Don't Measure"

### 4.1 The Full Stack

| Service           | Role                                   | What it measures                                                     |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------- |
| **Prometheus**    | Metrics collector (time-series)        | Uptime, memory, DB pool, processed actions, active workers           |
| **Grafana**       | Visualization & Dashboards             | Pre-provisioned dashboards: app health, worker status, queue depth   |
| **Alertmanager**  | Alert routing                          | Sends alerts to Discord based on severity                            |
| **Loki**          | Log aggregation                        | Centralizes logs from all containers                                 |
| **Promtail**      | Log collection agent                   | Pushes Docker logs to Loki                                           |
| **Uptime Kuma**   | External monitoring (blackbox)         | HTTPS ping from outside, detects network outages                     |
| **cAdvisor**      | Docker container metrics               | CPU/RAM/disk per container                                           |
| **Node Exporter** | VM system metrics                      | CPU/RAM/disk of the Oracle VM itself                                 |

### 4.2 The 10 Defined Alert Rules

```yaml
# Excerpt from observability/alerts.yml
groups:
  - name: app-health
    rules:
      - alert: AppDown        # CRITICAL — app no longer responding
        expr: up == 0
        for: 2m
      - alert: DatabaseDown   # CRITICAL — DB unreachable
        expr: db_up == 0
        for: 2m
      - alert: HighMemoryUsage # WARNING — heap > 90%
        expr: heap_used / heap_total > 0.9
        for: 10m

  - name: worker-health
    rules:
      - alert: WorkerDown           # CRITICAL
      - alert: WorkerStale          # CRITICAL — not polling for 5 min
      - alert: NoWorkersAlive       # CRITICAL — no active worker
      - alert: WorkerConsecutiveErrors # WARNING — > 5 consecutive errors

  - name: queue
    rules:
      - alert: QueueBacklog   # WARNING — > 500 pending actions

  - name: host
    rules:
      - alert: HighCPU        # WARNING — CPU > 90%
      - alert: LowDisk        # CRITICAL — disk < 10%
```

**Why this matters:** without alerting, an outage can go undetected for hours. With these rules, the developer is notified within **2-5 minutes** via Discord.

### 4.3 Securing `/api/metrics`

The `/api/metrics` endpoint exposes potentially sensitive data (number of prospects, queue size). It is protected by a **bearer token** with constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

```typescript
// Excerpt from app/api/metrics/route.ts
const provided = Buffer.from(token);
const expected = Buffer.from(process.env.METRICS_BEARER_TOKEN);
if (provided.length !== expected.length) return false;
return crypto.timingSafeEqual(provided, expected); // prevents timing attacks
```

### 4.4 Automatic Grafana Provisioning

Grafana is shipped with **configuration as code** (Infrastructure as Code):

- **Datasources** (`observability/grafana/provisioning/datasources/datasources.yml`): Prometheus + Loki configured automatically at startup
- **Dashboards** (`observability/grafana/provisioning/dashboards/dashboards.yml`): the `linkedin-agent-overview.json` dashboard is loaded automatically (no manual configuration required)
- **Hardening**:
  - `GF_USERS_ALLOW_SIGN_UP=false` (no public registration)
  - `GF_AUTH_ANONYMOUS_ENABLED=false` (no anonymous access)
  - `GF_SECURITY_COOKIE_SECURE=true` (HTTPS-only cookies)
  - `GF_SECURITY_STRICT_TRANSPORT_SECURITY=true` (HSTS)
  - **Blocked anti-pattern:** `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:?GRAFANA_PASSWORD required (never "admin")}` — if the variable is unset or equals `admin`, the container **refuses to start**
  - Port bound to `127.0.0.1:3001` (not exposed to the internet, access via SSH tunnel or reverse proxy)

### 4.5 Loki & Promtail Configuration

| Component      | Key configuration                                                                  |
| -------------- | ---------------------------------------------------------------------------------- |
| **Loki**       | Single-binary, `filesystem` storage (no S3 = €0), TSDB v13 schema                 |
| **Retention**  | 720 hours (30 days) of logs                                                        |
| **Auth**       | `auth_enabled: false` (access restricted to internal Docker network `linkedin-net`)|
| **Promtail**   | Docker service discovery via `/var/run/docker.sock` (read-only)                    |
| **Relabeling** | Docker labels auto-extracted: `container`, `service`, `stream`, `project`          |
| **Push**       | Logs sent via HTTP to `http://loki:3100/loki/api/v1/push`                          |

### 4.6 Alertmanager Routing

Prometheus alerts are routed by severity:

```yaml
# Excerpt from observability/alertmanager.yml
route:
  receiver: "default"
  group_by: ["alertname", "service"]    # Deduplication by alert+service
  group_wait: 30s                       # Wait 30s before first notification (grouping)
  group_interval: 5m                    # Min 5 min between 2 notifications of the same group
  repeat_interval: 12h                  # Repeat unresolved alert every 12h
  routes:
    - matchers: [severity = "critical"]
      receiver: "critical"              # → Discord webhook #alerts-critical
    - matchers: [severity = "warning"]
      receiver: "warnings"              # → Discord webhook #alerts-warnings

inhibit_rules:
  # A CRITICAL alert suppresses WARNING alerts for the same service
  - source_matchers: [severity = "critical"]
    target_matchers: [severity = "warning"]
    equal: ["alertname", "service"]
```

---

## 5. Security and Hardening

### 5.1 Implemented Security Measures

| Layer                        | Measure                                                            | Source file                                      |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Docker images**            | Blocking Trivy CRITICAL scan                                       | `.github/workflows/deploy.yml`                   |
| **Registry**                 | Private GHCR (GitHub token required)                               | `deploy.yml`                                     |
| **Metrics**                  | Bearer token on `/api/metrics`                                     | `app/api/metrics/route.ts`                       |
| **Backups**                  | GPG AES256 encryption + round-trip verification                    | `.github/workflows/backup.yml`                   |
| **Containers**               | cAdvisor without `privileged: true` (minimal capabilities)         | `docker-compose.yml`                             |
| **Dashboards**               | Grafana rejects "admin" password, ports bound to `127.0.0.1`       | `docker-compose.yml`                             |
| **Secrets**                  | `observability/secrets/` ignored by Git                            | `.gitignore`                                     |
| **Code**                     | Gitleaks + Semgrep + npm audit in CI                               | `.github/workflows/security.yml`                 |
| **TLS**                      | TLS 1.2/1.3, HSTS 2 years, OCSP stapling, Mozilla 2024 ciphers    | `nginx.conf`                                     |
| **VM network**               | Oracle Security Lists + UFW + SSH key-only + Fail2ban              | `docs/SECURITY.md`                               |
| **Containers (app/worker)**  | Non-root user UID 1001, multi-stage builds                         | `Dockerfile`, `linkedin-agent-worker/Dockerfile` |

### 5.2 Principle of Least Privilege

cAdvisor (which reads container stats) runs with only:

- `cap_drop: ALL` (removes all default privileges)
- `cap_add: SYS_PTRACE, DAC_READ_SEARCH` (adds only what is necessary)
- `security_opt: no-new-privileges:true` (prevents privilege escalation)

Previously: `privileged: true` (= full root on the host, dangerous).

### 5.3 Oracle Cloud VM Network Security

VM perimeter security is provided by **three successive layers** (defense-in-depth). Full details are documented in `docs/SECURITY.md`.

#### Layer 1 — Oracle Cloud Security Lists (IaaS-level firewall)

| Direction | Port | Source          | Usage                                  |
| --------- | ---- | --------------- | -------------------------------------- |
| Ingress   | 22   | `<admin IP>/32` | SSH (restricted to admin IP)           |
| Ingress   | 80   | `0.0.0.0/0`     | HTTP (301 redirect to HTTPS)           |
| Ingress   | 443  | `0.0.0.0/0`     | HTTPS (main traffic)                   |
| Ingress   | 8000 | `<admin IP>/32` | Coolify UI (admin only)                |
| Egress    | ALL  | `0.0.0.0/0`     | Outbound DB (Neon), GHCR, R2, etc.     |

All other ports are **blocked by default**.

#### Layer 2 — UFW (Ubuntu OS firewall)

In addition to Oracle Security Lists, UFW is enabled on the OS for redundancy:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp 80/tcp 443/tcp
sudo ufw allow from <ADMIN_IP> to any port 8000
sudo ufw enable
```

#### Layer 3 — SSH Hardening + Fail2ban

`/etc/ssh/sshd_config` file:

```
PermitRootLogin no                    # No direct root login
PasswordAuthentication no             # Key-only auth (no password)
MaxAuthTries 3                        # Cuts connection after 3 failures
ClientAliveInterval 300               # Auto-disconnect if inactive > 5 min
```

**Fail2ban** automatically bans any IP that attempts more than 3 failed SSH connections in 10 minutes (1-hour ban).

#### Automatic Security Updates

`unattended-upgrades` automatically applies Ubuntu security patches without manual intervention. Regular audits via Lynis (monthly) and Trivy filesystem scan (weekly in `security.yml`).

---

## 6. Backups and Data Recovery

### 6.1 Backup Strategy

```
Every day at 02:00 UTC
    │
    ├──▶ PostgreSQL Backup → tar.gz
    │       ├──▶ GPG AES256 encryption (round-trip verification before upload)
    │       ├──▶ Upload to Cloudflare R2 (90-day retention)
    │       └──▶ GitHub Artifact (30-day retention)
    │
    └──▶ Sunday 03:00 UTC → Restore Test
            ├──▶ Restore on disposable Postgres (temporary Docker container)
            ├──▶ Verify key tables: prospects, linkedin_actions_queue, worker_heartbeats, _migrations
            ├──▶ Verify row count + cross-check with manifest
            └──▶ Verify GPG decryption
```

### 6.2 Why the Restore Test Is Critical

An untested backup is **useless**. Our test verifies:

1. **Structural integrity**: the 4 key tables exist
2. **Data integrity**: at least 1 row restored
3. **Manifest consistency**: row count matches the original backup
4. **Encryption**: the encrypted backup decrypts correctly

**Cost: €0** (backup on R2 + restore test on GitHub Actions runner).

---

## 7. Cost Analysis

| Service                         | Monthly cost | Justification                                     |
| ------------------------------- | ------------ | ------------------------------------------------- |
| **Oracle Cloud VM**             | **€0**       | Always Free Tier — ARM A1.Flex 4 CPU / 24 GB RAM  |
| **Neon PostgreSQL**             | **€0**       | Free Tier — 500 MB, serverless                    |
| **GitHub Actions**              | **€0**       | 2000 minutes/month free (sufficient)              |
| **GitHub Container Registry**   | **€0**       | Public = free                                     |
| **Cloudflare R2**               | **€0**       | 10 GB free + €0 egress                            |
| **Coolify**                     | **€0**       | Open-source, self-hosted                          |
| **Prometheus + Grafana + Loki** | **€0**       | Open-source                                       |
| **Total**                       | **€0**       |                                                   |

**Comparison:** An equivalent infrastructure on AWS (EC2 t3.medium + RDS + S3 + CloudWatch) would cost **~€60-80/month**.

---

## 8. Results and Validation

### 8.1 What Works Today

| Test                                    | Result | Proof                                          |
| --------------------------------------- | ------ | ---------------------------------------------- |
| Multi-arch build (ARM + AMD64)          | ✅     | GitHub Actions logs + GHCR images              |
| Blocking Trivy scan                     | ✅     | Workflow fails if CVE CRITICAL                 |
| Idempotent migration + lock             | ✅     | Multiple runs = 0 migration applied            |
| Auto deployment frontend + worker       | ✅     | 2 Coolify resources deployed in parallel       |
| Post-deployment smoke test              | ✅     | 10× retry on `/api/health`                     |
| Auto rollback on failure                | ✅     | Coolify API restores previous SHA              |
| Daily encrypted backup                  | ✅     | `.tar.gz.gpg` files on R2                      |
| Weekly restore test                     | ✅     | Tables + rows + manifest verified              |
| Prometheus metrics scraped              | ✅     | Real-time Grafana dashboards                   |
| Discord alerts                          | ✅     | Notifications in < 5 min on outage             |
| External uptime monitoring              | ✅     | Uptime Kuma HTTPS monitoring                   |
| BI Dashboard deployed                   | ✅     | 6 `/api/bi/*` endpoints + Grafana dashboards   |
| HTTPS / TLS 1.2+1.3 (HSTS, A+)         | ✅     | SSL Labs test, 301 redirect working            |
| VM network security (3 layers)          | ✅     | Security Lists + UFW + SSH key-only + Fail2ban |
| Containers running as non-root          | ✅     | `id` inside container returns UID 1001         |
| Lint + TypeCheck + Vitest CI            | ✅     | `ci.yml` runs on every PR                      |

### 8.2 Challenges Encountered and Solutions

| Challenge                                        | Impact                              | Solution applied                                          |
| ------------------------------------------------ | ----------------------------------- | --------------------------------------------------------- |
| Oracle Cloud = ARM, GHCR = AMD64 by default      | Image would not start on the VM     | Multi-arch build with QEMU + Buildx                       |
| Prometheus could not see Coolify containers      | No app/worker metrics               | Scrape via `host.docker.internal:9090` + bearer token     |
| Webhook-based rollback = false positive          | The "rollback" restored nothing     | Real rollback via Coolify API (`PATCH` tag + redeploy)    |
| Possible concurrent migrations                   | Risk of DB corruption               | Postgres advisory lock (`pg_try_advisory_lock`)           |
| cAdvisor with `privileged: true`                 | Major security risk                 | Minimal capabilities (`SYS_PTRACE`, `DAC_READ_SEARCH`)    |
| HTTP traffic unencrypted initially               | MITM risk, plaintext data           | TLS 1.2/1.3 + HSTS + 301 redirect + Mozilla 2024 ciphers |
| SSH with password = attack surface               | Bruteforce possible                 | Key-only auth + Fail2ban + IP whitelist                   |
| No `.env.example` initially                      | Difficult onboarding                | Created `.env.example` documenting all required variables |

---

## 9. Conclusion and Future Work

### 9.1 Summary

The cloud infrastructure developed meets **all initial objectives**:

- ✅ **24/7 availability** via Oracle VM + Coolify
- ✅ **Automated CI/CD** of professional quality (multi-arch, scanning, rollback)
- ✅ **Full observability** (metrics, logs, alerts, external uptime)
- ✅ **Resilience** (auto rollback, tested backups, locked migrations)
- ✅ **Security** (blocking scan, encryption, least privilege)
- ✅ **Zero cost** (€0/month)

### 9.2 What Distinguishes This Work

Key strengths to highlight for the jury:

1. **Complete "Shift Left" pipeline**: security from CI, not just in production
2. **Atomic and verifiable rollback**: not "deploy and hope", but "deploy with a safety net"
3. **Industrialized DB migrations**: lock + checksum + expand/contract (pattern used by large enterprises)
4. **Professional open-source observability**: equivalent to Datadog/New Relic but free
5. **Weekly restore test**: rarely implemented in student projects

### 9.3 Future Improvements

| Improvement           | Description                                                  | Priority |
| --------------------- | ------------------------------------------------------------ | -------- |
| Multi-VM HA           | 2 Oracle VMs + load balancing (requires budget > €0)         | Medium   |
| E2E tests on staging  | Playwright against staging URL before merge to `main`        | High     |
| Secret manager        | Doppler or HashiCorp Vault instead of GitHub Secrets         | Medium   |
| Cosign                | Docker image signing to guarantee authenticity               | Medium   |

### 9.4 Known Limitations (Transparency)

An honest report must acknowledge its limitations. The following are assumed trade-offs due to project constraints:

| Limitation                                        | Cause                                    | Current mitigation                                                   |
| ------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| **Single VM SPOF**                                | €0 budget (1 Oracle VM)                  | Daily backups + IaC (re-deployment < 30 min on new VM)               |
| **No global CDN**                                 | Cloudflare Free Tier only                | Local nginx cache (1 GB) sufficient for current load                 |
| **Neon Free Tier limited to 500 MB**              | Free Tier choice                         | DB size monitoring + alert at 80% (to be added)                      |
| **Discord webhook in plaintext in Alertmanager**  | Alertmanager does not support envsubst   | URL stored in `observability/secrets/` (gitignored)                  |
| **`prometheus.yml` not templated**                | Prometheus does not support env vars     | Config patched by `envsubst` script at deployment                    |
| **2000 min/month GitHub Actions**                 | GitHub Free Tier                         | Workflows optimized with cache (~150 min/month used)                 |
| **No image signing (Cosign)**                     | Complexity vs PFE added value            | Planned as future improvement (§9.3)                                 |
| **Coolify = orchestrator SPOF**                   | Self-hosted single-instance              | Manual bootstrap documentation in case of Coolify failure            |

### 9.5 Bibliographic References

- **Beyer, B., Jones, C., Petoff, J., Murphy, N. R.** (2016). _Site Reliability Engineering: How Google Runs Production Systems_. O'Reilly. — inspiration for SLOs, observability, and post-mortems.
- **Wiggins, A.** (2017). _The Twelve-Factor App_. https://12factor.net — guide for cloud-native apps (config via env vars, logs as streams, etc.).
- **OWASP Foundation** (2024). _OWASP Top 10 — 2021_. https://owasp.org/Top10/ — basis for Semgrep rules used in `security.yml`.
- **Mozilla Foundation** (2024). _Mozilla SSL Configuration Generator_. https://ssl-config.mozilla.org — source of the TLS configuration in `nginx.conf`.
- **CIS** (2023). _CIS Docker Benchmark v1.6.0_. — reference for container hardening (non-root USER, cap_drop, no-new-privileges).
- **Humble, J., Farley, D.** (2010). _Continuous Delivery_. Addison-Wesley. — theoretical foundation for the CI/CD pipeline with automatic rollback.
- **Prometheus Documentation** (2024). https://prometheus.io/docs/ — reference for alert rules and the exposition format.

---

## Appendices

### A. CI/CD Pipeline Excerpt (`deploy.yml`)

```yaml
# .github/workflows/deploy.yml (excerpt from build-and-push job)
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
        with:
          platforms: linux/amd64,linux/arm64
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64    # Multi-arch ARM/AMD64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha,scope=frontend   # GHA cache for speedup
          cache-to: type=gha,mode=max,scope=frontend
```

### B. Prometheus Configuration (excerpt `observability/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: linkedin-agent
    environment: production

rule_files:
  - /etc/prometheus/alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: [alertmanager:9093]

scrape_configs:
  - job_name: 'workers'
    metrics_path: /metrics
    static_configs:
      - targets: ['host.docker.internal:9090']
        labels: { service: linkedin-worker }

  - job_name: 'nextjs-app'
    metrics_path: /api/metrics
    scheme: https
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/metrics_token
    static_configs:
      - targets: ['app.example.com']
        labels: { service: linkedin-frontend }

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

### C. Prometheus Alert Rules (excerpt `observability/alerts.yml`)

```yaml
groups:
  - name: app-health
    rules:
      - alert: AppDown
        expr: up{job="nextjs-app"} == 0
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "Next.js application unreachable"
          description: "App has not responded since {{ $for }}."

      - alert: HighMemoryUsage
        expr: heap_used_bytes / heap_total_bytes > 0.9
        for: 10m
        labels: { severity: warning }

  - name: worker-health
    rules:
      - alert: NoWorkersAlive
        expr: count(up{job="workers"} == 1) == 0
        for: 5m
        labels: { severity: critical }
```

### D. Required Secrets Table

| Secret                         | Required?     | Role                                               |
| ------------------------------ | ------------- | -------------------------------------------------- |
| `DATABASE_URL`                 | Yes           | Neon connection                                    |
| `OPENAI_API_KEY`               | Yes           | OpenAI API                                         |
| `COOLIFY_WEBHOOK_URL`          | Yes           | Frontend deployment                                |
| `COOLIFY_WORKER_WEBHOOK_URL`   | Yes           | Worker deployment                                  |
| `COOLIFY_TOKEN`                | Yes           | Coolify API auth                                   |
| `COOLIFY_BASE_URL`             | Recommended   | Rollback API                                       |
| `COOLIFY_APP_UUID`             | Recommended   | Rollback API                                       |
| `COOLIFY_WORKER_UUID`          | Recommended   | Rollback API                                       |
| `PROD_URL`                     | Recommended   | Smoke test + snapshot                              |
| `METRICS_BEARER_TOKEN`         | Recommended   | Auth `/api/metrics`                                |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Recommended   | Backup encryption                                  |
| `R2_ACCESS_KEY_ID`             | Optional      | Backup upload                                      |
| `GH_PAT_VARIABLES`             | Optional      | Update `LAST_DEPLOYED_SHA`                         |
| `GRAFANA_USER`                 | Yes (obs.)    | Grafana admin account                              |
| `GRAFANA_PASSWORD`             | Yes (obs.)    | Grafana admin password (rejected if "admin")       |
| `DISCORD_WEBHOOK_URL`          | Recommended   | Alertmanager alert routing                         |

### E. Screenshots and Visual Evidence

To support the report before the jury, see the `les rapports/screenshots/` folder which contains:

- `01_github_actions_pipeline.png` — complete run of the `deploy.yml` workflow
- `02_ghcr_images.png` — multi-arch images published on GHCR
- `03_trivy_scan_clean.png` — Trivy scan result with 0 CRITICAL CVE
- `04_coolify_dashboard.png` — Coolify view with both deployed resources
- `05_grafana_overview.png` — Grafana "LinkedIn Agent Overview" dashboard
- `06_prometheus_targets.png` — all Prometheus targets UP in green
- `07_alertmanager_routing.png` — alerts grouped by severity
- `08_uptime_kuma.png` — 99.9% uptime over 30 days
- `09_ssl_labs_report.png` — SSL Labs A+ score
- `10_backup_r2.png` — encrypted `.tar.gz.gpg` backups on Cloudflare R2
- `11_restore_test_logs.png` — successful run of `backup-restore-test.yml`
- `12_rollback_demo.png` — automatic rollback after failed smoke test

### F. Measured Quantitative Metrics

| Indicator                           | Measured value               | Measurement tool         |
| ----------------------------------- | ---------------------------- | ------------------------ |
| Total CI build time                 | ~4 min 30 s (with cache)     | GitHub Actions logs      |
| Total deployment time               | ~2 min (from push to prod)   | GitHub Actions + Coolify |
| Frontend image size (compressed)    | ~180 MB                      | `docker images`          |
| Worker image size (compressed)      | ~420 MB                      | `docker images`          |
| P95 latency `/api/health`           | < 50 ms                      | Prometheus histogram     |
| Production uptime (30 days)         | 99.9%                        | Uptime Kuma              |
| MTTR (automatic rollback)           | < 2 min                      | `deploy.yml` logs        |
| Daily backup size (encrypted)       | ~5-15 MB                     | `backup.yml` logs        |
| GitHub Actions workflows/month      | ~150 min used / 2000         | GitHub billing           |
| Monthly infrastructure cost         | **€0.00**                    | Oracle/Neon/CF invoices  |
