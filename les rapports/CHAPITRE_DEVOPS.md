# 5.1. DevOps & CI/CD Pipeline

DevOps is a modern engineering approach that integrates software development and operations through automation, continuous feedback, and shared responsibility.

In the LinkedIn Agent project LINQEN, where multiple components interact, a CI/CD pipeline ensures code quality, security, rapid delivery, and deployment consistency by automatically validating, securing, and releasing every change while maintaining full traceability and rollback capability.

## 5.1.1. Pipeline DevOps CI/CD

The CI/CD pipeline was designed according to modern DevOps principles: full automation, shift-left security, and continuous delivery. Every code change pushed to the main branch triggers an automated chain of jobs that lints, type-checks, tests, scans, builds, and deploys the application without any manual intervention.

Quantitative metrics:

**10** Automated GitHub Actions workflows

**24** Distinct jobs triggered per push cycle

**3** Minutes Time from git push to live production

**0** Manual interventions required

Code coverage before deployment 100% (lint + types + tests + build)

**6** Independent security layers (NPM Audit • Semgrep • Trivy FS • Gitleaks • Trivy Image • Custom Security Audit)

Figure 3.19: Global Pipeline Diagram

## 5.1.2. Pipeline Workflow

The pipeline follows a sequential-parallel architecture: continuous integration jobs run in parallel for faster feedback, then security scans execute in parallel as a unified gate, and finally the deployment phase runs sequentially to ensure deterministic releases. Each stage acts as a quality gate; if a stage fails, the pipeline stops and no deployment occurs.

New additions since the last revision include a dedicated staging branch pipeline, automated database migrations with advisory locking, post-deployment smoke tests with automatic rollback, multi-architecture Docker builds for Oracle Cloud ARM, and weekly backup restore verification.

Figure 3.19: Complete Pipeline Architecture

## 5.1.3. Intégration continue (CI)

Five CI workflows run in parallel or on targeted paths to validate every commit. This separation accelerates feedback and isolates failures by component.

### 5.1.3.1. Frontend CI

The frontend pipeline runs four sequential jobs forming a strict quality gate: ESLint for code style, TypeScript type-checking with `tsc --noEmit`, unit tests with Vitest including coverage reporting, and finally a full Next.js production build. The build job depends on (needs:) the three previous jobs, which guarantees that no compilation issue, type error, or failing test can reach the deployment phase. Coverage reports and build artifacts are archived for seven days for traceability.

Figure 3.19: Frontend CI: Lint, TypeCheck, Test and Build

### 5.1.3.2. Chrome Extension CI

The Chrome extension pipeline validates the Manifest V3 schema, checks the syntax of all JavaScript files, verifies the presence of every referenced asset (popup, icons, content scripts), and packages the extension as a versioned ZIP archive ready for Chrome Web Store distribution.

Figure 3.19: Chrome Extension CI

### 5.1.3.3. Worker CI

The worker pipeline ensures the Node.js worker (responsible for asynchronous LinkedIn automation through Puppeteer) compiles successfully with TypeScript and passes ESLint validation. The Puppeteer Chromium binary download is skipped during CI to keep build times under one minute, since the worker is only type-checked and built, not executed in CI.

Figure 3.19: Worker CI

### 5.1.3.4. End-to-End Tests CI

Playwright runs end-to-end tests on the Chromium engine, exercising real user flows: health endpoint availability, security headers presence, CORS rules, XSS protection, rate-limiting, and authentication flow. The full HTML report is uploaded as a 7-day GitHub artifact for inspection.

Figure 3.19: Playwright End-to-End Tests

### 5.1.3.5. Lighthouse CI

After each build, Lighthouse CI runs a performance audit and enforces minimum scores. The full HTML report is archived as a GitHub artifact, providing historical evidence of performance evolution across releases.

Figure 3.19: Lighthouse CI

## 5.1.4. Automated Testing

The application is covered by two complementary testing layers:

Vitest powers **27** unit tests covering critical business logic — prospect scoring algorithms, input validators, anti-XSS sanitization, LinkedIn URL parsing, and CORS whitelist enforcement.

Playwright runs **9** end-to-end tests on the Chromium engine, exercising real user flows: login page branding, health endpoint availability, security headers presence, CORS rules, XSS protection, and rate-limiting.

End-to-end tests upload the full HTML report as a 7-day GitHub artifact for inspection. This dual-layer approach guarantees that both isolated logic and real user interactions are validated on every commit.

Total automated tests: **36** (27 unit + 9 E2E)

Figure 3.19: Playwright End-to-End Tests

## 5.1.5. Automated Security (DevSecOps)

Security is enforced through **six** independent layers, each detecting a different class of vulnerabilities:

**NPM Audit:** software composition analysis (SCA) on production dependencies (`--omit=dev`) to detect CVEs in the dependency tree.

**Semgrep:** static application security testing (SAST) using five rulesets including OWASP Top 10, JavaScript security best practices, and secrets detection.

**Trivy Filesystem:** scans the entire repository for vulnerabilities, embedded secrets, and misconfigurations (Dockerfile, IaC).

**Gitleaks:** dedicated git history scanner for leaked secrets, with a custom `.gitleaks.toml` allowlist to suppress false positives on placeholders, lock files, and GitHub Actions expressions.

**Trivy Image:** post-build scan of **both** Docker images (frontend and worker) pushed to GHCR, focusing on HIGH and CRITICAL CVEs introduced by the base image and its system layers. The scan is **blocking** on CRITICAL severity (`exit-code: 1`).

**Custom Security Audit:** a dedicated `scripts/security-audit.js` script performs application-level checks on XSS vectors, CORS configuration, and rate-limiting enforcement.

All findings are uploaded in SARIF format to the GitHub Security tab, providing a unified view of vulnerabilities across the repository.

Figure 3.19: Security Audit Workflow

## 5.1.6. Continuous Delivery (CD)

When CI and security stages succeed, the `deploy.yml` workflow executes the full delivery chain through **eight** sequential jobs:

1. **build-and-push:** Multi-architecture Docker build (`linux/amd64` + `linux/arm64` via QEMU + Buildx) for the Next.js frontend, pushed to GHCR with tags `latest`, `main`, and a unique SHA tag.
2. **build-and-push-worker:** Same multi-architecture build for the Puppeteer worker image.
3. **trivy-scan:** Matrix strategy scanning **both** images for CRITICAL CVEs (blocking) and HIGH+CRITICAL CVEs (audit), with SARIF upload to GitHub Security.
4. **migrate-db:** Applies SQL migrations idempotently via `scripts/migrate.js` with checksum SHA-256 and Postgres advisory lock (`pg_try_advisory_lock`) to prevent concurrent execution corruption.
5. **deploy:** Snapshot version via `/api/health`, then triggers Coolify webhooks for **both** frontend and worker with 3× retry (10s backoff).
6. **smoke-test:** 10 attempts × 30s on `/api/health` → validates the new version responds correctly.
7. **rollback:** Conditional job — if smoke-test fails, patches Coolify API to restore the previous SHA and force redeploy (< 2 minutes).
8. **mark-success:** Updates `LAST_DEPLOYED_SHA` repository variable for precise future rollbacks.

The tagging strategy guarantees immutable releases and enables instant rollback to any previous version.

Figure 3.19: Continuous Deployment Workflow (CD)

### 5.1.6.1. GHCR Container Registry

Both frontend and worker images are published on GitHub Container Registry with multi-architecture support. The download counter confirms that Coolify is automatically pulling each new release, validating the end-to-end automation between GitHub and the production server.

Figure 3.10: Docker Images Published on GHCR (Frontend + Worker)

### 5.1.6.2. Coolify Production Configuration

The Coolify dashboard confirms the deployment status (Running), the build pack used (Dockerfile), and the configured production domain, providing visual proof that the deployment pipeline successfully ends on the target server.

Figure 3.10: Coolify Production Configuration

## 5.1.7. Staging Environment

A dedicated `deploy-staging.yml` workflow triggers on every push to the `develop` branch. It builds an image tagged `staging`, applies migrations to a separate Neon PostgreSQL staging branch, deploys via a dedicated Coolify staging webhook, and runs a smoke test on the staging URL. This allows full pre-production validation before merging to `main`.

Figure 3.19: Staging Deployment Workflow

## 5.1.8. Performance Audit (Lighthouse CI)

After each deployment, Lighthouse CI runs a full audit and enforces minimum scores for Performance (≥70), Accessibility (≥85), Best Practices (≥85), and SEO (≥80). The full HTML report is archived as a GitHub artifact, providing historical evidence of performance evolution across releases.

Figure 3.19: Lighthouse Performance Audit

## 5.1.9. Production Monitoring & Observability

After every deployment, the application exposes a custom `/api/health` endpoint that reports the real-time state of all critical components: PostgreSQL connection, connection pool latency, memory usage, application uptime, and current version. This integrated monitoring provides instant deployment validation.

Additionally, a complete open-source observability stack is deployed via Docker Compose:

- **Prometheus** scrapes `/api/metrics` (frontend) and `:9090/metrics` (worker)
- **Grafana** provides pre-provisioned dashboards
- **Alertmanager** routes alerts to Discord based on severity
- **Loki + Promtail** centralize logs with 30-day retention
- **Uptime Kuma** performs external black-box monitoring
- **cAdvisor** collects container metrics with minimal capabilities (no `privileged: true`)
- **Node Exporter** exposes VM system metrics

The `/api/metrics` endpoint is protected by a bearer token with timing-safe comparison to prevent brute-force attacks.

**10 alerting rules** are configured across application health, worker status, queue depth, and host resources — notifying the developer within 2–5 minutes of any anomaly.

This capture demonstrates:

- The Coolify deployment is operational and live
- The custom Health Check endpoint is fully implemented
- The PostgreSQL database is connected in production
- The monitoring system is actively running

Figure 3.19: /api/health Endpoint Response

## 5.1.10. Scheduled Automation

Three background workflows run on schedule to maintain production resilience, dependency hygiene, and backup integrity.

### 5.1.10.1. Daily Database Backup (Scheduled Cron)

The `backup.yml` workflow runs every day at 02:00 UTC to perform a full PostgreSQL dump. The backup is:

- Compressed to `tar.gz`
- Encrypted with **GPG AES256** (with round-trip decryption verification before upload)
- Uploaded to **Cloudflare R2** via `rclone` (S3-compatible, 90-day retention)
- Archived as a GitHub artifact with 30-day retention as fallback

A manifest summary is generated as a GitHub Actions step summary for traceability. A manual trigger (`workflow_dispatch`) is also available for on-demand backups before risky operations.

This guarantees:

- Daily automated backups without human intervention
- 90-day off-site retention on R2 + 30-day artifact fallback
- Encrypted storage with verified decryption integrity
- No production data loss risk

Figure 3.19: PostgreSQL Database Backup Workflow

### 5.1.10.2. Weekly Backup Restore Test

The `backup-restore-test.yml` workflow runs every Sunday at 03:00 UTC to verify backup integrity:

1. Starts a disposable Postgres 16 container
2. Applies all migrations
3. Restores the latest backup
4. Verifies 4 critical tables exist (`prospects`, `linkedin_actions_queue`, `worker_heartbeats`, `_migrations`)
5. Cross-checks row counts against the manifest
6. Verifies GPG decryption if encryption is enabled

This prevents the classic scenario of having backups that are unusable in practice.

Figure 3.19: Backup Restore Test Workflow

### 5.1.10.3. Dependabot — Automated Dependency Management

Dependabot is configured to monitor three independent ecosystems: NPM (frontend and worker dependencies), GitHub Actions (workflow dependencies), and Docker (base image updates). Updates are checked weekly on Monday at 06:00 Europe/Paris time and limited to five concurrent pull requests to avoid review fatigue.

Dependencies are grouped intelligently by ecosystem: LangChain packages, Radix UI components, Next.js + React, and TypeScript types.

Figure 3.19: Dependabot Configuration

## 5.1.11. Conclusion

The DevOps pipeline implemented in this project represents a complete, production-grade CI/CD chain. It combines **10 automated workflows**, **6 independent security layers**, **36 automated tests** (27 unit + 9 E2E), a **multi-architecture hardened Docker image** (ARM64 + AMD64), **zero-downtime deployment** via Coolify with **auto-rollback**, **automated database migrations** with advisory locking, **daily encrypted backups** to Cloudflare R2, **weekly backup restore verification**, **integrated production monitoring** with 10 alerting rules, and **automated dependency management** through Dependabot.

The entire chain from a developer's git push to a verified live deployment runs in approximately three minutes, with zero manual steps and full pre-deployment validation.

→ The visual pipeline unifies ten workflows into one end-to-end process.

Figure 3.16: Visual Overview Complete DevSecOps CI/CD Pipeline

→ Comprehensive tool inventory mapping every technology choice to a concrete project requirement.

Figure 3.16: DevOps Toolchain
