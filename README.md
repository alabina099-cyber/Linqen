# Qlinqen — LinkedIn AI Prospecting Agent

[![CI](https://github.com/dibrilou45/linkedinagent/actions/workflows/ci.yml/badge.svg)](https://github.com/dibrilou45/linkedinagent/actions/workflows/ci.yml)
[![Deploy](https://github.com/dibrilou45/linkedinagent/actions/workflows/deploy.yml/badge.svg)](https://github.com/dibrilou45/linkedinagent/actions/workflows/deploy.yml)
[![Security](https://github.com/dibrilou45/linkedinagent/actions/workflows/security.yml/badge.svg)](https://github.com/dibrilou45/linkedinagent/actions/workflows/security.yml)
[![E2E Tests](https://github.com/dibrilou45/linkedinagent/actions/workflows/e2e.yml/badge.svg)](https://github.com/dibrilou45/linkedinagent/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Agent IA autonome de prospection LinkedIn B2B — automatise recherche, connexion et messagerie avec contrôle humain intégré.

---

## 🎯 Fonctionnalités

- **Agent IA LangChain** (GPT-4o-mini) — conversation naturelle pour piloter la prospection
- **Extension Chrome** — exécution sécurisée des actions LinkedIn depuis le navigateur
- **CRM Prospects intégré** — pipeline Kanban, scoring automatique, historique
- **Campagnes de prospection** — workflows automatisés avec follow-ups
- **Queue d'approbation** — chaque action LinkedIn validée avant exécution
- **Rate limiting intelligent** — respecte les limites LinkedIn (80 connexions/j, 50 messages/j)
- **Dashboard analytique** — métriques de conversion en temps réel

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  UTILISATEUR (navigateur)                                       │
│  Next.js 16 Frontend  ←→  Chrome Extension (content.js)        │
└───────────────────┬─────────────────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────────────────┐
│  BACKEND (API Routes Next.js)                                   │
│  /api/agent  ←→  LangChain Agent  ←→  OpenAI GPT-4o-mini       │
│  /api/prospects  /api/campaigns  /api/linkedin-actions          │
│  Middleware: Rate Limit 100 req/min + CORS Whitelist + HSTS     │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│  DATA LAYER                                                     │
│  PostgreSQL (Neon serverless)  +  LinkedIn Actions Queue        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Technique

| Couche              | Technologie                                    |
| ------------------- | ---------------------------------------------- |
| **Frontend**        | Next.js 16, TypeScript, TailwindCSS, shadcn/ui |
| **IA**              | LangChain, GPT-4o-mini (OpenAI)                |
| **Base de données** | PostgreSQL (Neon serverless)                   |
| **Extension**       | Chrome Extension Manifest V3                   |
| **Infra**           | Docker, Nginx, Coolify                         |
| **CI/CD**           | GitHub Actions (7 workflows)                   |
| **Tests**           | Vitest (unit), Playwright (E2E), Lighthouse CI |
| **Sécurité**        | Trivy, Semgrep, Gitleaks, npm audit            |

---

## 🚀 DevOps Pipeline

```
git push ──▶ CI (lint + typecheck + tests + build)
         ──▶ Security (Trivy code + Semgrep + Gitleaks)
         ──▶ Deploy (Docker build → GHCR → Trivy image scan → Coolify)
         ──▶ E2E Tests (Playwright) + Lighthouse CI
Cron     ──▶ Backup PostgreSQL quotidien (2h UTC)
Hebdo    ──▶ Dependabot MAJ dépendances groupées
```

| Workflow         | Déclencheur  | Description                                    |
| ---------------- | ------------ | ---------------------------------------------- |
| `ci.yml`         | push/PR      | Lint + TypeCheck + Vitest (28 tests) + Build   |
| `deploy.yml`     | push main    | Docker → GHCR → **Trivy image scan** → Coolify |
| `security.yml`   | push + hebdo | npm audit + Trivy code + Semgrep + Gitleaks    |
| `e2e.yml`        | push/PR      | Playwright E2E (login, API, sécurité)          |
| `lighthouse.yml` | push/PR      | Audit perf/a11y/SEO                            |
| `backup.yml`     | cron 2h UTC  | Backup PostgreSQL → artifact 30j               |
| `worker-ci.yml`  | push worker  | Build du worker TypeScript                     |

---

## ⚙️ Installation locale

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (ou compte [Neon](https://neon.tech) gratuit)
- Clé API OpenAI

### Démarrage rapide

```bash
# 1. Cloner le projet
git clone https://github.com/dibrilou45/linkedinagent.git
cd linkedinagent

# 2. Configurer les variables d'environnement
cp linkedin-agent-frontend/.env.example linkedin-agent-frontend/.env.local
# Éditer .env.local avec vos clés

# 3. Lancer avec Docker
docker-compose up -d

# 4. Accéder à l'application
open http://localhost:3000
```

### Développement sans Docker

```bash
cd linkedin-agent-frontend
npm install
npm run dev        # http://localhost:3000
npm run test       # tests unitaires (Vitest)
npm run test:e2e   # tests E2E (Playwright)
```

---

## 🔐 Variables d'environnement

| Variable              | Description                    | Obligatoire |
| --------------------- | ------------------------------ | ----------- |
| `DATABASE_URL`        | Chaîne de connexion PostgreSQL | ✅          |
| `OPENAI_API_KEY`      | Clé API OpenAI (`sk-...`)      | ✅          |
| `NEXTAUTH_SECRET`     | Secret de session              | ✅          |
| `NEXT_PUBLIC_APP_URL` | URL de production (CORS)       | Production  |

---

## 🧪 Tests

```bash
npm run test            # 28 tests unitaires (Vitest)
npm run test:coverage   # Rapport de couverture HTML
npm run test:e2e        # Tests E2E Playwright
npm run security-audit  # Audit sécurité custom (XSS, CORS, rate limit)
npm run lighthouse      # Audit Lighthouse CI
```

---

## 📊 Qualité & Sécurité

- **28 tests unitaires** sur la logique métier critique (scoring, validation anti-XSS, CORS)
- **Rate limiting** : 100 req/min/IP + limites LinkedIn par type d'action
- **Validation anti-XSS** : schéma Zod avec regex `SAFE_TEXT` sur toutes les entrées
- **CORS** : whitelist stricte (`chrome-extension://`, `localhost`, domaine prod)
- **Headers sécurité** : CSP, HSTS, X-Frame-Options, X-XSS-Protection
- **Scan image Docker** : Trivy (CVE CRITICAL bloquant) avant chaque déploiement

---

## 📁 Structure du projet

```
LinkedInProject/
├── linkedin-agent-frontend/    # Application Next.js
│   ├── app/api/                # API Routes (agent, prospects, campaigns...)
│   ├── components/             # Composants React
│   ├── lib/                    # Logique métier (rate-limiter, validators, score...)
│   ├── tests/unit/             # Tests Vitest (28 tests)
│   └── tests/e2e/              # Tests Playwright
├── linkedin-agent-worker/      # Worker TypeScript (queue processor)
├── linkedin-chrome-extension/  # Extension Chrome MV3
├── .github/workflows/          # 7 workflows CI/CD
└── docker-compose.yml          # Stack locale complète
```

---

## 📄 Licence

MIT © 2026 — Projet de fin de stage
