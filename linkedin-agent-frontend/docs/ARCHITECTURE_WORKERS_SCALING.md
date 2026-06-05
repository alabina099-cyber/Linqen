# Architecture Cloud-Native & Auto-scaling pour la Couche d'Exécution

## Contexte du Projet Actuel

### Architecture Actuelle (Monolithique)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Next.js App │─────▶│  Neon DB     │◀─────│ Chrome Ext.  │
│  (API + UI)  │      │ (PostgreSQL) │      │ (navigateur  │
└──────────────┘      └──────────────┘      │  utilisateur)│
                                            └──────────────┘
```

**Fonctionnement :** L'agent reçoit une instruction via le chat. L'API Next.js crée une action dans `linkedin_actions_queue`. L'extension Chrome (installée chez l'utilisateur) récupère l'action via polling et l'exécute dans le navigateur de l'utilisateur.

**Problème identifié :** Chrome consomme énormément de RAM et CPU. Si l'utilisateur ferme son navigateur ou si plusieurs actions s'empilent, le système est bloqué. Il n'y a pas de scalabilité de la couche d'exécution.

---

## Pourquoi une Architecture Cloud-Native avec Workers Séparés ?

### 1. Problème : Le Goulot d'Étranglement

| Scénario | Problème actuel |
|---|---|
| 50 actions en file d'attente | L'extension Chrome traite 1 à 1, lentement |
| Utilisateur ferme son PC | Toutes les actions restent bloquées |
| Pic de charge (campagnes massives) | Pas de parallélisation possible |
| Chrome consomme 500MB-1GB par instance | Impossible d'en lancer 10 en parallèle chez l'utilisateur |

### 2. Solution : Déporter l'Exécution dans le Cloud

Au lieu de faire tourner Chrome sur le PC de l'utilisateur, on fait tourner des navigateurs headless (Chromium sans interface) dans des conteneurs Docker sur un serveur/cloud. Ces conteneurs sont pilotés par des **workers** qui consomment les actions de la file d'attente.

---

## Architecture Cible (Micro-services Conteneurisés)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Kubernetes / Docker Swarm                       │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js    │    │   FastAPI    │    │     Celery Workers           │  │
│  │   (UI)       │◀──▶│   (API)      │◀──▶│  + Chrome/Playwright         │  │
│  │              │    │              │    │  (conteneurs autoscaling)    │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────────────────┘  │
│                             │                                             │
│                             ▼                                             │
│                      ┌──────────────┐                                      │
│                      │   Redis      │  ← File d'attente Celery              │
│                      │  (Broker)    │                                      │
│                      └──────┬───────┘                                      │
│                             │                                             │
│                             ▼                                             │
│                      ┌──────────────┐                                      │
│                      │   Neon DB    │  ← PostgreSQL persistant             │
│                      │ (PostgreSQL) │                                      │
│                      └──────────────┘                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Nginx Ingress Controller → Load balancing + Rate limiting + SSL       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Composants Détaillés

### 1. Next.js (Frontend/UI seulement)

**Rôle :** Interface utilisateur uniquement. Plus d'API métier ici.
- Dashboard, Chat, Campagnes, Prospects
- Communication avec le FastAPI via HTTP
- Server-Side Rendering (SSR) pour le SEO

**Pourquoi séparer ?**
- Next.js est conçu pour le rendering de pages, pas pour exécuter du Chrome headless
- Moins de dépendances = build plus rapide
- Scaler l'UI indépendamment de l'API

### 2. FastAPI (API métier)

**Rôle :** Orchestrateur métier. Reçoit les requêtes du frontend et des workers.
- CRUD des campagnes, prospects, messages
- Gestion de la file d'attente d'actions
- Authentification / Autorisation
- WebSockets pour notifications temps réel

**Pourquoi FastAPI ?**
- Plus performant que Next.js API routes pour les tâches lourdes
- Support natif des WebSockets et async/await
- Typage Python pour la logique métier complexe
- Facile à scaler horizontalement

### 3. Celery + Redis (File de tâches)

**Rôle :** Système de file d'attente distribué.
- Redis = broker de messages (reçoit les tâches)
- Celery = worker qui consomme les tâches
- Quand une action LinkedIn est créée, FastAPI l'envoie à Celery
- Celery la distribue à un worker disponible

**Pourquoi Celery ?**
- Proven dans l'industrie (Instagram, Mozilla, Dropbox)
- Gestion native des retries, délais, priorités
- Monitoring intégré (Flower)
- Supporte des millions de tâches par jour

### 4. Workers Chrome/Playwright (Conteneurs)

**Rôle :** Exécuter les actions LinkedIn dans des navigateurs headless.
- Reçoit une tâche : `"send_connection à Jean Dupont"`
- Lance Chromium headless dans un conteneur
- Se connecte à LinkedIn (cookies/session stockés en DB)
- Exécute l'action, capture le résultat
- Met à jour le statut dans la DB
- Détruit le navigateur, libère la mémoire

**Pourquoi Playwright plutôt que Selenium ?**
- Plus rapide et stable que Selenium
- API moderne et cohérente (Python/JS/Go)
- Gestion automatique des waits (pas de `time.sleep`)
- Support natif du mode headless optimisé
- Moins de consommation mémoire

### 5. Redis (Cache + Broker)

**Rôle double :**
- **Broker Celery** : file d'attente des tâches
- **Cache** : sessions LinkedIn, rate limits, résultats temporaires

### 6. Neon DB (PostgreSQL)

**Rôle :** Données persistantes (déjà en place).
- Campagnes, prospects, messages, actions_queue
- Sessions LinkedIn (cookies chiffrés)
- Historique des exécutions

---

## Bénéfices Concrets

### Bénéfice 1 : Scalabilité Horizontale des Workers

**Avant :** 1 extension Chrome = 1 navigateur = 1 action à la fois  
**Après :** 1, 5, 20, 100 conteneurs Chrome en parallèle

```bash
# Kubernetes : scaler automatiquement
kubectl scale deployment linkedin-worker --replicas=10

# Ou Docker Compose : scaler manuellement
docker-compose up --scale worker=5
```

| Métrique | Avant | Après |
|---|---|---|
| Actions simultanées | 1 | 10-50+ |
| RAM par navigateur | 500MB-1GB (PC utilisateur) | 200-300MB (serveur optimisé) |
| Disponibilité | Dépend du PC allumé | 24/7 sur le cloud |
| Temps d'exécution campagne | Heures | Minutes |

### Bénéfice 2 : Tolérance aux Pannes

**Avant :** Si l'extension Chrome crash, tout s'arrête.
**Après :**
- Si un worker crash, Celery redistribue la tâche à un autre worker
- Si un conteneur meurt, Kubernetes en recrée un automatiquement
- Les sessions LinkedIn sont persistées en DB, pas en mémoire locale

### Bénéfice 3 : Isolation des Ressources

**Avant :** Chrome mange la RAM du PC de l'utilisateur → ralentit tout.
**Après :**
- Chaque worker a son propre quota CPU/RAM (limites Docker/K8s)
- Un worker ne peut pas planter les autres
- Monitoring par conteneur (Prometheus + Grafana)

### Bénéfice 4 : Sécurité Renforcée

**Avant :** Les cookies LinkedIn sont stockés dans le navigateur de l'utilisateur (risqué).
**Après :**
- Les sessions sont chiffrées et stockées en DB
- Pas de données LinkedIn sur le PC de l'utilisateur
- Les workers tournent dans un réseau isolé (VLAN/docker network)
- Rotation automatique des IP possible (proxy rotation)

### Bénéfice 5 : Déploiement Cloud-Natif

**Avant :** Dépendance totale à l'extension Chrome du client.
**Après :**
- Déployable sur AWS ECS, Google Cloud Run, Azure Container Apps
- Autoscaling automatique selon la charge (HPA Kubernetes)
- Pay-as-you-go : on paie seulement quand des workers tournent

---

## Comment Implémenter Sans Casser le Projet Existant

### Stratégie : Migration Progressive (Strangler Fig Pattern)

On ne remplace pas tout d'un coup. On ajoute la nouvelle architecture à côté, et on migre fonctionnalité par fonctionnalité.

### Phase 1 : Préparation (Semaine 1)

**Créer le nouveau backend FastAPI dans un dossier séparé :**

```
linkedin-agent-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Entry point FastAPI
│   ├── api/
│   │   ├── campaigns.py     # Routes campagnes
│   │   ├── prospects.py     # Routes prospects
│   │   ├── actions.py       # Routes file d'attente
│   │   └── auth.py          # Authentification
│   ├── core/
│   │   ├── config.py        # Variables d'environnement
│   │   └── security.py      # JWT, encryption
│   ├── models/
│   │   └── database.py      # SQLAlchemy models (même schéma Neon)
│   ├── services/
│   │   ├── linkedin_service.py   # Logique LinkedIn
│   │   └── action_queue.py       # Gestion file d'attente
│   └── workers/
│       ├── celery_app.py    # Config Celery
│       └── linkedin_worker.py   # Worker Playwright
├── Dockerfile               # Conteneur FastAPI + Celery
├── docker-compose.yml       # Orchestration locale
├── requirements.txt
└── pyproject.toml
```

**Dockerfile du worker (exemple) :**

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Installer les browsers Playwright
RUN playwright install chromium

# Copier le code
COPY app/ ./app/

# Commande : lancer le worker Celery
CMD ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=info", "--pool=prefork", "--concurrency=4"]
```

### Phase 2 : Points d'Intégration (Semaine 2)

**1. Le Next.js frontend continue de fonctionner** — on ne touche à rien côté UI.

**2. On ajoute un switch dans l'API Next.js :**

```typescript
// app/api/linkedin-actions/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Mode LEGACY : envoi à l'extension Chrome (existant)
  if (process.env.EXECUTION_MODE === 'chrome_extension') {
    return createChromeAction(body);
  }
  
  // Mode CLOUD : envoi au FastAPI/Celery (nouveau)
  if (process.env.EXECUTION_MODE === 'cloud_workers') {
    const response = await fetch(`${process.env.BACKEND_URL}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response;
  }
}
```

**3. Le FastAPI lit/écrit dans la même Neon DB** — pas besoin de migrer les données.

```python
# backend/app/models/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Les models SQLAlchemy correspondent aux tables existantes
```

### Phase 3 : Test en Parallèle (Semaine 3)

**On fait tourner les deux systèmes en même temps :**

```yaml
# docker-compose.yml final (racine du projet)
version: '3.8'

services:
  # === EXISTANT ===
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend

  frontend:
    build:
      context: ./linkedin-agent-frontend
      dockerfile: Dockerfile
    environment:
      - BACKEND_URL=http://backend:8000
      - EXECUTION_MODE=cloud_workers  # Switch vers le nouveau mode
    depends_on:
      - backend
      - redis

  # === NOUVEAU ===
  backend:
    build:
      context: ./linkedin-agent-backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
      - db

  worker:
    build:
      context: ./linkedin-agent-backend
      dockerfile: Dockerfile.worker  # Image avec Playwright
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
      - WORKER_CONCURRENCY=4
    deploy:
      replicas: 3  # 3 workers en parallèle
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
    depends_on:
      - redis
      - db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    # Neon DB est externe, mais on peut aussi avoir un proxy
    image: nginx:alpine  # Proxy vers Neon si besoin
```

### Phase 4 : Migration Complète (Semaine 4)

**Quand tout est testé et stable :**
- Basculer `EXECUTION_MODE=cloud_workers` pour tous les utilisateurs
- L'extension Chrome devient optionnelle (mode fallback)
- Supprimer le code legacy du polling Chrome (si plus besoin)

---

## Déploiement Kubernetes (Production)

### Pourquoi Kubernetes ?

- **HPA (Horizontal Pod Autoscaler)** : "Si la file d'attente > 50 tâches → lancer 5 workers supplémentaires"
- **Rolling updates** : Mettre à jour sans downtime
- **Self-healing** : Si un pod crash, K8s le recrée
- **Resource quotas** : Limiter CPU/RAM par pod

### Exemple de Manifests K8s

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linkedin-worker
spec:
  replicas: 3  # Démarre avec 3 workers
  selector:
    matchLabels:
      app: linkedin-worker
  template:
    metadata:
      labels:
        app: linkedin-worker
    spec:
      containers:
        - name: worker
          image: ghcr.io/dibrilou45/linkedin-agent-worker:latest
          env:
            - name: REDIS_URL
              value: "redis://redis-service:6379/0"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
          resources:
            limits:
              cpu: "2000m"
              memory: "2Gi"
            requests:
              cpu: "500m"
              memory: "512Mi"
---
# k8s/worker-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: linkedin-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: linkedin-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: celery_queue_length
        target:
          type: AverageValue
          averageValue: "10"  # 1 pod par 10 tâches en attente
```

---

## Coût Estimé (Cloud)

| Composant | Provider | Coût mensuel (estimé) |
|---|---|---|
| Next.js Frontend | Vercel / Coolify | 0-20€ (hobby) |
| FastAPI Backend | 1 conteneur | 10-15€ |
| Redis | Upstash / Redis Cloud | 0-10€ (gratuit à 10K req/jour) |
| Neon DB | Déjà en place | 0€ (free tier) |
| Workers Chrome | Hetzner / DigitalOcean | 5-10€ par worker |
| **Total (3 workers)** | | **~40-60€/mois** |

**Alternative serverless :** AWS Fargate / Google Cloud Run → paye uniquement quand les workers tournent (~10-30€/mois pour une utilisation modérée).

---

## Résumé pour la Soutenance

### Slide 1 : Le Problème
> "L'exécution des actions LinkedIn via l'extension Chrome consomme 500MB-1GB de RAM par instance et dépend du PC allumé de l'utilisateur. C'est un goulot d'étranglement."

### Slide 2 : La Solution
> "On isole la couche d'exécution dans des conteneurs Docker pilotés par Celery. Chaque worker lance un Chromium headless, exécute l'action, puis libère la mémoire. On peut en lancer 10, 20, 100 en parallèle."

### Slide 3 : L'Architecture
> "FastAPI pour l'API métier, Celery+Redis pour la file de tâches, Playwright pour l'automatisation navigateur, Kubernetes pour l'autoscaling automatique."

### Slide 4 : Les Bénéfices
> "Scalabilité horizontale, tolérance aux pannes, isolation des ressources, sécurité renforcée, et déploiement cloud-natif."

### Slide 5 : La Migration
> "Strangler Fig Pattern : on ajoute la nouvelle architecture à côté, on teste en parallèle, on bascule progressivement. Zero downtime, zero perte de données."

---

## Prochaines Étapes Concrètes

1. **Créer le dossier** `linkedin-agent-backend/` avec FastAPI
2. **Implémenter** le worker Celery + Playwright
3. **Ajouter** Redis comme broker
4. **Tester** en local avec `docker-compose up`
5. **Déployer** sur un serveur avec Coolify ou Kubernetes
6. **Basculer** le flag `EXECUTION_MODE` progressivement

Tu veux que je commence à implémenter cette architecture ?
