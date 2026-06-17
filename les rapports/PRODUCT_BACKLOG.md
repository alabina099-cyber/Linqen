# Product Backlog — Qlinqen (AI-driven LinkedIn B2B Prospecting Agent)

**Methodology:** Scrum  
**Sprint Duration:** 2 weeks  
**Total Sprints:** 7  
**Total Duration:** ~14 weeks  
**Backlog Language:** English

---

## Epic Overview

| ID  | Epic                                     | Sprint | Status |
| --- | ---------------------------------------- | ------ | ------ |
| E01 | Authentication & User Management         | 1      | Done   |
| E02 | CRM Core (Prospects & Kanban)            | 2      | Done   |
| E03 | Sales Pipeline, BI & Scoring             | 3      | Done   |
| E04 | AI Conversational Agent                  | 4      | Done   |
| E05 | Chrome Extension & LinkedIn Integration  | 5      | Done   |
| E06 | Automation, Security & Quality Hardening | 6      | Done   |
| E07 | Production Release & Finalization        | 7      | Done   |

---

## Sprint 1 — Foundations & First User Flow

### Goal

Deliver a working Next.js application with authentication, database schema, and CI/CD pipeline deployed online.

| ID      | User Story                                                                                                   | Acceptance Criteria                                                                           | Priority | Story Points |
| ------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------- | ------------ |
| S1-US01 | As a developer, I want a Next.js project scaffold with TailwindCSS so that the frontend foundation is ready. | Project builds; layout component renders; global styles apply.                                | Must     | 3            |
| S1-US02 | As a user, I want to log in and log out so that my session is secure.                                        | JWT tokens generated; protected routes redirect unauthenticated users; logout clears session. | Must     | 5            |
| S1-US03 | As an admin, I want role-based access control so that admin and user permissions are separated.              | Middleware blocks unauthorized routes; role column in DB; seed data creates admin + user.     | Must     | 5            |
| S1-US04 | As a developer, I want a PostgreSQL database with migrations so that schema changes are versioned.           | Neon DB connected; migration files run via CLI; schema matches user/role tables.              | Must     | 5            |
| S1-US05 | As an ops engineer, I want Docker containers and docker-compose so that the environment is reproducible.     | `docker-compose up` starts app + DB; health checks pass.                                      | Must     | 5            |
| S1-US06 | As an ops engineer, I want GitHub Actions CI/CD so that every push is tested and deployed automatically.     | Workflow runs on PR/push; build + lint + test stages pass; auto-deploy to staging.            | Must     | 5            |
| S1-US07 | As a security engineer, I want HTTPS and HSTS headers so that communication is encrypted.                    | Let's Encrypt certificate active; HSTS header present on all responses.                       | Must     | 3            |
| S1-US08 | As a developer, I want unit tests with Vitest so that core logic is covered.                                 | Vitest configured; at least one test runs in CI; coverage report generated.                   | Should   | 3            |
| S1-US09 | As a developer, I want ESLint and Prettier so that code quality is enforced.                                 | Config files present; pre-commit hook or CI check blocks bad formatting.                      | Should   | 2            |

**Deliverable:** App live online with functional authentication.

---

## Sprint 2 — Initial CRM Management

### Goal

Deliver a full CRM module with prospect CRUD, Kanban board, dashboard, and improved security.

| ID      | User Story                                                                                             | Acceptance Criteria                                                              | Priority | Story Points |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------- | ------------ |
| S2-US01 | As a sales rep, I want to create, read, update, and delete prospects so that my pipeline is organized. | All CRUD operations via UI; changes persist in DB; validation prevents bad data. | Must     | 8            |
| S2-US02 | As a sales rep, I want a Kanban board so that I can visualize prospect stages.                         | Drag-and-drop (or status change) updates stage; columns reflect pipeline states. | Must     | 8            |
| S2-US03 | As a user, I want a main dashboard so that I can see key metrics at a glance.                          | Dashboard loads; displays total prospects, recent activity; responsive layout.   | Must     | 5            |
| S2-US04 | As a developer, I want secured CRUD APIs so that only authorized users access data.                    | API routes validate JWT; Zod schemas enforce input; 403 for unauthorized access. | Must     | 5            |
| S2-US05 | As a security engineer, I want API rate limiting so that abuse is prevented.                           | Rate limiter blocks excessive requests; returns 429 with retry-after header.     | Must     | 3            |
| S2-US06 | As a security engineer, I want XSS protection so that scripts cannot be injected.                      | Input sanitized on display; CSP header configured; no inline scripts.            | Must     | 3            |
| S2-US07 | As a developer, I want improved CI/CD with env variable management so that deployments are reliable.   | Secrets injected via GitHub secrets; staging vs prod configs separated.          | Should   | 3            |
| S2-US08 | As a QA engineer, I want API tests with Vitest so that endpoints are verified.                         | Tests cover CRUD endpoints; mock DB in tests; run in CI.                         | Should   | 5            |
| S2-US09 | As a QA engineer, I want component tests so that UI components work in isolation.                      | At least 3 components tested with React Testing Library; run in CI.              | Should   | 5            |

**Deliverable:** Complete prospect management with web interface.

---

## Sprint 3 — Sales Pipeline, BI & Scoring

### Goal

Deliver an advanced pipeline with campaigns, automated follow-ups, BI analytics, and prospect scoring.

| ID      | User Story                                                                                               | Acceptance Criteria                                                                | Priority | Story Points |
| ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- | ------------ |
| S3-US01 | As a sales rep, I want advanced Kanban stages so that I can track prospects through a detailed pipeline. | Custom stages configurable; stage transitions logged; UI reflects changes.         | Must     | 5            |
| S3-US02 | As a sales rep, I want campaigns with automatic follow-ups so that I can nurture leads systematically.   | Campaign creation UI; scheduled emails/messages sent via cron/worker; logs stored. | Must     | 8            |
| S3-US03 | As a manager, I want BI and analytics reports so that I can measure team performance.                    | Charts render from aggregated data; filters by date range; exportable.             | Must     | 8            |
| S3-US04 | As a sales rep, I want automatic prospect scoring so that I can prioritize high-value leads.             | Score calculated from engagement + firmographic data; displayed on prospect card.  | Must     | 5            |
| S3-US05 | As a developer, I want cron/worker jobs so that scheduled tasks run reliably.                            | Worker processes campaigns; cron triggers every 15 min; failed jobs retried.       | Must     | 8            |
| S3-US06 | As an ops engineer, I want database optimization so that queries are fast at scale.                      | Indexes added; slow-query log reviewed; explain plans under 100ms.                 | Should   | 3            |
| S3-US07 | As an ops engineer, I want aggregated logs with Loki so that I can debug across services.                | Loki configured; logs queryable in Grafana; retention policy set.                  | Should   | 5            |
| S3-US08 | As a QA engineer, I want E2E tests with Playwright so that user flows are verified.                      | Playwright tests cover login → add prospect → change stage; run in CI.             | Should   | 8            |
| S3-US09 | As a security engineer, I want audit logging on key actions so that activity is traceable.               | Create/update/delete logged with user + timestamp; admin can view audit trail.     | Should   | 3            |

**Deliverable:** CRM with pipeline, campaigns and analytical dashboards.

---

## Sprint 4 — AI Agent (First Version)

### Goal

Deliver a conversational AI agent integrated into the CRM, capable of contextual responses and history.

| ID      | User Story                                                                                              | Acceptance Criteria                                                                    | Priority | Story Points |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- | ------------ |
| S4-US01 | As a sales rep, I want a conversational AI agent so that I can ask questions about my prospects.        | Chat UI embedded in CRM; accepts text input; displays response.                        | Must     | 8            |
| S4-US02 | As a sales rep, I want contextual responses so that the AI understands my CRM data.                     | Agent fetches relevant prospect data before answering; mentions specific names/stages. | Must     | 8            |
| S4-US03 | As a user, I want conversation history so that I can review past AI interactions.                       | History stored per user; scrollable thread; searchable.                                | Must     | 5            |
| S4-US04 | As a developer, I want LangChain + GPT-4o-mini integration so that AI responses are generated securely. | API key stored in secrets; prompt templates versioned; response under 5s.              | Must     | 8            |
| S4-US05 | As a security engineer, I want secured AI API keys so that they are never exposed client-side.          | Key in server env only; backend proxies all AI calls; rotation procedure documented.   | Must     | 3            |
| S4-US06 | As a security engineer, I want AI input validation so that prompt injection is mitigated.               | Max length enforced; dangerous keywords filtered; output sanitized before display.     | Must     | 3            |
| S4-US07 | As an ops engineer, I want AI cost monitoring so that usage stays within budget.                        | Per-request cost logged; daily aggregation in Grafana; alert if threshold exceeded.    | Should   | 3            |
| S4-US08 | As a QA engineer, I want AI functional tests so that the agent behaves predictably.                     | Test suite covers greeting, prospect query, fallback; mock AI responses in tests.      | Should   | 5            |
| S4-US09 | As a QA engineer, I want prompt evaluation so that AI quality is measured.                              | Evaluation dataset created; scoring rubric documented; regression checks in CI.        | Should   | 5            |

**Deliverable:** AI agent integrated into CRM to assist users.

---

## Sprint 5 — Chrome Extension & Integrations

### Goal

Deliver a Chrome Extension (MV3) that captures LinkedIn prospects, queues them for approval, and syncs with CRM.

| ID      | User Story                                                                                               | Acceptance Criteria                                                                      | Priority | Story Points |
| ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- | ------------ |
| S5-US01 | As a sales rep, I want a Chrome Extension so that I can capture LinkedIn profiles with one click.        | Extension installed from store/dev mode; popup UI visible; captures name, company, role. | Must     | 8            |
| S5-US02 | As a sales rep, I want captured prospects to enter an approval queue so that data quality is maintained. | Queue page in CRM; admin/reviewer can approve/reject; reason field for rejection.        | Must     | 8            |
| S5-US03 | As a user, I want CRM ↔ Extension sync so that approved prospects appear instantly.                      | WebSocket or polling updates CRM; extension shows sync status indicator.                 | Must     | 5            |
| S5-US04 | As a developer, I want a worker-based approval queue so that processing is reliable.                     | Worker consumes queue; handles retries; notifies user on completion.                     | Must     | 5            |
| S5-US05 | As a developer, I want an integration API so that the extension communicates securely with CRM.          | Dedicated API routes; API key or OAuth auth; rate limited; documented.                   | Must     | 5            |
| S5-US06 | As a security engineer, I want OAuth-secured integration so that only authorized extensions connect.     | OAuth flow implemented; token refresh; revocation endpoint.                              | Must     | 5            |
| S5-US07 | As a security engineer, I want minimal Chrome Extension permissions so that user privacy is respected.   | Manifest v3 declares only required permissions; no broad host access.                    | Must     | 3            |
| S5-US08 | As a QA engineer, I want E2E integration tests so that the full capture-to-CRM flow works.               | Automated test: open LinkedIn → capture → approve in CRM → verify presence.              | Should   | 8            |
| S5-US09 | As an ops engineer, I want separate extension environments so that staging and prod don't collide.       | Extension IDs separated; build script selects env; CI deploys to Chrome Web Store.       | Should   | 3            |

**Deliverable:** LinkedIn prospects import to CRM with validation.

---

## Sprint 6 — Automation, Security & Quality

### Goal

Deliver a hardened, production-ready platform with advanced automation, comprehensive security scanning, and full test coverage.

| ID      | User Story                                                                                                                      | Acceptance Criteria                                                                         | Priority | Story Points |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- | ------------ |
| S6-US01 | As a sales rep, I want advanced AI automations so that repetitive tasks are handled automatically.                              | Auto-suggested follow-ups; smart reminders; configurable automation rules.                  | Must     | 8            |
| S6-US02 | As a user, I want UX/UI optimizations so that the app feels fast and modern.                                                    | Lighthouse performance score > 90; reduced bundle size; skeleton loaders added.             | Must     | 5            |
| S6-US03 | As a user, I want caching and performance tuning so that pages load quickly.                                                    | Redis or Next.js cache configured; cache hit rate > 70%; DB query times improved.           | Must     | 5            |
| S6-US04 | As a developer, I want advanced workers so that background jobs scale.                                                          | Worker concurrency configured; dead letter queue; monitoring dashboard shows throughput.    | Should   | 5            |
| S6-US05 | As an ops engineer, I want CI/CD quality gates so that only high-quality code deploys.                                          | Gates enforce: tests pass, coverage > 80%, security scan clean, build succeeds.             | Must     | 5            |
| S6-US06 | As an ops engineer, I want ephemeral environments so that each PR gets a preview.                                               | Preview env per PR; seeded with test data; auto-destroyed on merge.                         | Should   | 5            |
| S6-US07 | As a security engineer, I want automated security scanning (Trivy, Semgrep, Gitleaks) so that vulnerabilities are caught early. | Trivy scans images + FS in CI; Semgrep SAST on PR; Gitleaks blocks secrets; npm audit runs. | Must     | 8            |
| S6-US08 | As a security engineer, I want strict CORS, CSP, and HSTS headers so that attack surfaces are minimized.                        | CORS whitelist enforced; CSP header blocks inline scripts; HSTS max-age >= 31536000.        | Must     | 5            |
| S6-US09 | As a QA engineer, I want a full Playwright E2E suite so that critical paths are covered.                                        | E2E tests cover: auth, CRUD, kanban, AI chat, extension sync, approval flow.                | Must     | 8            |
| S6-US10 | As a QA engineer, I want Lighthouse CI so that performance, accessibility, and SEO are monitored.                               | Lighthouse CI runs on PR; thresholds: perf > 90, a11y > 95, SEO > 95.                       | Should   | 5            |
| S6-US11 | As a QA engineer, I want code coverage > 80% so that risk is quantified.                                                        | Istanbul/v8 coverage report generated; CI blocks if coverage drops below 80%.               | Should   | 3            |

**Deliverable:** Robust, secure and high-performance platform.

---

## Sprint 7 — Finalization & Production Release

### Goal

Deliver the complete product in production with documentation, onboarding, and final hardening.

| ID      | User Story                                                                                    | Acceptance Criteria                                                                   | Priority | Story Points |
| ------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- | ------------ |
| S7-US01 | As a user, I want final bug fixes and polish so that the experience is smooth.                | All P1/P2 bugs resolved; UI polish pass completed; no console errors on load.         | Must     | 5            |
| S7-US02 | As a user, I want technical and user documentation so that I can understand the product.      | README updated; user guide PDF generated; API docs available (Swagger/OpenAPI).       | Must     | 5            |
| S7-US03 | As a new user, I want onboarding so that I can get started quickly.                           | Onboarding flow on first login; tooltips on key features; demo data option.           | Must     | 5            |
| S7-US04 | As a developer, I want final optimizations so that the app is production-grade.               | Bundle analysis complete; unused dependencies removed; query plans optimized.         | Should   | 3            |
| S7-US05 | As an ops engineer, I want production deployment so that users can access the live app.       | Deployed to production server; custom domain active; SSL certificate valid.           | Must     | 5            |
| S7-US06 | As an ops engineer, I want Nginx + SSL with HSTS so that the production server is secure.     | Nginx config hardened; SSL A+ on SSL Labs; HSTS preload ready.                        | Must     | 3            |
| S7-US07 | As an ops engineer, I want PostgreSQL backups and restore tests so that data is protected.    | Automated daily backups; tested restore procedure; RTO/RPO documented.                | Must     | 5            |
| S7-US08 | As a security engineer, I want a final security audit so that no vulnerabilities remain.      | Penetration test completed; OWASP Top 10 checklist reviewed; report generated.        | Must     | 5            |
| S7-US09 | As a security engineer, I want Dependabot weekly updates so that dependencies stay patched.   | Dependabot config active; first PR merged; update policy documented.                  | Should   | 2            |
| S7-US10 | As a QA engineer, I want full acceptance tests so that business requirements are met.         | Acceptance test plan executed; all must-have stories signed off; no critical defects. | Must     | 5            |
| S7-US11 | As a business stakeholder, I want business validation so that the product meets market needs. | Demo to stakeholders; feedback collected; go/no-go decision documented.               | Must     | 3            |

**Deliverable:** Complete product in production, stable, secure and monitored.

---

## Definition of Done (All Sprints)

- [ ] Code reviewed and merged to main
- [ ] Unit tests passing (Vitest)
- [ ] CI/CD pipeline green
- [ ] Security scan clean (Semgrep, Trivy, Gitleaks)
- [ ] Deployed to staging environment
- [ ] Feature validated against acceptance criteria
- [ ] Documentation updated (if applicable)
- [ ] No critical or high-severity bugs

---

## Velocity Summary

| Sprint    | Velocity   | Focus         |
| --------- | ---------- | ------------- |
| Sprint 1  | 31 SP      | Foundations   |
| Sprint 2  | 40 SP      | CRM Core      |
| Sprint 3  | 45 SP      | Pipeline & BI |
| Sprint 4  | 43 SP      | AI Agent      |
| Sprint 5  | 45 SP      | Extension     |
| Sprint 6  | 55 SP      | Hardening     |
| Sprint 7  | 38 SP      | Release       |
| **Total** | **297 SP** | —             |

---

_Generated for jury presentation. All epics, user stories, and deliverables correspond to actual components in the Qlinqen codebase._
