# 🚀 DevOps Pipeline — LinkedIn Agent

Pipeline CI/CD complet basé sur **GitHub Actions** pour automatiser tests, sécurité, build, déploiement et backups.

## 📋 Vue d'ensemble

```
  git push
     │
     ▼
  CI Tests ─▶ Lint + TypeCheck + Tests Vitest + Build Next.js
     │
     ▼
  Security ─▶ npm audit + Trivy fs + Semgrep + Gitleaks
     │
     ▼
  Build & Push  ─▶ Docker image → ghcr.io (cache GHA)
     │
     ▼
  Trivy image  ─▶ BLOQUANT si CRITICAL (exit-code 1)
     │
     ▼
  Migrate DB   ─▶ scripts/migrate.js (idempotent, checksum SHA-256)
     │
     ▼
  Deploy       ─▶ Webhook Coolify (Oracle Cloud VM)
     │
     ▼
  Smoke test   ─▶ 10 tentatives × 30s sur /api/health
     │
     ├──▶ ✅ OK → Done
     └──▶ ❌ KO → Auto-rollback (webhook Coolify tag précédent)

  Workflows planifiés (cron) :
  • 02h UTC tous les jours       → Backup PostgreSQL → Cloudflare R2 + artifact
  • 03h UTC tous les dimanches   → Test de restore sur Postgres jetable
  • 06h UTC tous les lundis      → Audit sécurité hebdomadaire
  • 06h Paris tous les lundis    → Dependabot MAJ deps

  Pipeline staging (branche develop) :
  • Build tag staging → Migrate staging DB → Coolify staging → Smoke test
```

## 📁 Workflows configurés

| Fichier                                     | Déclencheur               | Description                                                                                               |
| ------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                  | Push/PR sur main, develop | Lint ESLint + TypeCheck + Tests Vitest + Build Next.js                                                    |
| `.github/workflows/security.yml`            | Push/PR + cron lundi 6h   | npm audit + Trivy (fs+secrets+misconfig) + Semgrep + Gitleaks                                             |
| `.github/workflows/deploy.yml`              | Push sur main             | Build Docker → GHCR → Trivy image (bloquant CRITICAL) → Migrate DB → Coolify → Smoke test → Auto-rollback |
| `.github/workflows/deploy-staging.yml`      | Push sur develop          | Build tag `staging` → Migrate staging DB → Coolify staging → Smoke test                                   |
| `.github/workflows/backup.yml`              | Cron 2h UTC               | Backup PG → tar.gz → Cloudflare R2 (90j) + artifact GitHub (30j)                                          |
| `.github/workflows/backup-restore-test.yml` | Cron dimanche 3h UTC      | Restore le dernier backup sur Postgres jetable, vérifie intégrité                                         |
| `.github/workflows/e2e.yml`                 | Push/PR                   | Tests E2E Playwright                                                                                      |
| `.github/workflows/lighthouse.yml`          | Push/PR                   | Audit performance Lighthouse CI                                                                           |
| `.github/workflows/chrome-extension-ci.yml` | Push/PR extension         | Lint + packaging extension Chrome                                                                         |
| `.github/workflows/worker-ci.yml`           | Push/PR worker            | Lint + TypeCheck + Build worker                                                                           |
| `.github/dependabot.yml`                    | Hebdo lundi 6h Paris      | MAJ automatique des dépendances (groupées)                                                                |

## 🔐 Secrets GitHub

**Settings → Secrets and variables → Actions** :

### Obligatoires

| Secret           | Usage                                      |
| ---------------- | ------------------------------------------ |
| `DATABASE_URL`   | Chaîne de connexion PostgreSQL Neon (prod) |
| `OPENAI_API_KEY` | Clé OpenAI (build/test/runtime)            |

### Déploiement (optionnels — skip propre si absents)

| Secret                         | Usage                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `COOLIFY_WEBHOOK_URL`          | Webhook redeploy Coolify (prod)                               |
| `COOLIFY_TOKEN`                | Token Bearer Coolify                                          |
| `PROD_URL`                     | URL prod pour smoke test (`https://app.example.com`)          |
| `COOLIFY_ROLLBACK_WEBHOOK_URL` | Webhook Coolify pointant sur le tag précédent (auto-rollback) |

### Staging (optionnels)

| Secret                        | Usage                       |
| ----------------------------- | --------------------------- |
| `STAGING_DATABASE_URL`        | Branche Neon staging        |
| `STAGING_URL`                 | URL staging pour smoke test |
| `COOLIFY_STAGING_WEBHOOK_URL` | Webhook Coolify staging     |

### Backup R2 (optionnels — fallback artifact GitHub)

| Secret                 | Usage                                        |
| ---------------------- | -------------------------------------------- |
| `R2_ACCESS_KEY_ID`     | Clé d'accès Cloudflare R2                    |
| `R2_SECRET_ACCESS_KEY` | Secret R2                                    |
| `R2_ENDPOINT`          | `https://<account>.r2.cloudflarestorage.com` |
| `R2_BUCKET`            | Nom du bucket R2                             |

> **Tous les secrets optionnels sont gérés gracieusement** : workflow logue `⚠️ skip` et continue. Aucun échec si absents.

## 🎯 Détails de chaque pipeline

### 1️⃣ CI (`ci.yml`)

**Quand ?** À chaque push/PR sur `main` ou `develop` qui touche le frontend.

**Étapes :**

1. **Lint ESLint** — Vérifie le code style
2. **TypeCheck** — `tsc --noEmit` (détecte les erreurs de types)
3. **Build** — `next build` (vérifie que tout compile)

**Bénéfice :** Détecte 90% des bugs avant prod.

### 2️⃣ Security (`security.yml`)

**Quand ?** Push/PR + tous les lundis 6h UTC.

**Étapes :**

1. **npm audit** — Vulnérabilités dépendances (production + dev)
2. **Trivy fs scan** — Scan filesystem : vulnérabilités + secrets + misconfigurations (CRITICAL/HIGH)
3. **Semgrep** — Analyse statique multi-langage (rulesets JS/TS/React/Node/OWASP Top 10)
4. **Gitleaks** — Détection de secrets fuités (mode audit + rapport SARIF)
5. **Custom Security Audit** — `scripts/security-audit.js` (XSS, CORS, rate-limit applicatifs)

> Remplace l'ancienne stack CodeQL par **Trivy + Semgrep + Gitleaks**, qui couvrent un spectre plus large (secrets, misconfig, supply-chain) et sont 100% open-source.

**Bénéfice :** Critique pour un agent qui touche aux comptes LinkedIn.

### 3️⃣ Deploy (`deploy.yml`)

**Quand ?** Push sur `main` ou déclenchement manuel.

**Pipeline complet en 5 jobs :**

1. **build-and-push** — Construit l'image Docker, push sur `ghcr.io/<user>/<repo>:latest` + tag SHA, cache GHA
2. **trivy-scan** — Scan de l'image
   - Step **bloquant** sur sévérité `CRITICAL` (`exit-code: 1`)
   - Step audit `HIGH+CRITICAL` non bloquant + upload SARIF dans l'onglet Security
3. **migrate-db** — Applique les migrations SQL idempotentes via `scripts/migrate.js`
   - Table `_migrations` avec checksums SHA-256
   - Skip ce qui est déjà appliqué
   - Warning si checksum d'une migration déjà appliquée a changé
4. **deploy** — Snapshot version précédente (via `/api/health`) puis trigger webhook Coolify
5. **smoke-test** — 10 tentatives × 30s sur `/api/health` → échec si pas `200` après ~5 min
6. **rollback** (conditionnel) — Si `smoke-test` échoue, déclenche `COOLIFY_ROLLBACK_WEBHOOK_URL` pour revenir au tag précédent

**Bénéfice :** Déploiement vérifié de bout en bout, retour arrière automatique en cas de régression.

### 4️⃣ Deploy Staging (`deploy-staging.yml`)

**Quand ?** Push sur `develop`.

**Étapes :**

1. Build & push image avec tag `staging`
2. Migrations sur `STAGING_DATABASE_URL` (branche Neon séparée)
3. Trigger webhook Coolify staging
4. Smoke test sur `STAGING_URL`

**Bénéfice :** Tests en condition réelle avant merge vers `main`.

### 5️⃣ Backup (`backup.yml`)

**Quand ?** Tous les jours à 2h UTC.

**Étapes :**

1. Lance `npm run backup` (dump JSON de toutes les tables + manifest + schéma)
2. Upload artifact GitHub (rétention 30 jours — fallback)
3. Compression `tar.gz`
4. Upload vers **Cloudflare R2** via `rclone` (S3-compatible, 10 GB gratuits)
5. Rétention R2 : 90 jours (suppression automatique des `backup-*.tar.gz` > 90j)

**Bénéfice :** Double stockage (GitHub + R2 off-site), rétention longue à coût zéro.

### 6️⃣ Backup Restore Test (`backup-restore-test.yml`)

**Quand ?** Tous les dimanches à 3h UTC.

**Étapes :**

1. Démarre un Postgres 16 jetable (service GHA)
2. Applique toutes les migrations
3. Télécharge le dernier artifact `db-backup-*`
4. Lance `scripts/restore.js`
5. Vérifie qu'au moins 3 tables existent après restore
6. Notifie en cas d'échec — **alerte critique**

**Bénéfice :** Garantit que les backups sont réellement utilisables (évite le scenario classique "on a des backups mais ils ne marchent pas").

### 7️⃣ Dependabot (`dependabot.yml`)

**Quand ?** Tous les lundis 6h Paris.

**Groupes intelligents :**

- `langchain` — Toutes les deps LangChain ensemble
- `radix-ui` — Tous les composants Radix
- `next-react` — Next.js + React + ESLint config Next
- `types` — Tous les `@types/*`

**Bénéfice :** Pas de PR spammées (groupées) + sécurité à jour.

## 🛠️ Lancement manuel

Tous les workflows peuvent être déclenchés manuellement via l'onglet **Actions** sur GitHub :

1. Aller sur `https://github.com/<user>/<repo>/actions`
2. Sélectionner le workflow
3. Cliquer **"Run workflow"**

## ✅ Premier setup

```powershell
# 1. Créer le dossier .github (déjà fait)
# 2. Configurer les secrets GitHub (voir section Secrets)
# 3. Push le code
git add .github/ DEVOPS.md
git commit -m "ci: add GitHub Actions DevOps pipeline"
git push origin main

# 4. Vérifier les workflows sur GitHub Actions
```

## 📊 Monitoring

Une fois en place, surveille :

- **Tab Actions** sur GitHub → état des runs (CI / deploy / backup / restore-test)
- **Tab Security → Code scanning alerts** → failles détectées par Trivy / Semgrep (rapports SARIF)
- **Tab Pull requests** → PRs Dependabot à merger
- **Tab Packages** → images Docker publiées sur GHCR
- **Grafana** (`http://<vm>:3001`) → dashboard temps réel + logs Loki
- **Uptime Kuma** (`http://<vm>:3002`) → disponibilité + alertes Discord/Telegram

## 📊 Observabilité complémentaire (hors GitHub Actions)

Stack open-source déployée via Docker Compose (profile `observability`), 100% gratuite :

| Composant           | Rôle                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| **Prometheus**      | Scrape `/api/metrics` (Next.js) + `:9090/metrics` (workers) + cAdvisor |
| **Grafana**         | Dashboard pré-provisionné "LinkedIn Agent — Overview"                  |
| **Loki + Promtail** | Logs centralisés (auto-discovery Docker), rétention 30 jours           |
| **Uptime Kuma**     | Monitoring + alertes Discord/Telegram/Slack                            |
| **cAdvisor**        | Métriques CPU/RAM par conteneur                                        |

Worker et frontend exposent désormais des endpoints **Prometheus natifs** :

- Worker : `GET :9090/metrics` (worker_up, actions processed/succeeded/failed, last_poll_age)
- Frontend : `GET /api/metrics` (db_pool, db_up, workers_alive, actions_24h, prospects_total)

Voir `les rapports/CLOUD_INFRASTRUCTURE.md` pour le détail.

## ✅ Évolutions livrées

Les points listés comme "futurs" dans les versions précédentes du rapport sont désormais **implémentés** :

- ✅ **Tests E2E Playwright** — `e2e.yml`
- ✅ **Lighthouse CI** — `lighthouse.yml`
- ✅ **Staging environment** — `deploy-staging.yml` (branche `develop`)
- ✅ **Rollback automatique** — job `rollback` dans `deploy.yml`
- ✅ **Migrations DB auto** — job `migrate-db` + `scripts/migrate.js`
- ✅ **Smoke test post-deploy** — job `smoke-test`
- ✅ **Trivy bloquant** — step `Trivy BLOCKING on CRITICAL`
- ✅ **Backup off-site** — Cloudflare R2 via `rclone`
- ✅ **Test de restore** — `backup-restore-test.yml` (dimanches)
- ✅ **Observabilité** — Prometheus + Grafana + Loki + Uptime Kuma

## 🚀 Pistes d'amélioration restantes

- **Notifications Slack/Discord** sur échec des workflows GHA (complément à Uptime Kuma)
- **Tests de charge** automatisés en CI (`scripts/load-test.js` existe déjà, à brancher sur un workflow planifié)
- **Multi-région** — actuellement single-host Oracle Cloud (Always Free limité à 1 région)
- **Infrastructure-as-Code** (Terraform/Pulumi) pour reproduire la VM Oracle + Coolify
