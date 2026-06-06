# LinkedIn Agent Worker

Worker conteneurisé pour exécuter les actions LinkedIn en arrière-plan via **Puppeteer** + **Chrome headless**.

## Rôle

Ce worker consomme les actions de la file d'attente PostgreSQL (`linkedin_actions_queue`) et les exécute dans un navigateur Chrome headless, sans dépendre de l'extension Chrome du client.

## Technologies

- **Node.js 20** (même écosystème que le frontend)
- **TypeScript** (même langage)
- **Puppeteer** (automatisation navigateur)
- **PostgreSQL** (même base de données Neon, pas de nouveau service)

## Lancer en local (développement)

```bash
cd linkedin-agent-worker
npm install
npm run dev
```

## Lancer en production (Docker)

```bash
docker build -t linkedin-agent-worker .
docker run -e DATABASE_URL="..." linkedin-agent-worker
```

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (Neon) | **Obligatoire** |
| `WORKER_ID` | Identifiant unique du worker | auto-généré |
| `POLL_INTERVAL_MS` | Délai entre deux polls (ms) | 5000 |
| `HEADLESS` | Mode headless Chrome | true |
| `MAX_RETRIES` | Erreurs consécutives avant pause | 3 |

## Architecture

```
PostgreSQL (linkedin_actions_queue)
       ↓ (poll SELECT ... FOR UPDATE SKIP LOCKED)
   Worker Node.js
       ↓ (Puppeteer)
   Chrome Headless
       ↓ (HTTP)
   LinkedIn.com
       ↓
   UPDATE status = completed/failed
```

## Sécurité

- User-Agent humain (Chrome Windows)
- Comportement de scroll aléatoire
- Délai de frappe "humain" entre les caractères
- Blocage des images/CSS/fonts pour économiser la bande passante
- Redémarrage du browser tous les 20 cycles pour éviter les fuites mémoire

## Scalabilité

Lancer N instances en parallèle :

```bash
docker-compose up --scale worker=5
```

Chaque worker récupère les actions via `FOR UPDATE SKIP LOCKED` : aucun conflit, aucune duplication.

<!-- ci-trigger: 2026-06-06 06:56:19 -->
