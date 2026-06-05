# Architecture Cloud-Native — Plan Gratuit (Free Tier)

## Réponse courte : OUI, mais avec des astuces

Toute l'architecture peut être déployée **gratuitement** en exploitant les free tiers des cloud providers et des services open-source. Voici le plan complet.

---

## Stack Gratuit Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE GRATUITE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐│
│  │   Next.js    │    │   FastAPI    │    │ Celery Workers   ││
│  │   (UI)       │    │   (API)      │    │ + Playwright     ││
│  │              │    │              │    │                  ││
│  │  Vercel      │    │  Oracle Cloud│    │  Oracle Cloud    ││
│  │  (Free)      │    │  (Always Free│    │  (Always Free    ││
│  │              │    │   Tier)      │    │   ARM: 4CPU/24GB)││
│  └──────────────┘    └──────┬───────┘    └──────────────────┘│
│                             │                                   │
│              ┌──────────────┴──────────────┐                  │
│              │                               │                  │
│              ▼                               ▼                  │
│      ┌──────────────┐              ┌──────────────┐          │
│      │   Redis      │              │   Neon DB    │          │
│      │  (Upstash    │              │  (Free Tier) │          │
│      │   Free)      │              │  (déjà en place)│          │
│      └──────────────┘              └──────────────┘          │
│                                                                  │
│  Coût total : 0€/mois                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Oracle Cloud — Le Secret du Gratuit Illimité

### Pourquoi Oracle Cloud ?

Oracle offre un **Always Free Tier** PERMANENT (pas de 12 mois) :

| Ressource | Offre |
|---|---|
| VM Compute (AMD) | 2 instances, 1/8 OCPU + 1GB RAM chacune |
| VM Compute (ARM Ampere) | **4 OCPUs + 24 GB RAM** (créer jusqu'à 4 VMs) |
| Block Storage | 200 GB total |
| Object Storage | 10 GB |
| Bande passante | 10 TB/mois |
| Load Balancer | 1 (10 Mbps) |

**Le ARM Ampere est la clé** : 4 CPUs + 24 GB RAM, c'est plus que suffisant pour faire tourner FastAPI + Redis + 3-4 workers Chrome.

### Comment s'inscrire

1. Créer un compte sur [cloud.oracle.com](https://cloud.oracle.com)
2. Vérifier avec une carte bancaire (pas de prélèvement, juste vérification)
3. Choisir la région **Frankfurt** ou **Amsterdam** (meilleure latence depuis la France)
4. Lancer une VM ARM : **VM.Standard.A1.Flex**
   - OCPU : 4
   - RAM : 24 GB
   - OS : Ubuntu 22.04
   - Boot Volume : 100 GB

### Ce qu'on peut faire avec 4 CPU / 24 GB RAM

```
┌─────────────────────────────────────┐
│  VM Oracle Cloud (4 CPU / 24 GB)    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐  ┌─────────────┐ │
│  │  FastAPI    │  │   Redis     │ │
│  │  (API)      │  │  (Broker)   │ │
│  │  ~512 MB    │  │  ~256 MB    │ │
│  └─────────────┘  └─────────────┘ │
│                                     │
│  ┌─────────────┐  ┌─────────────┐ │
│  │  Worker #1  │  │  Worker #2  │ │
│  │  Chrome     │  │  Chrome     │ │
│  │  ~2 GB      │  │  ~2 GB      │ │
│  └─────────────┘  └─────────────┘ │
│                                     │
│  ┌─────────────┐  ┌─────────────┐ │
│  │  Worker #3  │  │  Worker #4  │ │
│  │  Chrome     │  │  Chrome     │ │
│  │  ~2 GB      │  │  ~2 GB      │ │
│  └─────────────┘  └─────────────┘ │
│                                     │
│  Total utilisé : ~10 GB / 24 GB   │
│  Actions simultanées : 4          │
│                                     │
└─────────────────────────────────────┘
```

**Avec 24 GB, tu peux faire tourner 4 workers Chrome en parallèle** (8 GB pour les workers, le reste pour le système + FastAPI + Redis).

---

## 2. Redis — Upstash Gratuit

### Offre

[Upstash](https://upstash.com) propose un tier gratuit :

| Limite | Valeur |
|---|---|
| Requêtes par jour | 10 000 |
| Bande passante | 1 GB/mois |
| Stockage | 256 MB |
| Régions | Multi-régions |

### Est-ce suffisant ?

**Oui, largement.** Une action LinkedIn typique génère :
- 1 tâche Celery créée (PUBLISH)
- 1 tâche consommée (RPOP)
- Quelques updates de statut

Soit ~10-20 requêtes Redis par action.  
→ **10 000 req/jour = 500-1000 actions/jour gratuitement.**

Si tu dépasses, Upstash passe à **0.20€/10K requêtes** (quasi gratuit).

### Alternative : Redis auto-hébergé sur la VM Oracle

Si tu préfères ne pas dépendre d'un service externe :

```bash
# Sur la VM Oracle, Redis est gratuit (open-source)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

→ **0€**, mais moins résilient (si la VM redémarre, Redis redémarre aussi).

---

## 3. PostgreSQL (Neon) — Déjà Gratuit

Tu utilises déjà Neon. Leur free tier :

| Limite | Valeur |
|---|---|
| Stockage | 500 MB |
| Bande passante | 190 heures de compute/mois |
| Connexions | 10 simultanées |
| Branches | Illimité |

**Avec un backend FastAPI léger + pooling, c'est suffisant.**

Si tu dépasses : **5€/mois** pour le tier supérieur.

---

## 4. Next.js Frontend — Vercel Gratuit

Tu utilises probablement déjà Vercel. Leur hobby plan :

| Limite | Valeur |
|---|---|
| Déploiements | Illimité |
| Bande passante | 100 GB/mois |
| Build time | 6 000 min/mois |
| Serveless Functions | 10 secondes max |

**Totalement gratuit pour un projet comme le tien.**

---

## 5. Docker Swarm (Alternative à Kubernetes)

### Pourquoi Docker Swarm et pas Kubernetes ?

Kubernetes est overkill pour un seul serveur. Docker Swarm est natif dans Docker, gratuit, et plus simple.

**Sur la VM Oracle (4 CPU / 24 GB) :**

```yaml
# docker-compose.swarm.yml
version: '3.8'

services:
  api:
    image: ghcr.io/dibrilou45/linkedin-agent-backend:latest
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - redis

  worker:
    image: ghcr.io/dibrilou45/linkedin-agent-worker:latest
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '0.5'
          memory: 2G
      restart_policy:
        condition: any
        delay: 10s
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
      - WORKER_CONCURRENCY=2
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

**Déploiement :**

```bash
# Initialiser Docker Swarm
docker swarm init

# Déployer la stack
docker stack deploy -c docker-compose.swarm.yml linkedin-agent

# Voir les services
docker service ls
# NAME                    REPLICAS  IMAGE
# linkedin-agent_api      1/1       ...
# linkedin-agent_worker   4/4       ...
# linkedin-agent_redis    1/1       ...

# Scaler les workers (en live)
docker service scale linkedin-agent_worker=6
```

---

## 6. Playwright + Chrome Headless — Astuces Gratuites

### Astuce 1 : Utiliser les images officielles Playwright

Microsoft fournit des images Docker optimisées **gratuites** :

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

# Déjà inclus : Chromium, Firefox, WebKit
# Pas besoin d'installer Chrome manuellement
```

### Astuce 2 : Lancer Chrome en mode "lightweight"

```python
# worker/linkedin_browser.py
from playwright.sync_api import sync_playwright

def create_browser():
    p = sync_playwright().start()
    browser = p.chromium.launch(
        headless=True,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',      # Évite l'utilisation de /dev/shm
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',             # Moins de RAM (mais moins stable)
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--memory-pressure-off',        # Réduit la pression mémoire
        ]
    )
    return browser, p
```

Avec ces flags, Chrome consomme **~200-300 MB** au lieu de 1 GB.

### Astuce 3 : Réutiliser les browsers (browser pool)

Au lieu de créer/détruire un browser à chaque tâche :

```python
# Pool de browsers (évite les coûts de démarrage)
from queue import Queue

browser_pool = Queue(maxsize=10)

for _ in range(5):
    browser, playwright = create_browser()
    browser_pool.put((browser, playwright))

def execute_action(action):
    browser, playwright = browser_pool.get()
    try:
        page = browser.new_page()
        # ... exécuter l'action ...
        page.close()
    finally:
        browser_pool.put((browser, playwright))
```

→ **Moins de RAM** car on recycle les instances.

---

## 7. Reverse Proxy + SSL Gratuit (Nginx + Let's Encrypt)

### SSL Gratuit avec Let's Encrypt

```bash
# Installer certbot
sudo apt install certbot python3-certbot-nginx

# Générer le certificat (gratuit, renouvellement auto)
sudo certbot --nginx -d api.ton-domaine.com
```

### Nginx comme reverse proxy (gratuit)

```nginx
# /etc/nginx/sites-available/linkedin-agent
server {
    listen 80;
    server_name api.ton-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.ton-domaine.com;

    ssl_certificate /etc/letsencrypt/live/api.ton-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ton-domaine.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Récapitulatif des Coûts

| Composant | Solution | Coût |
|---|---|---|
| Serveur (4 CPU / 24 GB) | Oracle Cloud Always Free | **0€/mois** |
| Redis | Auto-hébergé sur la VM ou Upstash Free | **0€/mois** |
| PostgreSQL | Neon Free Tier (déjà en place) | **0€/mois** |
| Frontend Next.js | Vercel Hobby Plan | **0€/mois** |
| SSL | Let's Encrypt | **0€/mois** |
| Reverse Proxy | Nginx (open-source) | **0€/mois** |
| Docker Swarm | Natif dans Docker | **0€/mois** |
| Playwright/Chromium | Open-source | **0€/mois** |
| **TOTAL** | | **0€/mois** |

---

## Limites du Gratuit (À Connaître)

| Limite | Impact | Contournement |
|---|---|---|
| Oracle Cloud : 4 CPU max | ~4 workers Chrome | Playwright pool + flags légers |
| Upstash : 10K req/jour | ~1000 actions/jour | Redis auto-hébergé = illimité |
| Neon : 500 MB | ~50K prospects | Compresser / archiver les vieux messages |
| Vercel : 10s functions | Pas de long polling | SSE/WebSockets via FastAPI sur Oracle |
| Pas de HPA auto | Scaler manuellement | Script cron qui ajuste les replicas |

---

## Plan d'Action Gratuit (Step by Step)

### Étape 1 : Créer le compte Oracle Cloud (15 min)
- [cloud.oracle.com](https://cloud.oracle.com)
- Vérifier avec CB (pas de prélèvement)
- Lancer VM ARM : 4 OCPU + 24 GB RAM

### Étape 2 : Installer Docker + Docker Compose (10 min)
```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

### Étape 3 : Cloner le projet et lancer la stack (5 min)
```bash
git clone https://github.com/dibrilou45/linkedin-agent.git
cd linkedin-agent
docker-compose -f docker-compose.swarm.yml up -d
```

### Étape 4 : Configurer le domaine + SSL (10 min)
- Pointer ton domaine vers l'IP de la VM Oracle
- `sudo certbot --nginx -d api.ton-domaine.com`

### Étape 5 : Mettre à jour le frontend
```typescript
// .env.local sur Vercel
BACKEND_URL=https://api.ton-domaine.com
EXECUTION_MODE=cloud_workers
```

**Total temps : ~1 heure. Coût : 0€.**

---

## Alternative Encore Plus Simple : Coolify

Tu utilises déjà Coolify. Tu peux tout déployer dessus (sur ton serveur existant) :

1. Ajouter un service "PostgreSQL" (déjà fait)
2. Ajouter un service "Redis"
3. Déployer le backend FastAPI comme application
4. Déployer les workers comme service Docker
5. Coolify gère le SSL, le reverse proxy, les healthchecks

**Si tu as déjà un serveur avec Coolify, tu n'as même pas besoin d'Oracle Cloud.**

---

## Conclusion

**Oui, c'est faisable gratuitement.** La combinaison :
- **Oracle Cloud Always Free** (4 CPU / 24 GB) pour le backend + workers
- **Neon Free** pour PostgreSQL (déjà en place)
- **Vercel Hobby** pour le frontend (déjà en place)
- **Nginx + Let's Encrypt** pour SSL (gratuit)
- **Docker Swarm** pour l'orchestration (gratuit)

**Tu as besoin d'argent ? Non. Juste d'un peu de temps pour configurer.**

Veux-tu que je commence à créer les fichiers Docker et le docker-compose pour déployer cette architecture gratuite ?
