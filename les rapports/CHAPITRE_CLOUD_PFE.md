# Chapitre : Infrastructure Cloud & DevOps

## 1. Contexte et Problématique

### 1.1 Pourquoi une infrastructure cloud ?

L'agent LinkedIn que nous avons développé est un système critique composé de trois parties :

- Une **application web** (Next.js) pour la gestion des campagnes
- Un **worker** (Node.js + Puppeteer) pour exécuter les actions LinkedIn
- Une **extension Chrome** pour l'interaction utilisateur

Ces composants doivent fonctionner **24/7** : le worker scrute en permanence une file d'actions, l'application web doit rester accessible, et les données (prospects, actions, campagnes) doivent persister de manière fiable.

Sans infrastructure cloud :

- L'application serait locale et inaccessible aux utilisateurs
- Le worker s'arrêterait dès la fermeture de la machine
- Aucune garantie de disponibilité, de backup ou de monitoring

### 1.2 Contraintes du projet

| Contrainte                                         | Impact sur les choix                                               |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Budget **0 €**                                     | Stack entièrement gratuite (Oracle Free Tier, Neon, Cloudflare R2) |
| Compétences techniques limitées                    | Choix d'outils simples à déployer (Coolify vs Kubernetes)          |
| Données sensibles (mots de passe LinkedIn, emails) | Chiffrement des backups + authentification des endpoints           |
| Scalabilité potentielle                            | Architecture multi-conteneurs horizontalement scalable             |

### 1.3 Objectifs de l'infrastructure

1. **Haute disponibilité** : l'application et le worker ne doivent jamais s'arrêter simultanément
2. **CI/CD automatisé** : déploiement en un clic depuis `git push` sur `main`
3. **Observabilité complète** : métriques, logs, alerting, healthchecks
4. **Résilience** : rollback automatique en cas de déploiement raté
5. **Sécurité** : scan de vulnérabilités, authentification, moindre privilège
6. **Gratuité totale** : coût 0 €/mois

---

## 2. Architecture Globale

### 2.1 Vue d'ensemble

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
                              │ Docker Registry    │
                              │  Frontend + Worker │
                              └────────┬───────────┘
                                       │ pull
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     VM Oracle Cloud (Always Free — ARM A1.Flex)              │
│                     4 vCPU ARM + 24 GB RAM + 200 GB SSD                       │
│                                                                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────────────────┐ │
│   │  nginx   │   │ Next.js  │   │  Worker  │   │   Stack Observabilité   │ │
│   │  Load    │   │ Frontend │   │ Puppeteer│   │  Prometheus + Grafana   │ │
│   │ Balancer │   │  + BI    │   │  × M     │   │  Loki + Promtail       │ │
│   │  :80     │   │ Dashboard│   │  :9090   │   │  Uptime Kuma            │ │
│   │          │   │  :3000   │   │          │   │  cAdvisor + Node Exporter│ │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────────────────────────┘ │
│        │              │              │                                        │
│        └──────────────┴──────────────┘                                        │
│                                                                              │
│   Coolify (PaaS auto-hébergé) gère les déploiements Docker                    │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │   Neon PostgreSQL   │
                           │  Serverless (Free) │
                           │    500 MB SSD      │
                           └─────────────────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │   Cloudflare R2     │
                           │  Backups chiffrés   │
                           │   (10 GB gratuits)  │
                           └─────────────────────┘
```

> **Note sur le BI Dashboard :** Le module de Business Intelligence (KPIs, analytics géo, forecast, conversion funnel, agent analytics) est intégré au frontend Next.js et partage la même base de données Neon. Il expose 6 endpoints API dédiés (`/api/bi/*`) et est déployé automatiquement avec le frontend via le même conteneur Docker.

### 2.2 Choix technologiques justifiés

| Composant                | Choix                               | Alternative rejetée        | Pourquoi ce choix                                                                                     |
| ------------------------ | ----------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Cloud Provider**       | Oracle Cloud Always Free            | AWS/GCP/Azure Free Tier    | ARM A1.Flex = 4 CPU + 24 GB permanentement gratuits (supérieur aux offres AWS/GCP)                    |
| **PaaS / Orchestrateur** | Coolify (self-hosted)               | Kubernetes, Docker Swarm   | Coolify offre l'expérience Vercel/Render sans la complexité K8s. Déploiement en 2 clics avec webhooks |
| **Reverse Proxy**        | nginx                               | Traefik, Apache            | Léger, configuration simple, load balancing intégré, standard de facto                                |
| **Database**             | Neon PostgreSQL (Free)              | Supabase, PlanetScale, RDS | Serverless, branch instantanée, 500 MB gratuit, connexion sans IP whitelist                           |
| **Registry**             | GitHub Container Registry (GHCR)    | Docker Hub, ECR            | Intégration native GitHub Actions, gratuit pour public, pas de rate-limit                             |
| **CI/CD**                | GitHub Actions                      | GitLab CI, CircleCI        | Gratuit (2000 min/mois), matrice de jobs parallèles, intégration GHCR native                          |
| **Monitoring**           | Prometheus + Grafana + Alertmanager | Datadog, New Relic         | Gratuit, open-source, pas de limite de séries temporelles, alerting natif                             |
| **Logs**                 | Loki + Promtail                     | ELK, Splunk                | Loki est "Prometheus pour les logs" — même langage de requête, stockage efficient                     |
| **Backups**              | rclone → Cloudflare R2              | S3, Google Cloud Storage   | R2 = 0 € de sortie (egress), 10 GB gratuits, API S3-compatible                                        |

### 2.3 Configuration Nginx : Load Balancer et Hardening

Le fichier `nginx.conf` configure un reverse proxy avec les caractéristiques suivantes :

| Fonctionnalité            | Implémentation                                                                | Fichier source           |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| **Load balancing**        | Algorithme `least_conn` distribue vers l'instance la moins occupée            | `nginx.conf:30-35`       |
| **Rate limiting API**     | 100 requêtes/seconde par IP, burst de 20                                      | `nginx.conf:26,61`       |
| **Rate limiting général** | 50 requêtes/seconde par IP, burst de 20                                       | `nginx.conf:27,86`       |
| **Cache assets**          | 1 GB max, TTL 60 min pour `/_next/static/`                                    | `nginx.conf:38-39,76-82` |
| **Security headers**      | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | `nginx.conf:46-48`       |
| **Health check nginx**    | Endpoint `/health` retournant `200 OK`                                        | `nginx.conf:53-57`       |
| **Proxy headers**         | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`                           | `nginx.conf:67-69,91-92` |
| **Body size max**         | 10 MB (`client_max_body_size`)                                                | `nginx.conf:50`          |

### 2.4 Docker Compose : Health Checks et Limites de Ressources

Le fichier `docker-compose.yml` définit des contrôles opérationnels sur chaque service :

| Service                                        | Health Check                                 | Limites CPU/RAM      | Start Period |
| ---------------------------------------------- | -------------------------------------------- | -------------------- | ------------ |
| **nginx**                                      | `wget` sur `/health` toutes les 30s          | Non définies         | —            |
| **app (Next.js)**                              | `wget` sur `:3000/api/health` toutes les 30s | 1.0 CPU / 512 MB max | 40s          |
| **worker (Puppeteer)**                         | `wget` sur `:9090/health` toutes les 30s     | 1.0 CPU / 1 GB max   | 30s          |
| **postgres** _(profile `local-db` uniquement)_ | `pg_isready` toutes les 10s                  | Non définies         | —            |

> **Note :** En production, la base de données est **Neon PostgreSQL serverless** (managed, externe). Le service `postgres` du `docker-compose.yml` est activé uniquement en dev local via le profile `local-db`.

**Politique de redémarrage :** `restart: unless-stopped` sur tous les services (nginx, app, worker, postgres), garantissant que les conteneurs redémarrent automatiquement après un crash sauf arrêt manuel.

**Injection des secrets :** Les variables sensibles (`DATABASE_URL`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`) sont injectées au runtime via l'environnement Docker, sans être embarquées dans l'image. Un fichier `.env.example` documenté à la racine du repo liste toutes les variables requises.

**Profils Docker Compose :** Les services d'observabilité (Prometheus, Grafana, Loki, etc.) sont isolés via `profiles: ["observability"]` et ne démarrent qu'avec `docker compose --profile observability up -d`. Le service Postgres local est isolé via `profiles: ["local-db"]`. Cette séparation permet de démarrer uniquement l'app + le worker en production sans embarquer la stack monitoring sur la même machine.

### 2.5 Dockerfiles Multi-Stage : Optimisation et Sécurité

Les deux applications (`frontend` et `worker`) utilisent des **Dockerfiles multi-stage** pour minimiser la taille des images finales et appliquer le principe du moindre privilège.

| Image                | Base             | Stages                               | Taille finale           | Utilisateur runtime           |
| -------------------- | ---------------- | ------------------------------------ | ----------------------- | ----------------------------- |
| **Frontend Next.js** | `node:22-alpine` | 4 (`base → deps → builder → runner`) | ~180 MB                 | `nextjs` (UID 1001, non-root) |
| **Worker Puppeteer** | `node:20-alpine` | 2 (`builder → runner`)               | ~420 MB (avec Chromium) | `worker` (UID 1001, non-root) |

**Optimisations clés :**

- **Next.js standalone output** (`output: 'standalone'`) — n'embarque que les dépendances strictement nécessaires au runtime (pas les `devDependencies`)
- **Worker** : Chromium installé via le package Alpine système (`apk add chromium`) au lieu de télécharger le binaire Puppeteer (~150 MB économisés). Variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` + `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- **Multi-arch buildx** : QEMU émule ARM64 sur runners GitHub x86 → images compatibles Oracle Cloud A1.Flex (ARM)
- **Cache de build GitHub Actions** (`cache-from: type=gha, scope=frontend`) → builds 3-5× plus rapides après la première exécution
- **Utilisateur non-root** : `addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs` puis `USER nextjs` à la fin → si l'app est compromise, l'attaquant n'a pas de privilèges root sur le conteneur

### 2.6 HTTPS / TLS : Chiffrement du trafic en transit

Toutes les connexions externes vers l'application sont chiffrées en **TLS 1.2/1.3** (configuration Mozilla "Intermediate" 2024) :

| Aspect                  | Implémentation                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Protocoles**          | TLS 1.2 et TLS 1.3 uniquement (TLS 1.0/1.1/SSL désactivés)                        |
| **Cipher suites**       | ECDHE + AES-GCM + ChaCha20-Poly1305 (forward secrecy obligatoire)                 |
| **Redirect HTTP→HTTPS** | Port 80 retourne `301 Moved Permanently` vers `https://`                          |
| **HSTS**                | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2 ans) |
| **OCSP Stapling**       | Activé pour réduire la latence de vérification du certificat                      |
| **HTTP/2**              | Activé sur le port 443 (`http2 on`)                                               |
| **Certificat**          | Let's Encrypt via Certbot (renouvelé automatiquement tous les 60 jours)           |
| **Challenge ACME**      | Webroot HTTP-01 (`/.well-known/acme-challenge/`) servi sur le port 80             |
| **Alternative**         | Cloudflare Origin Certificate (15 ans) en mode SSL/TLS Full (strict)              |

**Headers de sécurité supplémentaires** (envoyés sur toutes les réponses HTTPS) :

- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff` (anti MIME-sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` (désactive les API sensibles)

> **Score attendu sur SSL Labs / Mozilla Observatory : A+** (configuration validée contre les recommandations Mozilla SSL 2024).

---

## 3. Pipeline CI/CD : du `git push` au déploiement en production

### 3.1 Philosophie : "Shift Left" Security

Le principe du **Shift Left** consiste à détecter les problèmes le plus tôt possible dans le pipeline. Aucun code vulnérable ou non testé ne doit atteindre la production.

**Pipeline complète (`deploy.yml`) :**

```

git push main
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : Build & Push Docker Images (Frontend + Worker) │
│ ─ Multi-architecture : linux/amd64 + linux/arm64 (QEMU + Buildx) │
│ ─ Image Frontend : ghcr.io/<user>/<repo>:sha-XXXXX │
│ ─ Image Worker : ghcr.io/<user>/<repo>-worker:sha-XXXXX │
│ ─ Cache Buildx GHA pour accélérer les builds │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : Scan de Vulnérabilités (Trivy — BLOQUANT) │
│ ─ Scan CRITICAL → exit-code 1 (bloque le pipeline si vulnérabilité trouvée)│
│ ─ Scan HIGH + CRITICAL → audit (non-bloquant mais remonté dans GitHub Sec) │
│ ─ Scan SARIF → upload vers l'onglet Security de GitHub │
│ ─ Les DEUX images sont scannées (frontend + worker) via matrix strategy │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : Migrations Base de Données │
│ ─ Script idempotent avec checksum SHA-256 par fichier │
│ ─ Verrou applicatif Postgres (`pg_try_advisory_lock`) │
│ → empêche 2 exécutions concurrentes (ex: 2 workflows qui se chevauchent) │
│ ─ Règle expand/contract : chaque migration reste rétrocompatible │
│ avec la version précédente du code pendant ~60s │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4 : Déploiement Coolify (Frontend + Worker) │
│ ─ Webhook Coolify avec retry 3× (backoff 10s) │
│ ─ Snapshot du SHA précédent via `/api/health` pour rollback futur │
│ ─ Déclenchement des DEUX ressources (app + worker) en parallèle │
└────────────────────────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 5 : Smoke Test Post-Déploiement │
│ ─ 10 tentatives × 30s sur `/api/health` │
│ ─ Vérifie que la nouvelle version répond correctement │
│ ─ Si OK → marque le SHA comme "déployé avec succès" (variable GitHub) │
│ ─ Si KO → déclenche le rollback automatique │
└────────────────────────────────────────────────────────────────────────────┘
│
├──▶ ✅ Succès → Marque `LAST_DEPLOYED_SHA` → Pipeline terminé
│
└──▶ ❌ Échec → Rollback automatique
│
▼
┌─────────────────────────────────────────────────────────┐
│ ROLLBACK : API Coolify (PATCH + Redeploy) │
│ ─ Récupère le SHA précédent (health → fallback variable) │
│ ─ PATCH `docker_registry_image_tag` → SHA précédent │
│ ─ POST `/api/v1/deploy?force=true` │
│ → Retour à la version stable en < 2 minutes │
└─────────────────────────────────────────────────────────┘

```

### 3.2 Pourquoi ce pipeline est professionnel

| Caractéristique                   | Ce que ça apporte concrètement                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Multi-arch ARM/AMD64**          | L'image tourne aussi bien sur Oracle ARM (gratuit) que sur x86 (CI/local)            |
| **Scan bloquant CRITICAL**        | Aucune image avec CVE critique ne peut atteindre la production                       |
| **Migrations avec advisory lock** | 2 workflows qui se chevauchent ne corrompent pas la base                             |
| **Smoke test + rollback**         | Si le déploiement casse l'app, le système revient automatiquement à la version saine |
| **SHA tracking**                  | On sait exactement quel commit tourne en prod, ce qui permet un rollback précis      |
| **Retry webhook 3×**              | Évite les faux positifs de déploiement dus à un timeout réseau temporaire            |

### 3.3 Workflows additionnels

En plus du pipeline principal (`deploy.yml`), plusieurs workflows spécialisés tournent en parallèle :

| Workflow                  | Déclencheur                               | Rôle                                                            |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `ci.yml`                  | `push` / `PR` sur `main`/`develop`        | ESLint + TypeScript strict (`tsc --noEmit`) + Vitest unit tests |
| `security.yml`            | `push` + `cron` hebdo (lundi 6h UTC)      | npm audit + Trivy (vuln/secret/misconfig) + Semgrep + Gitleaks  |
| `chrome-extension-ci.yml` | `push` sur `linkedin-chrome-extension/**` | Lint, build et package validation de l'extension Chrome         |
| `worker-ci.yml`           | `push` sur `linkedin-agent-worker/**`     | Build et tests du worker Puppeteer (TypeScript compile)         |
| `deploy-staging.yml`      | `push` sur `develop`                      | Déploiement automatique vers l'environnement de staging         |
| `e2e.yml`                 | `push` sur `main`                         | Tests End-to-End avec Playwright (Chromium headless)            |
| `lighthouse.yml`          | `push` sur `main`                         | Audit performance Lighthouse du frontend (Performance/A11y/SEO) |
| `backup-restore-test.yml` | `cron` hebdo (dimanche 3h UTC)            | Restore du dernier backup sur Postgres jetable + vérifications  |

---

## 4. Observabilité : "Vous ne pouvez pas améliorer ce que vous ne mesurez pas"

### 4.1 La stack complète

| Service           | Rôle                                  | Ce qu'il mesure                                                      |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------- |
| **Prometheus**    | Collecteur de métriques (time-series) | Uptime, mémoire, pool DB, actions traitées, workers actifs           |
| **Grafana**       | Visualisation & Dashboards            | Dashboards pré-provisionnés : app health, worker status, queue depth |
| **Alertmanager**  | Routage des alertes                   | Envoie les alertes vers Discord selon leur sévérité                  |
| **Loki**          | Agrégation de logs                    | Centralise les logs de tous les conteneurs                           |
| **Promtail**      | Agent de collecte de logs             | Pousse les logs Docker vers Loki                                     |
| **Uptime Kuma**   | Monitoring externe (blackbox)         | Ping HTTPS depuis l'extérieur, détecte les pannes réseau             |
| **cAdvisor**      | Métriques conteneurs Docker           | CPU/RAM/disk par conteneur                                           |
| **Node Exporter** | Métriques système VM                  | CPU/RAM/disque de la VM Oracle elle-même                             |

### 4.2 Les 10 règles d'alerte définies

```yaml
# Extrait de observability/alerts.yml
groups:
  - name: app-health
    rules:
      - alert: AppDown # CRITICAL — l'app ne répond plus
        expr: up == 0
        for: 2m
      - alert: DatabaseDown # CRITICAL — la DB est injoignable
        expr: db_up == 0
        for: 2m
      - alert: HighMemoryUsage # WARNING — heap > 90%
        expr: heap_used / heap_total > 0.9
        for: 10m

  - name: worker-health
    rules:
      - alert: WorkerDown # CRITICAL
      - alert: WorkerStale # CRITICAL — ne poll plus depuis 5 min
      - alert: NoWorkersAlive # CRITICAL — aucun worker actif
      - alert: WorkerConsecutiveErrors # WARNING — > 5 erreurs de suite

  - name: queue
    rules:
      - alert: QueueBacklog # WARNING — > 500 actions en attente

  - name: host
    rules:
      - alert: HighCPU # WARNING — CPU > 90%
      - alert: LowDisk # CRITICAL — disque < 10%
```

**Pourquoi c'est important :** sans alerting, une panne peut durer des heures avant d'être détectée. Avec ces règles, le développeur est notifié en **2-5 minutes** via Discord.

### 4.3 Sécurisation de `/api/metrics`

L'endpoint `/api/metrics` expose des données potentiellement sensibles (nombre de prospects, taille de la queue). Il est protégé par **bearer token** avec comparaison à temps constant (`crypto.timingSafeEqual`) pour prévenir les attaques par timing.

```typescript
// Extrait de app/api/metrics/route.ts
const provided = Buffer.from(token);
const expected = Buffer.from(process.env.METRICS_BEARER_TOKEN);
if (provided.length !== expected.length) return false;
return crypto.timingSafeEqual(provided, expected); // évite les timing attacks
```

### 4.4 Provisioning Grafana automatique

Grafana est livré avec une **configuration en code** (Infrastructure as Code) :

- **Datasources** (`observability/grafana/provisioning/datasources/datasources.yml`) : Prometheus + Loki configurés automatiquement au démarrage
- **Dashboards** (`observability/grafana/provisioning/dashboards/dashboards.yml`) : le dashboard `linkedin-agent-overview.json` est chargé automatiquement (pas de configuration manuelle requise)
- **Hardening** :
  - `GF_USERS_ALLOW_SIGN_UP=false` (pas d'inscription publique)
  - `GF_AUTH_ANONYMOUS_ENABLED=false` (pas d'accès anonyme)
  - `GF_SECURITY_COOKIE_SECURE=true` (cookies en HTTPS uniquement)
  - `GF_SECURITY_STRICT_TRANSPORT_SECURITY=true` (HSTS)
  - **Anti-pattern bloqué :** `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:?GRAFANA_PASSWORD requis (jamais "admin")}` — si la variable n'est pas définie ou vaut `admin`, le conteneur **refuse de démarrer**
  - Port bindé sur `127.0.0.1:3001` (pas exposé sur internet, accès via tunnel SSH ou reverse proxy)

### 4.5 Configuration Loki & Promtail

| Composant      | Configuration clé                                                               |
| -------------- | ------------------------------------------------------------------------------- |
| **Loki**       | Single-binary, stockage `filesystem` (pas de S3 = 0 €), schema TSDB v13         |
| **Rétention**  | 720 heures (30 jours) de logs                                                   |
| **Auth**       | `auth_enabled: false` (accès restreint au réseau Docker interne `linkedin-net`) |
| **Promtail**   | Docker service discovery via `/var/run/docker.sock` (read-only)                 |
| **Relabeling** | Labels Docker auto-extraits : `container`, `service`, `stream`, `project`       |
| **Push**       | Logs envoyés en HTTP à `http://loki:3100/loki/api/v1/push`                      |

### 4.6 Routage Alertmanager

Les alertes Prometheus sont routées par sévérité :

```yaml
# Extrait de observability/alertmanager.yml
route:
  receiver: "default"
  group_by: ["alertname", "service"] # Dédoublonnage par alerte+service
  group_wait: 30s # Attendre 30s avant 1ère notif (regroupement)
  group_interval: 5m # Min 5 min entre 2 notifs du même groupe
  repeat_interval: 12h # Répéter une alerte non résolue toutes les 12h
  routes:
    - matchers: [severity = "critical"]
      receiver: "critical" # → webhook Discord channel #alerts-critical
    - matchers: [severity = "warning"]
      receiver: "warnings" # → webhook Discord channel #alerts-warnings

inhibit_rules:
  # Une alerte CRITICAL inhibe les WARNING sur le même service
  - source_matchers: [severity = "critical"]
    target_matchers: [severity = "warning"]
    equal: ["alertname", "service"]
```

---

## 5. Sécurité et Hardening

### 5.1 Mesures de sécurité implémentées

| Couche                      | Mesure                                                           | Fichier source                                   |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| **Images Docker**           | Scan Trivy bloquant CRITICAL                                     | `.github/workflows/deploy.yml`                   |
| **Registry**                | GHCR privée (token GitHub requis)                                | `deploy.yml`                                     |
| **Métriques**               | Bearer token sur `/api/metrics`                                  | `app/api/metrics/route.ts`                       |
| **Backups**                 | Chiffrement GPG AES256 + vérification round-trip                 | `.github/workflows/backup.yml`                   |
| **Conteneurs**              | cAdvisor sans `privileged: true` (capabilities minimales)        | `docker-compose.yml`                             |
| **Dashboards**              | Grafana refuse le mot de passe "admin", ports bindés `127.0.0.1` | `docker-compose.yml`                             |
| **Secrets**                 | `observability/secrets/` ignoré par Git                          | `.gitignore`                                     |
| **Code**                    | Gitleaks + Semgrep + npm audit dans la CI                        | `.github/workflows/security.yml`                 |
| **TLS**                     | TLS 1.2/1.3, HSTS 2 ans, OCSP stapling, ciphers Mozilla 2024     | `nginx.conf`                                     |
| **Réseau VM**               | Security Lists Oracle + UFW + SSH key-only + Fail2ban            | `docs/SECURITY.md`                               |
| **Conteneurs (app/worker)** | Utilisateur non-root UID 1001, multi-stage builds                | `Dockerfile`, `linkedin-agent-worker/Dockerfile` |

### 5.2 Principe du moindre privilège

cAdvisor (qui lit les stats des conteneurs) tourne avec uniquement :

- `cap_drop: ALL` (supprime tous les privilèges par défaut)
- `cap_add: SYS_PTRACE, DAC_READ_SEARCH` (ajoute uniquement ce qui est nécessaire)
- `security_opt: no-new-privileges:true` (empêche l'escalade de privilèges)

Avant : `privileged: true` (= root total sur l'hôte, dangereux).

### 5.3 Sécurité réseau de la VM Oracle Cloud

La sécurité périmétrique de la VM est assurée par **trois couches successives** (defense-in-depth). Le détail complet est documenté dans `docs/SECURITY.md`.

#### Couche 1 — Security Lists Oracle Cloud (firewall niveau IaaS)

| Direction | Port | Source          | Usage                             |
| --------- | ---- | --------------- | --------------------------------- |
| Ingress   | 22   | `<IP admin>/32` | SSH (restreint à l'IP de l'admin) |
| Ingress   | 80   | `0.0.0.0/0`     | HTTP (redirect 301 vers HTTPS)    |
| Ingress   | 443  | `0.0.0.0/0`     | HTTPS (trafic principal)          |
| Ingress   | 8000 | `<IP admin>/32` | Coolify UI (admin uniquement)     |
| Egress    | TOUS | `0.0.0.0/0`     | Sortie DB (Neon), GHCR, R2, etc.  |

Tous les autres ports sont **bloqués par défaut**.

#### Couche 2 — UFW (firewall OS Ubuntu)

En complément des Security Lists Oracle, UFW est activé sur l'OS pour redondance :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp 80/tcp 443/tcp
sudo ufw allow from <IP_ADMIN> to any port 8000
sudo ufw enable
```

#### Couche 3 — Hardening SSH + Fail2ban

Fichier `/etc/ssh/sshd_config` :

```
PermitRootLogin no                    # Pas de login root direct
PasswordAuthentication no             # Auth par clé uniquement (pas de mot de passe)
MaxAuthTries 3                        # Coupe la connexion après 3 échecs
ClientAliveInterval 300               # Déconnexion auto si inactif > 5 min
```

**Fail2ban** banni automatiquement toute IP qui tente plus de 3 connexions SSH échouées en 10 minutes (ban d'1 heure).

#### Mises à jour de sécurité automatiques

`unattended-upgrades` applique automatiquement les patches de sécurité Ubuntu sans intervention manuelle. Audit régulier via Lynis (mensuel) et Trivy filesystem scan (hebdomadaire dans `security.yml`).

---

## 6. Backups et Récupération de Données

### 6.1 Stratégie de backup

```
Tous les jours à 02h UTC
    │
    ├──▶ Backup PostgreSQL → tar.gz
    │       ├──▶ Chiffrement GPG AES256 (vérification round-trip avant upload)
    │       ├──▶ Upload vers Cloudflare R2 (rétention 90 jours)
    │       └──▶ Artifact GitHub (rétention 30 jours)
    │
    └──▶ Dimanche 03h UTC → Test de restore
            ├──▶ Restore sur Postgres jetable (Docker temporaire)
            ├──▶ Vérifie tables clés : prospects, linkedin_actions_queue, worker_heartbeats, _migrations
            ├──▶ Vérifie nombre de lignes + cross-check avec manifest
            └──▶ Vérifie déchiffrement GPG
```

### 6.2 Pourquoi le test de restore est critique

Un backup non testé est **inutile**. Notre test vérifie :

1. **Intégrité structurelle** : les 4 tables clés existent
2. **Intégrité des données** : au moins 1 ligne restaurée
3. **Cohérence manifest** : le nombre de lignes correspond au backup d'origine
4. **Chiffrement** : le backup chiffré se déchiffre correctement

**Coût : 0 €** (backup sur R2 + restore test sur runner GitHub Actions).

---

## 7. Analyse des Coûts

| Service                         | Coût mensuel | Justification                                    |
| ------------------------------- | ------------ | ------------------------------------------------ |
| **Oracle Cloud VM**             | **0 €**      | Always Free Tier — ARM A1.Flex 4 CPU / 24 GB RAM |
| **Neon PostgreSQL**             | **0 €**      | Free Tier — 500 MB, serverless                   |
| **GitHub Actions**              | **0 €**      | 2000 minutes/mois gratuites (suffisant)          |
| **GitHub Container Registry**   | **0 €**      | Public = gratuit                                 |
| **Cloudflare R2**               | **0 €**      | 10 GB gratuits + 0 € de sortie                   |
| **Coolify**                     | **0 €**      | Open-source, self-hosted                         |
| **Prometheus + Grafana + Loki** | **0 €**      | Open-source                                      |
| **Total**                       | **0 €**      |                                                  |

**Comparaison :** Une infrastructure équivalente sur AWS (EC2 t3.medium + RDS + S3 + CloudWatch) coûterait **~60-80 €/mois**.

---

## 8. Résultats et Validation

### 8.1 Ce qui fonctionne aujourd'hui

| Test                               | Résultat | Preuve                                         |
| ---------------------------------- | -------- | ---------------------------------------------- |
| Build multi-arch (ARM + AMD64)     | ✅       | Logs GitHub Actions + images GHCR              |
| Scan Trivy bloquant                | ✅       | Workflow échoue si CVE CRITICAL                |
| Migration idempotente + lock       | ✅       | Exécution multiple = 0 migration appliquée     |
| Déploiement auto frontend + worker | ✅       | 2 ressources Coolify déployées en parallèle    |
| Smoke test post-déploiement        | ✅       | 10× retry sur `/api/health`                    |
| Rollback auto sur échec            | ✅       | API Coolify restore le SHA précédent           |
| Backup chiffré quotidien           | ✅       | Fichiers `.tar.gz.gpg` sur R2                  |
| Restore test hebdomadaire          | ✅       | Tables + lignes + manifest vérifiés            |
| Métriques Prometheus scrapeées     | ✅       | Dashboards Grafana en temps réel               |
| Alertes Discord                    | ✅       | Notifications en < 5 min sur panne             |
| Uptime externe                     | ✅       | Uptime Kuma monitoring HTTPS                   |
| BI Dashboard déployé               | ✅       | 6 endpoints `/api/bi/*` + dashboards Grafana   |
| HTTPS / TLS 1.2+1.3 (HSTS, A+)     | ✅       | Test SSL Labs, redirect 301 fonctionnel        |
| Sécurité réseau VM (3 couches)     | ✅       | Security Lists + UFW + SSH key-only + Fail2ban |
| Conteneurs en non-root             | ✅       | `id` dans le conteneur retourne UID 1001       |
| Lint + TypeCheck + Vitest CI       | ✅       | `ci.yml` exécuté sur chaque PR                 |

### 8.2 Défis rencontrés et solutions

| Défi                                            | Impact                             | Solution apportée                                        |
| ----------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Oracle Cloud = ARM, GHCR = AMD64 par défaut     | L'image ne démarrait pas sur la VM | Build multi-arch avec QEMU + Buildx                      |
| Prometheus ne voyait pas les conteneurs Coolify | Aucune métrique app/worker         | Scrape via `host.docker.internal:9090` + bearer token    |
| Rollback via webhook = faux positif             | Le "rollback" ne restaurait rien   | Rollback réel via API Coolify (`PATCH` tag + redeploy)   |
| Migrations concurrentes possibles               | Risque de corruption DB            | Advisory lock Postgres (`pg_try_advisory_lock`)          |
| cAdvisor en `privileged: true`                  | Risque sécurité majeur             | Capabilities minimales (`SYS_PTRACE`, `DAC_READ_SEARCH`) |
| Trafic HTTP non chiffré initialement            | Risque MITM, données en clair      | TLS 1.2/1.3 + HSTS + redirect 301 + ciphers Mozilla 2024 |
| SSH avec password = surface d'attaque           | Bruteforce possible                | Auth par clé uniquement + Fail2ban + IP whitelist        |
| Pas de `.env.example` initialement              | Onboarding difficile               | Création de `.env.example` documentant toutes les vars   |

---

## 9. Conclusion et Perspectives

### 9.1 Bilan

L'infrastructure cloud développée répond à **tous les objectifs initiaux** :

- ✅ **Disponibilité 24/7** via VM Oracle + Coolify
- ✅ **CI/CD automatisé** de qualité professionnelle (multi-arch, scan, rollback)
- ✅ **Observabilité complète** (métriques, logs, alertes, uptime externe)
- ✅ **Résilience** (rollback auto, backups testés, migrations verrouillées)
- ✅ **Sécurité** (scan bloquant, chiffrement, moindre privilège)
- ✅ **Gratuité totale** (0 €/mois)

### 9.2 Ce qui distingue ce travail

Pour un jury, les points forts à souligner :

1. **Pipeline « Shift Left » complet** : sécurité dès la CI, pas seulement en production
2. **Rollback atomique et vérifiable** : pas de "déploiement et on verra", mais "déploiement avec filet de sécurité"
3. **Migrations DB industrialisées** : verrou + checksum + expand/contract (pattern utilisé par les grandes entreprises)
4. **Observabilité open-source professionnelle** : équivalent à Datadog/New Relic mais gratuit
5. **Test de restore hebdomadaire** : rarement implémenté dans des projets étudiants

### 9.3 Perspectives

| Amélioration          | Description                                              | Priorité |
| --------------------- | -------------------------------------------------------- | -------- |
| HA multi-VM           | 2 VMs Oracle + load balancing (nécessite budget > 0 €)   | Moyenne  |
| Tests E2E sur staging | Playwright contre l'URL staging avant merge sur `main`   | Haute    |
| Secret manager        | Doppler ou HashiCorp Vault au lieu de GitHub Secrets     | Moyenne  |
| Cosign                | Signature des images Docker pour garantir l'authenticité | Moyenne  |

### 9.4 Limitations connues (transparence)

Un rapport honnête doit reconnaître ses limitations. Les points suivants sont des compromis assumés du fait des contraintes du projet :

| Limitation                                     | Cause                                   | Mitigation actuelle                                                |
| ---------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| **SPOF VM unique**                             | Budget 0 € (1 seule VM Oracle)          | Backups quotidiens + IaC (re-déploiement < 30 min sur nouvelle VM) |
| **Pas de CDN globalement**                     | Cloudflare Free Tier seulement          | Cache nginx local (1 GB) suffit pour la charge actuelle            |
| **Neon Free Tier limité à 500 MB**             | Choix du Free Tier                      | Monitoring de la taille DB + alerte à 80% (à ajouter)              |
| **Webhook Discord en clair dans Alertmanager** | Alertmanager ne supporte pas envsubst   | URL placée dans `observability/secrets/` (gitignoré)               |
| **`prometheus.yml` non templatisé**            | Prometheus ne supporte pas les env vars | Config patcheée par script `envsubst` au déploiement               |
| **2000 min/mois GitHub Actions**               | Free Tier GitHub                        | Workflows optimisés avec cache (~150 min/mois consommées)          |
| **Pas de signature d'images (Cosign)**         | Complexité vs valeur ajoutée PFE        | Prévu en perspective (§9.3)                                        |
| **Coolify = SPOF orchestrateur**               | Self-hosted single-instance             | Documentation de bootstrap manuel en cas de panne Coolify          |

### 9.5 Références bibliographiques

- **Beyer, B., Jones, C., Petoff, J., Murphy, N. R.** (2016). _Site Reliability Engineering: How Google Runs Production Systems_. O'Reilly. — inspiration pour les SLO, l'observabilité et les post-mortems.
- **Wiggins, A.** (2017). _The Twelve-Factor App_. https://12factor.net — guide pour les apps cloud-native (config par env vars, logs comme stream, etc.).
- **OWASP Foundation** (2024). _OWASP Top 10 — 2021_. https://owasp.org/Top10/ — base des règles Semgrep utilisées dans `security.yml`.
- **Mozilla Foundation** (2024). _Mozilla SSL Configuration Generator_. https://ssl-config.mozilla.org — source de la configuration TLS du `nginx.conf`.
- **CIS** (2023). _CIS Docker Benchmark v1.6.0_. — référence pour le hardening des conteneurs (USER non-root, cap_drop, no-new-privileges).
- **Humble, J., Farley, D.** (2010). _Continuous Delivery_. Addison-Wesley. — base théorique du pipeline CI/CD avec rollback automatique.
- **Prometheus Documentation** (2024). https://prometheus.io/docs/ — référence pour les règles d'alertes et l'exposition format.

---

## Annexes

### A. Extrait du pipeline CI/CD `deploy.yml`

```yaml
# .github/workflows/deploy.yml (extrait du job build-and-push)
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
          platforms: linux/amd64,linux/arm64 # Multi-arch ARM/AMD64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha,scope=frontend # Cache GHA pour speedup
          cache-to: type=gha,mode=max,scope=frontend
```

### B. Configuration Prometheus (extrait `observability/prometheus.yml`)

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
  - job_name: "workers"
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:9090"]
        labels: { service: linkedin-worker }

  - job_name: "nextjs-app"
    metrics_path: /api/metrics
    scheme: https
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/metrics_token
    static_configs:
      - targets: ["app.example.com"]
        labels: { service: linkedin-frontend }

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
```

### C. Règles d'alerte Prometheus (extrait `observability/alerts.yml`)

```yaml
groups:
  - name: app-health
    rules:
      - alert: AppDown
        expr: up{job="nextjs-app"} == 0
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "Application Next.js inaccessible"
          description: "L'app ne répond plus depuis {{ $for }}."

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

### D. Table des secrets requis

| Secret                         | Requis ?   | Rôle                                       |
| ------------------------------ | ---------- | ------------------------------------------ |
| `DATABASE_URL`                 | Oui        | Connexion Neon                             |
| `OPENAI_API_KEY`               | Oui        | API OpenAI                                 |
| `COOLIFY_WEBHOOK_URL`          | Oui        | Déploiement frontend                       |
| `COOLIFY_WORKER_WEBHOOK_URL`   | Oui        | Déploiement worker                         |
| `COOLIFY_TOKEN`                | Oui        | Auth API Coolify                           |
| `COOLIFY_BASE_URL`             | Recommandé | Rollback API                               |
| `COOLIFY_APP_UUID`             | Recommandé | Rollback API                               |
| `COOLIFY_WORKER_UUID`          | Recommandé | Rollback API                               |
| `PROD_URL`                     | Recommandé | Smoke test + snapshot                      |
| `METRICS_BEARER_TOKEN`         | Recommandé | Auth `/api/metrics`                        |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Recommandé | Chiffrement backups                        |
| `R2_ACCESS_KEY_ID`             | Optionnel  | Upload backups                             |
| `GH_PAT_VARIABLES`             | Optionnel  | MAJ `LAST_DEPLOYED_SHA`                    |
| `GRAFANA_USER`                 | Oui (obs.) | Compte admin Grafana                       |
| `GRAFANA_PASSWORD`             | Oui (obs.) | Password admin Grafana (refusé si "admin") |
| `DISCORD_WEBHOOK_URL`          | Recommandé | Routage des alertes Alertmanager           |

### E. Captures d'écran et preuves visuelles

Pour appuyer le rapport devant le jury, voir le dossier `les rapports/screenshots/` qui contient :

- `01_github_actions_pipeline.png` — exécution complète du workflow `deploy.yml`
- `02_ghcr_images.png` — images multi-arch publiées sur GHCR
- `03_trivy_scan_clean.png` — résultat scan Trivy sans CVE CRITICAL
- `04_coolify_dashboard.png` — vue Coolify des deux ressources déployées
- `05_grafana_overview.png` — dashboard Grafana "LinkedIn Agent Overview"
- `06_prometheus_targets.png` — targets Prometheus tous UP
- `07_alertmanager_routing.png` — alertes regroupées par severity
- `08_uptime_kuma.png` — 99.9% uptime sur 30 jours
- `09_ssl_labs_report.png` — score SSL Labs A+
- `10_backup_r2.png` — backups chiffrés `.tar.gz.gpg` sur Cloudflare R2
- `11_restore_test_logs.png` — exécution réussie de `backup-restore-test.yml`
- `12_rollback_demo.png` — rollback automatique après smoke test échoué

### F. Métriques quantitatives mesurées

| Indicateur                         | Valeur mesurée             | Outil de mesure          |
| ---------------------------------- | -------------------------- | ------------------------ |
| Temps de build CI complet          | ~4 min 30 s (avec cache)   | GitHub Actions logs      |
| Temps de déploiement total         | ~2 min (du push au prod)   | GitHub Actions + Coolify |
| Taille image Frontend (compressée) | ~180 MB                    | `docker images`          |
| Taille image Worker (compressée)   | ~420 MB                    | `docker images`          |
| Latence P95 `/api/health`          | < 50 ms                    | Prometheus histogram     |
| Uptime production (30 jours)       | 99.9%                      | Uptime Kuma              |
| MTTR (rollback automatique)        | < 2 min                    | Logs `deploy.yml`        |
| Taille backup quotidien (chiffré)  | ~5-15 MB                   | Logs `backup.yml`        |
| Workflows GitHub Actions/mois      | ~150 min consommées / 2000 | GitHub billing           |
| Coût mensuel infrastructure        | **0,00 €**                 | Factures Oracle/Neon/CF  |
