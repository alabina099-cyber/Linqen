# 🚀 DevOps Pipeline — LinkedIn Agent

Pipeline CI/CD complet basé sur **GitHub Actions** pour automatiser tests, sécurité, build, déploiement et backups.

## 📋 Vue d'ensemble

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  git push    │──▶│   CI Tests   │──▶│   Security   │──▶│    Deploy    │
└──────────────┘   │ Lint+TS+Build│   │ Audit + CodeQL│   │ Docker + GHCR │
                   └──────────────┘   └──────────────┘   └──────────────┘

  ┌──────────────────────────────────────────────────────┐
  │  Cron quotidien (2h UTC) → Backup PostgreSQL → S3   │
  └──────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────┐
  │  Dependabot → MAJ deps hebdo (lundi 6h Paris)        │
  └──────────────────────────────────────────────────────┘
```

## 📁 Workflows configurés

| Fichier | Déclencheur | Description |
|---------|-------------|-------------|
| `.github/workflows/ci.yml` | Push/PR sur main, develop | Lint ESLint + TypeCheck + Build Next.js |
| `.github/workflows/security.yml` | Push/PR + cron lundi 6h | npm audit + CodeQL + Gitleaks + security-audit custom |
| `.github/workflows/deploy.yml` | Push sur main | Build Docker + Push vers GHCR + Deploy Coolify |
| `.github/workflows/backup.yml` | Cron quotidien 2h UTC | Backup PostgreSQL → artefact GitHub |
| `.github/dependabot.yml` | Auto hebdo | Mise à jour automatique des dépendances |

## 🔐 Secrets GitHub à configurer

Va dans **Settings → Secrets and variables → Actions** et ajoute :

### Obligatoires
- `DATABASE_URL` — Chaîne de connexion PostgreSQL Neon
- `OPENAI_API_KEY` — Clé OpenAI pour build/test

### Pour le déploiement (optionnels)
- `COOLIFY_WEBHOOK_URL` — URL du webhook Coolify
- `COOLIFY_TOKEN` — Token Bearer Coolify

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
2. **Custom Security Audit** — Lance `scripts/security-audit.js` (XSS, CORS, rate limit)
3. **CodeQL** — Analyse statique GitHub (détection failles JS/TS)
4. **Gitleaks** — Détection secrets fuités dans le code

**Bénéfice :** Critique pour un agent qui touche aux comptes LinkedIn.

### 3️⃣ Deploy (`deploy.yml`)
**Quand ?** Push sur `main` ou déclenchement manuel.

**Étapes :**
1. **Build Docker** — Construit l'image avec cache GHA
2. **Push vers GHCR** — `ghcr.io/<user>/<repo>:latest` + tag SHA
3. **Trigger Coolify** — Webhook qui redéploie automatiquement

**Bénéfice :** Zero-downtime deploy reproductible.

### 4️⃣ Backup (`backup.yml`)
**Quand ?** Tous les jours à 2h UTC.

**Étapes :**
1. Lance `npm run backup` (ton script existant)
2. Upload le dossier `backups/backup-YYYY-MM-DD/` comme artefact GitHub
3. Rétention : 30 jours

**Bénéfice :** Récupération possible en cas de corruption DB.

### 5️⃣ Dependabot (`dependabot.yml`)
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
- **Tab Actions** sur GitHub → état des runs
- **Tab Security → Code scanning alerts** → failles détectées par CodeQL
- **Tab Pull requests** → PRs Dependabot à merger
- **Tab Packages** → images Docker publiées sur GHCR

## 🚀 Évolutions futures

- **Tests E2E Playwright** — Simuler l'extension Chrome
- **Lighthouse CI** — Score perf frontend
- **Slack/Discord notifications** — Alertes échecs/déploiements
- **Staging environment** — Branch `develop` → env staging séparé
- **Rollback automatique** — Si healthcheck échoue après deploy
