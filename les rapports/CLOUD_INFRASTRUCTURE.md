# ☁️ Cloud Infrastructure — LinkedIn Agent

Documentation complète de la partie cloud, **100% gratuite**, basée sur :

- **Oracle Cloud Always Free** (4 OCPU ARM / 24 GB RAM permanent)
- **Coolify** (PaaS auto-hébergé open-source) sur la VM Oracle
- **Neon Free Tier** (PostgreSQL serverless)
- **GitHub Actions** + **GHCR** (CI/CD + registry)
- **Cloudflare R2** (stockage objet, 10 GB gratuits)
- **Stack observabilité open-source** : Prometheus + Grafana + Loki + Uptime Kuma

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions (CI/CD)                                          │
│  ─ ci.yml          → lint + typecheck + tests + build            │
│  ─ security.yml    → Trivy + Semgrep + Gitleaks                  │
│  ─ deploy.yml      → build → GHCR → migrate DB → Coolify         │
│                       → smoke test → auto rollback si KO         │
│  ─ deploy-staging  → branche develop → env staging               │
│  ─ backup.yml      → cron 2h UTC → R2 + artifact GitHub          │
│  ─ backup-restore  → cron dimanche → test restore                │
└────────┬─────────────────────────────────────────────┬──────────┘
         │ push image                                  │ webhook
         ▼                                             ▼
   ┌────────────┐                          ┌──────────────────────┐
   │ ghcr.io    │                          │ VM Oracle Cloud (ARM)│
   │ (registry) │ ◀───── pull ───────      │ Always Free 4 CPU    │
   └────────────┘                          │ + Coolify (PaaS)     │
                                           │                      │
                                           │ ┌──────────────────┐ │
                                           │ │ nginx LB         │ │
                                           │ │ Next.js × N      │ │
                                           │ │ Worker × M       │ │
                                           │ │ Prometheus       │ │
                                           │ │ Grafana          │ │
                                           │ │ Loki + Promtail  │ │
                                           │ │ Uptime Kuma      │ │
                                           │ │ cAdvisor         │ │
                                           │ └──────────────────┘ │
                                           └──────────┬───────────┘
                                                      │
                                                      ▼
                                              ┌───────────────┐
                                              │ Neon Postgres │
                                              │  (Free 500MB) │
                                              └───────────────┘

   Cloudflare R2 ◀── nightly backup tar.gz (rclone)
```

---

## 🔧 Composants ajoutés

### 1. Worker — Healthcheck HTTP réel

Avant : `node -e "console.log('ok')"` (vérifie juste que Node tourne).
Maintenant : serveur HTTP intégré sur port `9090`.

| Endpoint       | Description                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /health`  | 503 si pas de poll depuis 5 min ou en shutdown, sinon 200                                                   |
| `GET /ready`   | 200 si la DB est joignable                                                                                  |
| `GET /metrics` | Format Prometheus — `worker_up`, `worker_actions_*`, `worker_consecutive_errors`, `worker_last_poll_age_ms` |

Implémenté dans `linkedin-agent-worker/src/health-server.ts`.
Le `Dockerfile` du worker utilise `wget --spider http://localhost:9090/health` comme `HEALTHCHECK`.

### 2. Frontend — `/api/metrics` Prometheus

Nouveau endpoint sans auth (exclu du rate-limiting) qui expose :

- `nextjs_uptime_seconds`, `nextjs_memory_*`, `db_pool_*`, `db_up`
- `actions_24h{status="..."}`, `prospects_total{status="..."}`
- `workers_alive` (nombre de workers avec heartbeat < 2 min)

Fichier : `linkedin-agent-frontend/app/api/metrics/route.ts`.

### 3. PostgreSQL local optionnel

Activable uniquement avec `--profile local-db` (ne casse rien en prod).

```bash
docker compose --profile local-db up -d postgres
```

Pour la prod, on continue d'utiliser **Neon** via `DATABASE_URL`.

### 4. Stack observabilité (profile `observability`)

```bash
docker compose --profile observability up -d
```

| Service     | Port   | Description                                           |
| ----------- | ------ | ----------------------------------------------------- |
| Prometheus  | `9091` | Scrape metrics workers + Next.js + cAdvisor           |
| Grafana     | `3001` | Dashboard pré-provisionné `LinkedIn Agent — Overview` |
| Loki        | `3100` | Stockage logs (filesystem, retention 30j)             |
| Promtail    | —      | Collecte les logs Docker → Loki                       |
| Uptime Kuma | `3002` | Monitoring uptime + alertes (Discord/Telegram/email)  |
| cAdvisor    | `8080` | Métriques CPU/RAM par conteneur                       |

Configuration : dossier `observability/`.

### 5. Migrations DB automatiques

Script idempotent `linkedin-agent-frontend/scripts/migrate.js` :

- Crée la table `_migrations` (filename, applied_at, checksum)
- Applique les `.sql` de `db/migrations/` par ordre alphabétique
- Skip ce qui est déjà appliqué
- Détecte les changements de checksum (warning)

Exécuté automatiquement dans le pipeline `deploy.yml` **avant** le déploiement de l'image.

### 6. Trivy bloquant + smoke test + rollback

Le pipeline `deploy.yml` enchaîne désormais :

```
build-and-push → trivy-scan (BLOCK on CRITICAL) → migrate-db
                                                        ↓
                              deploy → smoke-test → rollback (si fail)
```

- **Trivy CRITICAL** : `exit-code: '1'` → bloque si vulnérabilité critique
- **Trivy HIGH** : audit non bloquant + SARIF upload
- **Smoke test** : 10 tentatives × 30s sur `/api/health`
- **Rollback** : webhook Coolify alternatif (pointant vers le tag `previous`)

### 7. Backup vers Cloudflare R2

Le workflow `backup.yml` :

1. Dump JSON de toutes les tables (existant)
2. Upload artifact GitHub (30j) — fallback
3. **Compresse** en `tar.gz` + **upload R2** via `rclone` (nouveau)
4. Supprime les backups R2 > 90 jours

Workflow `backup-restore-test.yml` (dimanches) :

- Démarre un Postgres jetable
- Applique les migrations
- Télécharge le dernier backup
- Vérifie qu'il y a au moins 3 tables après restore

### 8. Environnement staging

Branche `develop` → workflow `deploy-staging.yml` :

- Tag image `staging` séparé
- Migrations sur `STAGING_DATABASE_URL`
- Webhook Coolify staging séparé
- Smoke test staging

---

## 🔑 Secrets GitHub à configurer

### Existants (déjà en place)

- `DATABASE_URL` — Neon PostgreSQL prod
- `OPENAI_API_KEY` — OpenAI
- `COOLIFY_WEBHOOK_URL` — webhook prod
- `COOLIFY_TOKEN` — bearer Coolify

### Nouveaux

| Secret                                                                    | Usage                                                                                              | Obligatoire ?                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `PROD_URL`                                                                | URL prod (ex: `https://app.example.com`) pour smoke test + snapshot rollback                       | recommandé                                          |
| `COOLIFY_BASE_URL`                                                        | URL de l'API Coolify (ex: `https://coolify.example.com`)                                           | **requis pour rollback**                            |
| `COOLIFY_APP_UUID`                                                        | UUID de la ressource Coolify Frontend                                                              | **requis pour rollback**                            |
| `COOLIFY_WORKER_UUID`                                                     | UUID de la ressource Coolify Worker                                                                | **requis pour rollback**                            |
| `COOLIFY_WORKER_WEBHOOK_URL`                                              | Webhook Coolify du worker                                                                          | **requis** (sinon le worker n'est jamais redéployé) |
| `GH_PAT_VARIABLES`                                                        | PAT avec scope `variables:write` pour MAJ `LAST_DEPLOYED_SHA`                                      | recommandé                                          |
| `METRICS_BEARER_TOKEN`                                                    | Token bearer protégeant `/api/metrics` (à mettre aussi dans `observability/secrets/metrics_token`) | **requis en prod**                                  |
| `BACKUP_ENCRYPTION_PASSPHRASE`                                            | Passphrase GPG symétrique pour chiffrer les backups R2                                             | **requis si R2 actif**                              |
| `STAGING_DATABASE_URL`                                                    | Neon staging branch                                                                                | optionnel                                           |
| `STAGING_URL`                                                             | URL staging                                                                                        | optionnel                                           |
| `COOLIFY_STAGING_WEBHOOK_URL`                                             | Webhook Coolify staging                                                                            | optionnel                                           |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` / `R2_BUCKET` | Cloudflare R2                                                                                      | optionnel (fallback artifact)                       |

### Variable de dépôt (Repository Variables — _pas_ secret)

| Nom                 | Usage                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| `LAST_DEPLOYED_SHA` | MAJ automatique après chaque smoke-test réussi. Utilisée comme cible de rollback. |

> **Tous les secrets manquants sont gérés gracieusement** — le workflow logue un warning et continue.

---

## 🚀 Setup Coolify (Oracle Cloud VM)

### Étape 1 — Créer la VM Oracle (gratuite, permanent)

1. [cloud.oracle.com](https://cloud.oracle.com) → Compute → Create Instance
2. Shape : **VM.Standard.A1.Flex** (ARM, 4 OCPU + 24 GB)
3. Image : Ubuntu 22.04 LTS
4. Open ports 22 + 80 + 443 + 8000 (Coolify) dans Security List

### Étape 2 — Installer Coolify

```bash
ssh ubuntu@<vm-ip>
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Coolify écoute sur `http://<vm-ip>:8000` — créer le compte admin.

### Étape 3 — Créer 2 ressources Coolify

**Frontend production** (branch `main`, tag `latest`)

- Source : Docker image `ghcr.io/<user>/<repo>:latest`
- Domain : `app.example.com`
- Variables : `DATABASE_URL`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, `METRICS_BEARER_TOKEN`, `IMAGE_TAG=sha-XXXXXXX` (auto-injecté par Coolify si template `{{commit_sha}}` configuré)
- Healthcheck : `/api/health`
- Récupérer **webhook URL**, **token** et **UUID de l'application** → secrets GitHub (`COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`)

**Worker production** (même branche, image séparée `ghcr.io/<user>/<repo>-worker:latest`)

- Source : Docker image `ghcr.io/<user>/<repo>-worker:latest`
- Variables : `DATABASE_URL`, `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`, `WORKER_ID`
- Port exposé sur l'hôte : `9090` (nécessaire pour que Prometheus scrape via `host.docker.internal:9090`)
- Healthcheck : `wget --spider http://localhost:9090/health`
- Webhook + UUID → `COOLIFY_WORKER_WEBHOOK_URL`, `COOLIFY_WORKER_UUID`

**Rollback** — _automatique via l'API Coolify_
Le workflow `rollback` récupère le SHA précédent (via `/api/health` puis fallback `vars.LAST_DEPLOYED_SHA`), fait un `PATCH /api/v1/applications/{uuid}` (`docker_registry_image_tag`) puis `POST /api/v1/deploy?uuid=...&force=true`. Aucun webhook secondaire à maintenir manuellement.

**Staging** (optionnel, branch `develop`, tag `staging`)

- Domain : `staging.example.com`
- DB : autre branch Neon
- Webhook → `COOLIFY_STAGING_WEBHOOK_URL`

### Étape 4 — Déployer la stack observabilité sur la même VM

```bash
ssh ubuntu@<vm-ip>
git clone https://github.com/<user>/<repo>.git
cd <repo>
docker compose --profile observability up -d
```

**Prérequis avant `up -d`** :

```bash
# 1. Token bearer pour /api/metrics (même valeur que METRICS_BEARER_TOKEN dans Coolify)
mkdir -p observability/secrets
openssl rand -hex 32 > observability/secrets/metrics_token
chmod 600 observability/secrets/metrics_token

# 2. Variables d'env obligatoires (sinon docker compose refuse de démarrer)
export GRAFANA_USER=admin
export GRAFANA_PASSWORD="$(openssl rand -hex 16)"   # JAMAIS "admin"
export PUBLIC_HOST=monitoring.example.com
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."   # optionnel
```

Accès (par défaut bindés sur `127.0.0.1` — expose-les via Coolify Proxy + TLS) :

- Grafana → `http://127.0.0.1:3001`
- Uptime Kuma → `http://127.0.0.1:3002`
- Prometheus → `http://127.0.0.1:9091`
- Alertmanager → `http://127.0.0.1:9093`

> **HTTPS obligatoire** : créer 4 ressources Coolify de type **Proxy** vers `localhost:3001/3002/9091/9093`, ou un Caddy/Nginx en front. Ne **jamais** exposer ces ports directement sur Internet.

---

## ✅ Vérifications post-déploiement

| Test           | Commande                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Health app     | `curl https://app.example.com/api/health`                                    |
| Metrics app    | `curl https://app.example.com/api/metrics`                                   |
| Health worker  | `docker exec linkedin-agent-worker-1 wget -qO- http://localhost:9090/health` |
| Metrics worker | idem `:9090/metrics`                                                         |
| Migrations     | `npm run migrate` (idempotent)                                               |
| Backup manuel  | Actions → Backup → Run workflow                                              |
| Restore test   | Actions → Backup Restore Test → Run                                          |

---

## 📊 Récap : Avant / Après

| Critère                | Avant                              | Après                                         |
| ---------------------- | ---------------------------------- | --------------------------------------------- |
| Worker healthcheck     | `console.log('ok')` (faux positif) | HTTP `/health` avec détection stale           |
| Métriques applicatives | Aucune                             | `/api/metrics` + worker `/metrics`            |
| Logs centralisés       | Aucun                              | Loki + Promtail (Docker auto-discovery)       |
| Dashboards             | Aucun                              | Grafana provisionné                           |
| Uptime monitoring      | Aucun                              | Uptime Kuma (alertes Discord/Telegram)        |
| Migrations DB          | Manuelles                          | Automatiques + idempotentes + checksums       |
| Trivy CRITICAL         | Non bloquant                       | Bloque le déploiement                         |
| Smoke test post-deploy | Aucun                              | 10 tentatives × 30s sur `/api/health`         |
| Rollback automatique   | Aucun                              | Webhook secondaire déclenché si smoke fail    |
| Backups                | Artifact GitHub 30j                | Artifact + R2 90j + tarball                   |
| Test de restore        | Aucun                              | Hebdomadaire sur Postgres jetable             |
| Environnement staging  | Aucun                              | branche `develop` → ressource Coolify séparée |
| Postgres local dev     | Externe obligatoire                | Profile `local-db` optionnel                  |

**Coût total : 0 €/mois.**

---

## ⚠️ Migrations DB — règle expand/contract

Les migrations sont appliquées **avant** le déploiement Coolify. Pendant ~30-60s, l'ancienne version de l'app continue de tourner contre le **nouveau** schéma.

Régle d'or : **chaque migration doit être rétrocompatible** avec la version précédente du code.

| ❌ À éviter                 | ✅ Pattern recommandé                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DROP COLUMN foo`           | 1) PR n : ajoute le code qui n'utilise plus `foo` 2) PR n+1 : `DROP COLUMN foo`                                          |
| `ALTER COLUMN ... TYPE ...` | Ajouter une nouvelle colonne, migrer les données, ancien code lit l'ancienne, nouveau code lit la nouvelle, drop ensuite |
| `RENAME COLUMN`             | Ajouter la nouvelle, double-écrire, basculer la lecture, supprimer l'ancienne                                            |

Le script `migrate.js` utilise un **advisory lock Postgres** (`pg_try_advisory_lock(4242)`) : impossible de lancer 2 migrations concurrentes.

---

## 🔔 Alerting (Alertmanager)

Règles définies dans `observability/alerts.yml` :

- `AppDown`, `DatabaseDown`, `WorkerDown`, `WorkerStale`, `NoWorkersAlive` (sévérité _critical_)
- `HighMemoryUsage`, `WorkerConsecutiveErrors`, `QueueBacklog`, `HighCPU` (_warning_)
- `LowDisk` (_critical_)

Routing Discord : définir `DISCORD_WEBHOOK_URL`. Pour Slack/Telegram, éditer `observability/alertmanager.yml`.

---

## 🔐 Sécurité / hardening

- `/api/metrics` exige un **bearer token** (`METRICS_BEARER_TOKEN`). Sans token en prod, l'app log un warning explicite.
- Backups R2 chiffrés **GPG AES256** (`BACKUP_ENCRYPTION_PASSPHRASE`). Vérification round-trip avant upload.
- cAdvisor tourne sans `privileged: true` (capabilities minimales `SYS_PTRACE`, `DAC_READ_SEARCH`, `no-new-privileges`).
- Grafana refuse de démarrer si `GRAFANA_PASSWORD` n'est pas explicitement fourni.
- Tous les ports observabilité sont bindés sur `127.0.0.1` — jamais directement exposés.

---

## 🛡️ Ce qui n'a PAS été touché (préservé)

- `next.config.ts` (`output: 'standalone'` toujours actif)
- `Dockerfile` frontend (multi-stage Next.js)
- `nginx.conf` (load balancer + rate limiting)
- `app/api/health/route.ts` et `app/api/monitoring/route.ts`
- `middleware.ts` (uniquement ajout d'une exception pour `/api/metrics` et `/api/health` au rate-limit — ces routes restent protégées par CORS si origin envoyé)
- Tous les workflows existants (`ci.yml`, `security.yml`, `e2e.yml`, `lighthouse.yml`, `chrome-extension-ci.yml`, `worker-ci.yml`)
- Scripts `backup.js` / `restore.js` (étendus, pas remplacés)
- Chrome extension, frontend Next.js, queue worker, table `worker_heartbeats`
