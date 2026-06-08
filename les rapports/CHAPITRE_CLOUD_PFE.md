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

| Contrainte | Impact sur les choix |
|---|---|
| Budget **0 €** | Stack entièrement gratuite (Oracle Free Tier, Neon, Cloudflare R2) |
| Compétences techniques limitées | Choix d'outils simples à déployer (Coolify vs Kubernetes) |
| Données sensibles (mots de passe LinkedIn, emails) | Chiffrement des backups + authentiation des endpoints |
| Scalabilité potentielle | Architecture multi-conteneurs horizontalement scalable |

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
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   ci.yml    │  │ security.yml│  │  deploy.yml  │  │  backup.yml (cron) │ │
│  │ Lint+Test   │  │ Trivy+Semgr │  │ Build+Push+  │  │  GPG+R2 daily      │ │
│  └─────────────┘  └─────────────┘  │ Migrate+Smoke│  └────────────────────┘ │
│                                     │ Rollback     │                          │
│                                     └──────────────┘                          │
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
│   │ Balancer │   │  × N     │   │  × M     │   │  Loki + Promtail       │ │
│   │  :80     │   │  :3000   │   │  :9090   │   │  Uptime Kuma            │ │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   │  Alertmanager           │ │
│        │              │              │          │  cAdvisor + Node Exporter│ │
│        └──────────────┴──────────────┘          └────────────────────────┘ │
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

### 2.2 Choix technologiques justifiés

| Composant | Choix | Alternative rejetée | Pourquoi ce choix |
|---|---|---|---|
| **Cloud Provider** | Oracle Cloud Always Free | AWS/GCP/Azure Free Tier | ARM A1.Flex = 4 CPU + 24 GB permanentement gratuits (supérieur aux offres AWS/GCP) |
| **PaaS / Orchestrateur** | Coolify (self-hosted) | Kubernetes, Docker Swarm | Coolify offre l'expérience Vercel/Render sans la complexité K8s. Déploiement en 2 clics avec webhooks |
| **Database** | Neon PostgreSQL (Free) | Supabase, PlanetScale, RDS | Serverless, branch instantanée, 500 MB gratuit, connexion sans IP whitelist |
| **Registry** | GitHub Container Registry (GHCR) | Docker Hub, ECR | Intégration native GitHub Actions, gratuit pour public, pas de rate-limit |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI | Gratuit (2000 min/mois), matrice de jobs parallèles, intégration GHCR native |
| **Monitoring** | Prometheus + Grafana + Alertmanager | Datadog, New Relic | Gratuit, open-source, pas de limite de séries temporelles, alerting natif |
| **Logs** | Loki + Promtail | ELK, Splunk | Loki est "Prometheus pour les logs" — même langage de requête, stockage efficient |
| **Backups** | rclone → Cloudflare R2 | S3, Google Cloud Storage | R2 = 0 € de sortie (egress), 10 GB gratuits, API S3-compatible |

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
│ ÉTAPE 1 : Build & Push Docker Images (Frontend + Worker)                   │
│ ─ Multi-architecture : linux/amd64 + linux/arm64 (QEMU + Buildx)             │
│ ─ Image Frontend : ghcr.io/<user>/<repo>:sha-XXXXX                         │
│ ─ Image Worker   : ghcr.io/<user>/<repo>-worker:sha-XXXXX                   │
│ ─ Cache Buildx GHA pour accélérer les builds                                │
└────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : Scan de Vulnérabilités (Trivy — BLOQUANT)                        │
│ ─ Scan CRITICAL → exit-code 1 (bloque le pipeline si vulnérabilité trouvée)│
│ ─ Scan HIGH + CRITICAL → audit (non-bloquant mais remonté dans GitHub Sec) │
│ ─ Scan SARIF → upload vers l'onglet Security de GitHub                     │
│ ─ Les DEUX images sont scannées (frontend + worker) via matrix strategy    │
└────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : Migrations Base de Données                                         │
│ ─ Script idempotent avec checksum SHA-256 par fichier                      │
│ ─ Verrou applicatif Postgres (`pg_try_advisory_lock`)                     │
│   → empêche 2 exécutions concurrentes (ex: 2 workflows qui se chevauchent)  │
│ ─ Règle expand/contract : chaque migration reste rétrocompatible           │
│   avec la version précédente du code pendant ~60s                         │
└────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4 : Déploiement Coolify (Frontend + Worker)                          │
│ ─ Webhook Coolify avec retry 3× (backoff 10s)                             │
│ ─ Snapshot du SHA précédent via `/api/health` pour rollback futur          │
│ ─ Déclenchement des DEUX ressources (app + worker) en parallèle           │
└────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 5 : Smoke Test Post-Déploiement                                      │
│ ─ 10 tentatives × 30s sur `/api/health`                                     │
│ ─ Vérifie que la nouvelle version répond correctement                      │
│ ─ Si OK → marque le SHA comme "déployé avec succès" (variable GitHub)      │
│ ─ Si KO → déclenche le rollback automatique                                │
└────────────────────────────────────────────────────────────────────────────┘
    │
    ├──▶ ✅ Succès → Marque `LAST_DEPLOYED_SHA` → Pipeline terminé
    │
    └──▶ ❌ Échec → Rollback automatique
                │
                ▼
        ┌─────────────────────────────────────────────────────────┐
        │ ROLLBACK : API Coolify (PATCH + Redeploy)                │
        │ ─ Récupère le SHA précédent (health → fallback variable)  │
        │ ─ PATCH `docker_registry_image_tag` → SHA précédent       │
        │ ─ POST `/api/v1/deploy?force=true`                        │
        │ → Retour à la version stable en < 2 minutes              │
        └─────────────────────────────────────────────────────────┘
```

### 3.2 Pourquoi ce pipeline est professionnel

| Caractéristique | Ce que ça apporte concrètement |
|---|---|
| **Multi-arch ARM/AMD64** | L'image tourne aussi bien sur Oracle ARM (gratuit) que sur x86 (CI/local) |
| **Scan bloquant CRITICAL** | Aucune image avec CVE critique ne peut atteindre la production |
| **Migrations avec advisory lock** | 2 workflows qui se chevauchent ne corrompent pas la base |
| **Smoke test + rollback** | Si le déploiement casse l'app, le système revient automatiquement à la version saine |
| **SHA tracking** | On sait exactement quel commit tourne en prod, ce qui permet un rollback précis |
| **Retry webhook 3×** | Évite les faux positifs de déploiement dus à un timeout réseau temporaire |

---

## 4. Observabilité : "Vous ne pouvez pas améliorer ce que vous ne mesurez pas"

### 4.1 La stack complète

| Service | Rôle | Ce qu'il mesure |
|---|---|---|
| **Prometheus** | Collecteur de métriques (time-series) | Uptime, mémoire, pool DB, actions traitées, workers actifs |
| **Grafana** | Visualisation & Dashboards | Dashboards pré-provisionnés : app health, worker status, queue depth |
| **Alertmanager** | Routage des alertes | Envoie les alertes vers Discord selon leur sévérité |
| **Loki** | Agrégation de logs | Centralise les logs de tous les conteneurs |
| **Promtail** | Agent de collecte de logs | Pousse les logs Docker vers Loki |
| **Uptime Kuma** | Monitoring externe (blackbox) | Ping HTTPS depuis l'extérieur, détecte les pannes réseau |
| **cAdvisor** | Métriques conteneurs Docker | CPU/RAM/disk par conteneur |
| **Node Exporter** | Métriques système VM | CPU/RAM/disque de la VM Oracle elle-même |

### 4.2 Les 10 règles d'alerte définies

```yaml
# Extrait de observability/alerts.yml
groups:
  - name: app-health
    rules:
      - alert: AppDown        # CRITICAL — l'app ne répond plus
        expr: up == 0
        for: 2m
      - alert: DatabaseDown   # CRITICAL — la DB est injoignable
        expr: db_up == 0
        for: 2m
      - alert: HighMemoryUsage # WARNING — heap > 90%
        expr: heap_used / heap_total > 0.9
        for: 10m

  - name: worker-health
    rules:
      - alert: WorkerDown          # CRITICAL
      - alert: WorkerStale         # CRITICAL — ne poll plus depuis 5 min
      - alert: NoWorkersAlive      # CRITICAL — aucun worker actif
      - alert: WorkerConsecutiveErrors # WARNING — > 5 erreurs de suite

  - name: queue
    rules:
      - alert: QueueBacklog        # WARNING — > 500 actions en attente

  - name: host
    rules:
      - alert: HighCPU             # WARNING — CPU > 90%
      - alert: LowDisk             # CRITICAL — disque < 10%
```

**Pourquoi c'est important :** sans alerting, une panne peut durer des heures avant d'être détectée. Avec ces règles, le développeur est notifié en **2-5 minutes** via Discord.

### 4.3 Sécurisation de `/api/metrics`

L'endpoint `/api/metrics` expose des données potentiellement sensibles (nombre de prospects, taille de la queue). Il est protégé par **bearer token** avec comparaison à temps constant (`crypto.timingSafeEqual`) pour prévenir les attaques par timing.

---

## 5. Sécurité et Hardening

### 5.1 Mesures de sécurité implémentées

| Couche | Mesure | Fichier source |
|---|---|---|
| **Images Docker** | Scan Trivy bloquant CRITICAL | `.github/workflows/deploy.yml` |
| **Registry** | GHCR privée (token GitHub requis) | `deploy.yml` |
| **Métriques** | Bearer token sur `/api/metrics` | `app/api/metrics/route.ts` |
| **Backups** | Chiffrement GPG AES256 + vérification round-trip | `.github/workflows/backup.yml` |
| **Conteneurs** | cAdvisor sans `privileged: true` (capabilities minimales) | `docker-compose.yml` |
| **Dashboards** | Grafana refuse le mot de passe "admin", ports bindés `127.0.0.1` | `docker-compose.yml` |
| **Secrets** | `observability/secrets/` ignoré par Git | `.gitignore` |
| **Code** | Gitleaks + Semgrep + npm audit dans la CI | `.github/workflows/security.yml` |

### 5.2 Principe du moindre privilège

cAdvisor (qui lit les stats des conteneurs) tourne avec uniquement :
- `cap_drop: ALL` (supprime tous les privilèges par défaut)
- `cap_add: SYS_PTRACE, DAC_READ_SEARCH` (ajoute uniquement ce qui est nécessaire)
- `security_opt: no-new-privileges:true` (empêche l'escalade de privilèges)

Avant : `privileged: true` (= root total sur l'hôte, dangereux).

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

| Service | Coût mensuel | Justification |
|---|---|---|
| **Oracle Cloud VM** | **0 €** | Always Free Tier — ARM A1.Flex 4 CPU / 24 GB RAM |
| **Neon PostgreSQL** | **0 €** | Free Tier — 500 MB, serverless |
| **GitHub Actions** | **0 €** | 2000 minutes/mois gratuites (suffisant) |
| **GitHub Container Registry** | **0 €** | Public = gratuit |
| **Cloudflare R2** | **0 €** | 10 GB gratuits + 0 € de sortie |
| **Coolify** | **0 €** | Open-source, self-hosted |
| **Prometheus + Grafana + Loki** | **0 €** | Open-source |
| **Total** | **0 €** | |

**Comparaison :** Une infrastructure équivalente sur AWS (EC2 t3.medium + RDS + S3 + CloudWatch) coûterait **~60-80 €/mois**.

---

## 8. Résultats et Validation

### 8.1 Ce qui fonctionne aujourd'hui

| Test | Résultat | Preuve |
|---|---|---|
| Build multi-arch (ARM + AMD64) | ✅ | Logs GitHub Actions + images GHCR |
| Scan Trivy bloquant | ✅ | Workflow échoue si CVE CRITICAL |
| Migration idempotente + lock | ✅ | Exécution multiple = 0 migration appliquée |
| Déploiement auto frontend + worker | ✅ | 2 ressources Coolify déployées en parallèle |
| Smoke test post-déploiement | ✅ | 10× retry sur `/api/health` |
| Rollback auto sur échec | ✅ | API Coolify restore le SHA précédent |
| Backup chiffré quotidien | ✅ | Fichiers `.tar.gz.gpg` sur R2 |
| Restore test hebdomadaire | ✅ | Tables + lignes + manifest vérifiés |
| Métriques Prometheus scrapeées | ✅ | Dashboards Grafana en temps réel |
| Alertes Discord | ✅ | Notifications en < 5 min sur panne |
| Uptime externe | ✅ | Uptime Kuma monitoring HTTPS |

### 8.2 Défis rencontrés et solutions

| Défi | Impact | Solution apportée |
|---|---|---|
| Oracle Cloud = ARM, GHCR = AMD64 par défaut | L'image ne démarrait pas sur la VM | Build multi-arch avec QEMU + Buildx |
| Prometheus ne voyait pas les conteneurs Coolify | Aucune métrique app/worker | Scrape via `host.docker.internal:9090` + bearer token |
| Rollback via webhook = faux positif | Le "rollback" ne restaurait rien | Rollback réel via API Coolify (`PATCH` tag + redeploy) |
| Migrations concurrentes possibles | Risque de corruption DB | Advisory lock Postgres (`pg_try_advisory_lock`) |
| cAdvisor en `privileged: true` | Risque sécurité majeur | Capabilities minimales (`SYS_PTRACE`, `DAC_READ_SEARCH`) |

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

| Amélioration | Description | Priorité |
|---|---|---|
| HA multi-VM | 2 VMs Oracle + load balancing (nécessite budget > 0 €) | Moyenne |
| Tests E2E sur staging | Playwright contre l'URL staging avant merge sur `main` | Haute |
| Secret manager | Doppler ou HashiCorp Vault au lieu de GitHub Secrets | Moyenne |
| Cosign | Signature des images Docker pour garantir l'authenticité | Moyenne |

---

## Annexes

### A. Schéma du pipeline CI/CD (extrait du fichier `deploy.yml`)

Voir le fichier source : `.github/workflows/deploy.yml`

### B. Configuration Prometheus (extrait)

Voir le fichier source : `observability/prometheus.yml`

### C. Règles d'alerte (extrait)

Voir le fichier source : `observability/alerts.yml`

### D. Table des secrets requis

| Secret | Requis ? | Rôle |
|---|---|---|
| `DATABASE_URL` | Oui | Connexion Neon |
| `OPENAI_API_KEY` | Oui | API OpenAI |
| `COOLIFY_WEBHOOK_URL` | Oui | Déploiement frontend |
| `COOLIFY_WORKER_WEBHOOK_URL` | Oui | Déploiement worker |
| `COOLIFY_TOKEN` | Oui | Auth API Coolify |
| `COOLIFY_BASE_URL` | Recommandé | Rollback API |
| `COOLIFY_APP_UUID` | Recommandé | Rollback API |
| `COOLIFY_WORKER_UUID` | Recommandé | Rollback API |
| `PROD_URL` | Recommandé | Smoke test + snapshot |
| `METRICS_BEARER_TOKEN` | Recommandé | Auth `/api/metrics` |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Recommandé | Chiffrement backups |
| `R2_ACCESS_KEY_ID` | Optionnel | Upload backups |
| `GH_PAT_VARIABLES` | Optionnel | MAJ `LAST_DEPLOYED_SHA` |
