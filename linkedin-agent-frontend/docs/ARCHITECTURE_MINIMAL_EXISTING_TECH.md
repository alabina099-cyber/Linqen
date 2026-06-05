# Architecture Workers — Technologies Existantes Uniquement

## Réponse à tes 3 questions

### 1. AWS / Azure gratuitement ?

**Non, pas viable.**

| Provider | Offre gratuite | RAM | Durée |
|---|---|---|---|
| **Oracle Cloud** | Always Free Tier | **24 GB** | **Permanent** |
| AWS | t2.micro | **1 GB** | 12 mois uniquement |
| Azure | B1s | **1 GB** | 12 mois uniquement |

**1 GB de RAM = 1 worker Chrome maximum** (et il va swapper). Avec 24 GB chez Oracle, tu en fais tourner 4-6.

**Si tu préfères AWS/Azure :** Après les 12 mois, compte **8-15€/mois** pour une instance avec 4 GB RAM. Ou reste sur Oracle (vraiment gratuit pour toujours).

---

### 2. Coolify au lieu de Vercel ?

**Oui, absolument.** Coolify est déjà dans ton projet (`.github/workflows/deploy.yml` le mentionne). C'est même **mieux** que Vercel pour cette architecture car Coolify gère :
- Déploiement Docker natif
- Base de données (PostgreSQL, Redis)
- Reverse proxy + SSL auto
- Variables d'environnement
- Healthchecks

**Tu n'as pas besoin de Vercel.** Reste sur Coolify.

---

### 3. Utiliser les technologies existantes ?

**Oui. Voici l'architecture minimale qui réutilise 100% de ton stack actuel :**

---

## Architecture Revisitée (Zero nouvelle technologie)

```
┌─────────────────────────────────────────────────────────────┐
│                    COOLIFY (déjà en place)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  Next.js App │    │        WORKERS DOCKER            │   │
│  │  (déjà là)   │    │  (nouveau conteneur uniquement)  │   │
│  │              │    │                                  │   │
│  │  Dashboard   │    │  ┌──────────────────────────┐   │   │
│  │  API Routes  │───▶│  │  Node.js + Puppeteer     │   │   │
│  │  Chat Agent  │    │  │  (même écosystème TS/JS) │   │   │
│  └──────────────┘    │  └──────────────────────────┘   │   │   │
│                      │                                  │   │
│                      │  ┌──────────────────────────┐   │   │   │
│                      │  │  Node.js + Puppeteer     │   │   │   │
│                      │  │  (réplica #2)            │   │   │   │
│                      │  └──────────────────────────┘   │   │   │
│                      │                                  │   │
│                      └──────────────────────────────────┘   │
│                                                              │
│              ┌──────────────────┐                            │
│              │   Neon DB        │  ← Déjà en place          │
│              │  (PostgreSQL)    │                            │
│              │  Queue + Data    │                            │
│              └──────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Ce qu'on AJOUTE (minimum vital)

| Nouveau | Pourquoi ? | Alternative écartée |
|---|---|---|
| **1 dossier `worker/`** avec un script Node.js | Exécute Chrome dans un conteneur | Pas de nouveau framework, juste un script |
| **Puppeteer** (npm package) | Pilote Chrome headless | Playwright Python (évite d'ajouter Python) |
| **1 colonne `status`** dans `linkedin_actions_queue` | File d'attente via PostgreSQL | Redis + Celery (trop lourd, nouvelle stack) |

### Ce qu'on GARDE (déjà existant)

| Existant | Utilisation dans la nouvelle architecture |
|---|---|
| **Next.js** | API routes pour créer les actions + dashboard |
| **PostgreSQL (Neon)** | File d'attente + données métier (déjà là) |
| **Docker** | Conteneurisation du worker (déjà là) |
| **Coolify** | Déploiement + SSL + reverse proxy (déjà là) |
| **GitHub Actions** | CI/CD (déjà là) |
| **TypeScript / Node.js** | Même langage pour l'app ET le worker |

---

## Pourquoi ne pas ajouter Python/FastAPI/Celery/Redis ?

Tu as raison de questionner. Voici la comparaison :

| Approche "classique" | Approche "stack existant" |
|---|---|
| FastAPI (Python) | Next.js API routes (déjà là) |
| Celery (Python) | Script Node.js avec `setInterval` (polling PG) |
| Redis (broker) | PostgreSQL `linkedin_actions_queue` (déjà là) |
| Playwright (Python) | Puppeteer (Node.js, même npm install) |
| 4 nouvelles technologies | **1 npm package (Puppeteer) + 1 script** |

**Résultat :** Même performance, 10x moins de complexité.

---

## Implémentation Step by Step

### Étape 1 : Ajouter une colonne `claimed_by` à la table existante

```sql
-- db/migrations/001_add_worker_queue.sql
ALTER TABLE linkedin_actions_queue 
ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

-- Index pour le polling rapide des workers
CREATE INDEX IF NOT EXISTS idx_actions_pending 
ON linkedin_actions_queue(status, claimed_at) 
WHERE status = 'pending_approval';
```

### Étape 2 : Créer le worker (Node.js, même écosystème)

```
linkedin-agent-worker/
├── src/
│   ├── index.ts              # Entry point : boucle infinie
│   ├── queue.ts              # Polling PostgreSQL
│   ├── browser.ts            # Puppeteer / Chrome headless
│   └── actions/
│       ├── connect.ts        # Envoyer une demande de connexion
│       ├── message.ts        # Envoyer un message
│       └── visit.ts          # Visiter un profil
├── Dockerfile
├── package.json              # Même structure que le frontend
└── tsconfig.json
```

**`package.json` :**

```json
{
  "name": "linkedin-agent-worker",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/pg": "^8.10.0"
  }
}
```

**`src/queue.ts` (File d'attente via PostgreSQL) :**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function claimNextAction(workerId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Récupérer la prochaine action non assignée
    const result = await client.query(`
      UPDATE linkedin_actions_queue
      SET 
        status = 'processing',
        claimed_by = $1,
        claimed_at = NOW()
      WHERE id = (
        SELECT id FROM linkedin_actions_queue
        WHERE status = 'pending_approval'
          AND (claimed_by IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `, [workerId]);
    
    await client.query('COMMIT');
    return result.rows[0] || null;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function completeAction(actionId: number, result: any) {
  await pool.query(`
    UPDATE linkedin_actions_queue
    SET status = 'completed',
        result = $2,
        completed_at = NOW(),
        claimed_by = NULL
    WHERE id = $1;
  `, [actionId, JSON.stringify(result)]);
}

export async function failAction(actionId: number, error: string) {
  await pool.query(`
    UPDATE linkedin_actions_queue
    SET status = 'failed',
        error = $2,
        claimed_by = NULL
    WHERE id = $1;
  `, [actionId, error]);
}
```

**`src/browser.ts` (Puppeteer) :**

```typescript
import puppeteer from 'puppeteer';

let browser: any = null;

export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',      // Réduit la RAM (mode conteneur)
        '--no-zygote',
      ],
    });
  }
  return browser;
}

export async function executeLinkedInAction(action: any) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Se connecter à LinkedIn (cookies stockés en DB)
    await page.goto('https://www.linkedin.com');
    
    switch (action.type) {
      case 'connect':
        await sendConnection(page, action);
        break;
      case 'message':
        await sendMessage(page, action);
        break;
    }
    
    return { success: true };
    
  } finally {
    await page.close();  // Ferme la page, garde le browser ouvert
  }
}

async function sendConnection(page: any, action: any) {
  await page.goto(action.target_url);
  await page.waitForSelector('button[aria-label="Invitez"]');
  await page.click('button[aria-label="Invitez"]');
  // ... etc
}
```

**`src/index.ts` (Boucle principale) :**

```typescript
import { claimNextAction, completeAction, failAction } from './queue';
import { executeLinkedInAction } from './browser';

const WORKER_ID = `worker-${process.env.HOSTNAME || Math.random().toString(36).slice(2, 8)}`;
const POLL_INTERVAL = 5000; // 5 secondes

async function main() {
  console.log(`[${WORKER_ID}] Worker démarré`);
  
  while (true) {
    try {
      const action = await claimNextAction(WORKER_ID);
      
      if (!action) {
        console.log(`[${WORKER_ID}] Aucune action, attente...`);
        await sleep(POLL_INTERVAL);
        continue;
      }
      
      console.log(`[${WORKER_ID}] Action #${action.id} : ${action.type}`);
      
      const result = await executeLinkedInAction(action);
      await completeAction(action.id, result);
      
      console.log(`[${WORKER_ID}] Action #${action.id} terminée`);
      
    } catch (error) {
      console.error(`[${WORKER_ID}] Erreur :`, error);
      if (error.actionId) {
        await failAction(error.actionId, error.message);
      }
      await sleep(POLL_INTERVAL);
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

### Étape 3 : Dockerfile du worker (léger)

```dockerfile
# linkedin-agent-worker/Dockerfile
FROM node:20-alpine

# Installer Chromium pour Puppeteer
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

**Taille de l'image : ~300 MB** (alpine + chromium minimal).

### Étape 4 : Docker Compose (un seul fichier ajouté)

```yaml
# docker-compose.worker.yml (à la racine du projet)
version: '3.8'

services:
  # L'app Next.js existe déjà (docker-compose.yml racine)
  # On ajoute juste les workers

  worker-1:
    build:
      context: ./linkedin-agent-worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  worker-2:
    build:
      context: ./linkedin-agent-worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  worker-3:
    build:
      context: ./linkedin-agent-worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped
```

**Lancement :**

```bash
# Lancer tout (app + workers)
docker-compose -f docker-compose.yml -f docker-compose.worker.yml up -d

# Scaler les workers (si besoin de plus)
docker-compose -f docker-compose.worker.yml up -d --scale worker=6
```

### Étape 5 : Déployer via Coolify (déjà configuré)

Dans Coolify :
1. Créer un nouveau service "Application"
2. Pointer vers le repo GitHub
3. Dockerfile : `linkedin-agent-worker/Dockerfile`
4. Variables d'environnement : `DATABASE_URL`
5. Scaler le nombre de replicas (Coolify gère Docker Swarm)

**Ou encore plus simple :** Ajouter le worker au `docker-compose.yml` existant et Coolify le déploiera avec le reste.

---

## Comparaison : Avant vs Après

### Avant (Extension Chrome)

```
Utilisateur ouvre Chrome → Extension poll la DB → Exécute 1 action → Attend
                    ↓
              RAM utilisateur (500MB-1GB)
              1 action à la fois
              PC éteint = tout bloqué
```

### Après (Workers Node.js + Puppeteer)

```
Next.js crée l'action → PostgreSQL (pending) → Worker 1 la récupère → Chrome headless → Terminé
                                          → Worker 2 récupère la suivante → Chrome headless → Terminé
                                          → Worker 3 récupère la suivante → Chrome headless → Terminé
                    ↓
              RAM serveur (3 x 300MB = 900MB)
              3 actions simultanées
              24/7, même si l'utilisateur dort
```

---

## Coût Réel (Stack Existant + Oracle Cloud)

| Composant | Technologie | Coût |
|---|---|---|
| Serveur | Oracle Cloud ARM (4 CPU / 24 GB) | **0€** |
| App + Workers | Node.js + Puppeteer + Docker | **0€** (open-source) |
| Base de données | Neon PostgreSQL (déjà en place) | **0€** |
| Déploiement | Coolify (déjà en place) | **0€** |
| Queue | PostgreSQL (déjà en place) | **0€** |
| **TOTAL** | | **0€/mois** |

---

## Résumé pour la Soutenance

> "Au lieu d'ajouter Python, Celery et Redis — qui auraient doublé la complexité du projet — j'ai réutilisé mon stack Node.js/TypeScript existant. Le worker est un simple script TypeScript qui poll PostgreSQL et pilote Chrome via Puppeteer. Même langage, même base de données, même Docker, même Coolify. Résultat : 3 workers en parallèle, 24/7, 0€, et une architecture 10x plus simple."

---

## Fichiers à Créer (Liste Finale)

```
linkedin-agent-worker/
├── src/
│   ├── index.ts
│   ├── queue.ts
│   ├── browser.ts
│   └── actions/
│       ├── connect.ts
│       ├── message.ts
│       └── visit.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── .dockerignore

db/migrations/
└── 001_add_worker_queue.sql

docker-compose.worker.yml  (à la racine)
```

**Total : ~7 nouveaux fichiers. Aucune nouvelle technologie.**

Tu veux que je crée ces fichiers maintenant ?
