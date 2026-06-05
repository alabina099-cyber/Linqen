# Planification Scrum — LinkedIn Agent Project
## Méthodologie : Scrum | 7 Sprints | Durée : 2 semaines par sprint

---

## Product Backlog — Vue d'ensemble

| Sprint | Thème principal | Livrables clés |
|---|---|---|
| Sprint 1 | Infrastructure & Base de données | Schéma PostgreSQL, Docker Compose, variables d'env, migrations |
| Sprint 2 | Backend API Core | Routes prospects, campagnes, queue d'actions, rate limiter |
| Sprint 3 | Authentification & Sécurité | Auth JWT, rôles, gestion des utilisateurs, middleware sécurité |
| Sprint 4 | Worker Cloud & Actions LinkedIn | Worker Puppeteer, login LinkedIn, connect/message/visit actions |
| Sprint 5 | Extension Chrome | Manifest, popup, background, détection inbox, auto-reply |
| Sprint 6 | Dashboard Frontend & BI | Composants React, BI analytics, pipeline prospects, campagnes |
| Sprint 7 | IA, Settings & DevOps | Agent LangChain, sentiment analysis, smart follow-up, CI/CD |

---

## Sprint 1 — Infrastructure & Base de données

**Objectif :** Mettre en place l'environnement de développement complet, le schéma de base de données, Docker et les migrations.

**Durée :** 2 semaines

### User Stories

- En tant que développeur, je veux un environnement Docker fonctionnel pour travailler localement.
- En tant que développeur, je veux un schéma PostgreSQL complet pour stocker toutes les données du projet.
- En tant que développeur, je veux des migrations versionnées pour gérer les évolutions du schéma.

### Tâches

#### Infrastructure & Environnement

- [x] **INFRA-01** — Créer le fichier `docker-compose.yml` avec les services : `postgres`, `frontend`, `worker`, `nginx`.
- [x] **INFRA-02** — Créer le fichier `.dockerignore` racine, `linkedin-agent-frontend/.dockerignore`, `linkedin-agent-worker/.dockerignore`.
- [x] **INFRA-03** — Créer le fichier `Dockerfile` pour le frontend (Next.js multi-stage build).
- [x] **INFRA-04** — Créer le fichier `Dockerfile` pour le worker (Node.js + Puppeteer + Chromium).
- [x] **INFRA-05** — Créer le fichier `nginx.conf` pour le reverse proxy frontend/API.
- [x] **INFRA-06** — Configurer les variables d'environnement : `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`, `NEXTAUTH_SECRET`.

#### Base de données PostgreSQL

- [x] **DB-01** — Créer le schéma principal `db/schema.sql` : tables `users`, `prospects`, `campaigns`, `linkedin_actions_queue`, `messages`, `templates`, `scheduled_followups`.
- [x] **DB-02** — Créer les indexes de performance sur `linkedin_actions_queue(status, created_at)`, `prospects(campaign_id)`, `prospects(status)`.
- [x] **DB-03** — Créer le fichier `seed.sql` avec des données de test : prospects, campagnes, messages.
- [x] **DB-04** — Créer la migration `001_add_worker_queue.sql` : colonnes `worker_id`, `claimed_at`, `completed_at`, `retry_count`.
- [x] **DB-05** — Créer la migration `002_add_auth_roles.sql` : table `users` avec colonnes `role`, `email`, `password_hash`, `created_at`.
- [x] **DB-06** — Créer la migration `migration_remove_new_status.sql` : suppression du statut `new` dans l'enum des actions.
- [x] **DB-07** — Créer le fichier `error_logs.sql` : table `error_logs` pour enregistrer les erreurs backend.
- [x] **DB-08** — Créer le fichier `bi_seed.sql` avec des données BI de démonstration pour les tests analytics.
- [x] **DB-09** — Créer le fichier `db/README.md` expliquant la procédure d'application des migrations.

#### Connexion base de données

- [x] **DB-10** — Créer `lib/db.ts` : pool PostgreSQL avec `pg`, fonctions `query()`, `getClient()`, `withTransaction()`, gestion du cache mémoire et retry.

**Critères d'acceptation Sprint 1 :**
- `docker-compose up` lance tous les services sans erreur.
- Le schéma PostgreSQL est appliqué correctement.
- Les tables principales sont créées et accessibles.
- Les données de seed sont insérées.

---

## Sprint 2 — Backend API Core

**Objectif :** Implémenter toutes les routes API backend : prospects, campagnes, messages, templates, actions LinkedIn, follow-ups, rate limiter.

**Durée :** 2 semaines

**Dépendances :** Sprint 1 (DB opérationnel)

### User Stories

- En tant qu'utilisateur, je veux gérer mes prospects via une API REST.
- En tant qu'utilisateur, je veux créer et gérer des campagnes de prospection.
- En tant que système, je veux une queue d'actions LinkedIn avec contrôle de débit.

### Tâches

#### API Prospects

- [x] **API-01** — Créer `app/api/prospects/route.ts` : `GET` liste paginée, `POST` création prospect.
- [x] **API-02** — Créer `app/api/prospects/[id]/route.ts` : `GET`, `PUT`, `DELETE` par ID.
- [x] **API-03** — Créer `app/api/prospects/bulk/route.ts` : import CSV / ajout en masse.
- [x] **API-04** — Créer `app/api/prospects/score/route.ts` : calcul du score de prospect via `lib/prospectScore.ts`.
- [x] **API-05** — Créer `lib/prospectScore.ts` : algorithme de scoring basé sur le secteur, rôle, entreprise, historique.

#### API Campagnes

- [x] **API-06** — Créer `app/api/campaigns/route.ts` : `GET` liste des campagnes, `POST` création.
- [x] **API-07** — Créer `app/api/campaigns/[id]/route.ts` : `GET`, `PUT`, `DELETE`, duplication.
- [x] **API-08** — Créer `app/api/campaigns/[id]/execute/route.ts` : déclenchement manuel d'une campagne.
- [x] **API-09** — Créer `app/api/campaigns/[id]/stats/route.ts` : statistiques d'une campagne.
- [x] **API-10** — Créer `app/api/campaigns/[id]/prospects/route.ts` : liste des prospects d'une campagne.

#### API Actions LinkedIn

- [x] **API-11** — Créer `app/api/linkedin-actions/route.ts` : `GET` liste queue, `POST` ajout action.
- [x] **API-12** — Créer `app/api/linkedin-actions/[id]/route.ts` : `GET`, `PUT` mise à jour statut.
- [x] **API-13** — Créer `app/api/linkedin-actions/[id]/approve/route.ts` : approbation manuelle d'une action.
- [x] **API-14** — Créer `lib/rate-limiter.ts` : limites quotidiennes/horaires, délai minimum entre actions, vérification via DB.

#### API Messages & Templates

- [x] **API-15** — Créer `app/api/messages/route.ts` : `GET` historique messages, `POST` création.
- [x] **API-16** — Créer `app/api/templates/route.ts` : `GET`, `POST`, `PUT`, `DELETE` templates de messages.

#### API Follow-ups

- [x] **API-17** — Créer `app/api/followups/route.ts` : liste des relances planifiées.
- [x] **API-18** — Créer `app/api/followups/execute/route.ts` : exécution des relances dues, vérification statut prospect, rate limit.

#### API Stats & Monitoring

- [x] **API-19** — Créer `app/api/stats/route.ts` : statistiques globales (actions totales, taux succès, prospects traités).
- [x] **API-20** — Créer `app/api/health/route.ts` : health check avec état DB et worker.
- [x] **API-21** — Créer `app/api/monitoring/route.ts` : métriques système (mémoire, latence, erreurs).
- [x] **API-22** — Créer `app/api/performance/route.ts` : données de performance pour les graphiques.

#### Librairies transversales

- [x] **LIB-01** — Créer `lib/logger.ts` : logger structuré avec niveaux `info`, `warn`, `error`, `debug`.
- [x] **LIB-02** — Créer `lib/cache.ts` : cache mémoire avec TTL pour réduire les requêtes DB répétitives.
- [x] **LIB-03** — Créer `lib/utils.ts` : fonctions utilitaires partagées.
- [x] **LIB-04** — Créer `lib/performance-monitor.ts` : monitoring des performances backend.

**Critères d'acceptation Sprint 2 :**
- Tous les endpoints répondent correctement avec les codes HTTP adaptés.
- La queue d'actions respecte les limites de rate limiting.
- Les données de seed sont accessibles via les API.

---

## Sprint 3 — Authentification & Sécurité

**Objectif :** Implémenter le système d'authentification JWT, les rôles utilisateurs, la sécurité des routes et la gestion des comptes.

**Durée :** 2 semaines

**Dépendances :** Sprint 2 (API Backend opérationnel)

### User Stories

- En tant qu'utilisateur, je veux me connecter et me déconnecter de façon sécurisée.
- En tant qu'administrateur, je veux gérer les rôles et accès des utilisateurs.
- En tant que développeur, je veux que toutes les routes sensibles soient protégées.

### Tâches

#### Authentification JWT

- [x] **AUTH-01** — Créer `app/api/auth/login/route.ts` : vérification email/password, génération token JWT, retour cookie sécurisé.
- [x] **AUTH-02** — Créer `app/api/auth/logout/route.ts` : suppression du cookie de session.
- [x] **AUTH-03** — Créer `lib/auth.ts` : fonctions `verifyToken()`, `createToken()`, `hashPassword()`, `comparePassword()`.
- [x] **AUTH-04** — Créer `lib/requestAuth.ts` : middleware de vérification JWT pour les routes protégées.
- [x] **AUTH-05** — Créer `app/api/linkedin-auth/route.ts` : route d'intégration LinkedIn OAuth (stockage credentials).

#### Gestion des utilisateurs

- [x] **AUTH-06** — Créer `app/api/users/route.ts` : `GET` liste utilisateurs (admin), `POST` création compte.
- [x] **AUTH-07** — Créer `app/api/users/[id]/route.ts` : `GET`, `PUT`, `DELETE` profil utilisateur.

#### Sécurité & Protection

- [x] **SEC-01** — Créer `lib/security.ts` : validation des inputs, sanitisation, protection CSRF, headers de sécurité.
- [x] **SEC-02** — Appliquer le middleware d'authentification sur toutes les routes sensibles : `linkedin-actions`, `campaigns`, `prospects`, `settings`, `users`.
- [x] **SEC-03** — Configurer les CORS headers pour l'extension Chrome sur les routes publiques : `settings/agent`, `auto-reply`, `notifications`.
- [x] **SEC-04** — Créer `app/api/agent-config/route.ts` : route de configuration de l'agent accessible depuis l'extension.
- [x] **SEC-05** — Créer `app/api/debug/route.ts` : endpoint de debug protégé (admin uniquement) pour diagnostics.
- [x] **SEC-06** — Créer `app/api/db-columns/route.ts` : introspection des colonnes DB pour vérification de schéma.
- [x] **SEC-07** — Créer `app/api/test-db/route.ts` : endpoint de test de connexion DB.
- [x] **SEC-08** — Créer `app/api/migrate/route.ts` : déclenchement de migrations depuis l'interface admin.

#### Settings utilisateur

- [x] **SETTINGS-01** — Créer `app/api/settings/route.ts` : `GET`/`PUT` settings globaux utilisateur (delays, working hours, daily limits).
- [x] **SETTINGS-02** — Créer `app/api/settings/agent/route.ts` : `GET` settings IA exposés à l'extension (tone, language, auto-reply, sentiment, smart-followup).

**Critères d'acceptation Sprint 3 :**
- L'authentification JWT fonctionne correctement.
- Les routes protégées retournent 401 sans token valide.
- Les CORS headers permettent à l'extension Chrome d'accéder aux routes publiques.
- Les rôles admin/user sont différenciés.

---

## Sprint 4 — Worker Cloud & Actions LinkedIn

**Objectif :** Implémenter le worker cloud conteneurisé avec Puppeteer, la gestion de session LinkedIn, et les trois actions automatisées (connexion, message, visite).

**Durée :** 2 semaines

**Dépendances :** Sprint 1 (Docker), Sprint 2 (Queue DB)

### User Stories

- En tant que système, je veux un worker qui exécute automatiquement les actions LinkedIn approuvées.
- En tant qu'utilisateur, je veux que le worker se connecte à LinkedIn au démarrage.
- En tant que développeur, je veux des sélecteurs CSS robustes résistants aux changements d'interface.

### Tâches

#### Gestion du navigateur Puppeteer

- [x] **WORKER-01** — Créer `src/browser.ts` : instance partagée Puppeteer, restart après N usages, fonctions `getBrowser()`, `createPage()`, `closeBrowser()`.
- [x] **WORKER-02** — Implémenter helpers dans `browser.ts` : `safeWaitForSelector()`, `safeClick()`, `humanTyping()`, `humanScroll()`, `sleep()`.
- [x] **WORKER-03** — Implémenter `isLoggedInToLinkedIn()` : vérification de session via l'URL et les éléments DOM.
- [x] **WORKER-04** — Implémenter `loginToLinkedIn()` : remplissage formulaire `#username` + `#password`, soumission, attente navigation, détection checkpoint de sécurité.

#### Queue & Lifecycle Worker

- [x] **WORKER-05** — Créer `src/queue.ts` : fonctions `claimNextAction()` avec `FOR UPDATE SKIP LOCKED`, `completeAction()`, `failAction()`, `releaseStuckActions()`, `getQueueStats()`, `updateWorkerHeartbeat()`.
- [x] **WORKER-06** — Créer `src/types.ts` : interfaces `WorkerConfig`, `QueueAction`, `ActionResult`.
- [x] **WORKER-07** — Créer `src/index.ts` : boucle principale `processAction()`, heartbeat loop, recovery loop, stats loop, graceful shutdown (SIGTERM/SIGINT).
- [x] **WORKER-08** — Implémenter login LinkedIn au démarrage dans `index.ts` : check session → login si nécessaire → log résultat.

#### Actions LinkedIn

- [x] **WORKER-09** — Créer `src/actions/connect.ts` : navigation profil, scroll humain, sélecteurs multiples bouton connexion, modal note, envoi invitation, détection rate limit.
- [x] **WORKER-10** — Corriger le bug d'apostrophe dans `connect.ts` (string `Envoyer l'invitation`).
- [x] **WORKER-11** — Créer `src/actions/message.ts` : navigation profil, sélecteurs bouton Message + fallback DOM text, zone de saisie contenteditable, envoi avec fallback Ctrl+Enter.
- [x] **WORKER-12** — Créer `src/actions/visit.ts` : navigation profil, double scroll humain, extraction données (name, role, company, location) avec sélecteurs multi-fallback.
- [x] **WORKER-13** — Renforcer les sélecteurs CSS dans `connect.ts`, `message.ts`, `visit.ts` pour supporter LinkedIn 2024/2025.

#### Configuration & Déploiement

- [x] **WORKER-14** — Créer `package.json` worker avec scripts `dev` (tsx), `build` (tsc), `start` (node dist).
- [x] **WORKER-15** — Créer `tsconfig.json` worker : `ES2022`, `CommonJS`, `strict`, `skipLibCheck`.
- [x] **WORKER-16** — Configurer le `Dockerfile` worker : image Debian, installation Chromium, `npm ci`, build TypeScript, CMD node.

**Critères d'acceptation Sprint 4 :**
- `npm run build` dans le worker s'exécute sans erreur TypeScript.
- Le worker démarre, vérifie la session LinkedIn, et se connecte si nécessaire.
- Les trois actions (`connect`, `message`, `visit`) s'exécutent correctement sur un profil de test.
- La queue récupère les actions `approved` et les exécute avec `FOR UPDATE SKIP LOCKED`.

---

## Sprint 5 — Extension Chrome

**Objectif :** Implémenter l'extension Chrome complète : manifest, popup, background, content script, détection des réponses inbox, auto-reply et pont de communication.

**Durée :** 2 semaines

**Dépendances :** Sprint 3 (API Settings), Sprint 2 (Queue Actions)

### User Stories

- En tant qu'utilisateur, je veux une extension Chrome qui détecte les réponses de mes prospects sur LinkedIn.
- En tant qu'utilisateur, je veux que l'extension déclenche automatiquement la réponse IA si activée.
- En tant qu'utilisateur, je veux accéder aux paramètres de l'agent depuis le popup de l'extension.

### Tâches

#### Manifest & Configuration

- [x] **EXT-01** — Créer `manifest.json` : `manifest_version: 3`, permissions (`storage`, `alarms`, `tabs`, `scripting`, `notifications`), `host_permissions` LinkedIn, background service worker, content scripts.
- [x] **EXT-02** — Créer `icons/` : générer les icônes 16px, 48px, 128px avec le script `create-icons.js`.
- [x] **EXT-03** — Créer `styles.css` : styles du popup de l'extension.

#### Popup Interface

- [x] **EXT-04** — Créer `popup.html` : interface HTML du popup avec sections status, settings, stats, actions rapides.
- [x] **EXT-05** — Créer `popup.js` : chargement des settings depuis l'API, affichage du statut de connexion, toggle auto-reply, affichage stats journalières.

#### Background Service Worker

- [x] **EXT-06** — Créer `background.js` : initialisation des alarmes (`check-inbox`, `check-connections`, `recovery`), chargement des user settings depuis `/api/settings/agent`.
- [x] **EXT-07** — Implémenter `checkInboxReplies()` : détection des nouveaux messages dans l'inbox LinkedIn, comparaison avec historique local, trigger auto-reply si activé.
- [x] **EXT-08** — Implémenter `checkConnections()` : vérification des nouvelles connexions acceptées, mise à jour statut prospect.
- [x] **EXT-09** — Implémenter la logique de daily limits côté extension : comptage local des actions du jour, blocage si limites atteintes.
- [x] **EXT-10** — Implémenter `recoveryLoop()` : libération des actions bloquées côté extension.

#### Content Script

- [x] **EXT-11** — Créer `content.js` : injection dans les pages LinkedIn, détection DOM des messages, extraction du nom et URL du prospect.
- [x] **EXT-12** — Créer `selectors.js` : module centralisé de sélecteurs CSS LinkedIn pour content script et background.

#### Communication Extension ↔ Backend

- [x] **EXT-13** — Créer `bridge.js` : pont de communication entre content script et background worker via `chrome.runtime.sendMessage`.
- [x] **EXT-14** — Implémenter l'appel `POST /api/auto-reply` depuis background.js avec le message du prospect et son URL.
- [x] **EXT-15** — Créer `lib/extensionBridge.ts` côté frontend : API route `/api/notifications` pour les messages de l'extension.
- [x] **EXT-16** — Créer `app/api/notifications/route.ts` : réception des notifications de l'extension, stockage et diffusion.

**Critères d'acceptation Sprint 5 :**
- L'extension se charge dans Chrome sans erreur.
- Le popup affiche le statut de connexion et les settings.
- La détection d'inbox fonctionne sur une page LinkedIn ouverte.
- L'appel `POST /api/auto-reply` est déclenché quand une réponse est détectée.

---

## Sprint 6 — Dashboard Frontend & BI Analytics

**Objectif :** Implémenter le dashboard complet en React/Next.js : pipeline prospects, gestion des campagnes, queue d'approbation, module BI Analytics, notifications, et account LinkedIn.

**Durée :** 2 semaines

**Dépendances :** Sprint 2 (API Core), Sprint 3 (Auth)

### User Stories

- En tant qu'utilisateur, je veux visualiser et gérer mes prospects dans un pipeline visuel.
- En tant qu'utilisateur, je veux approuver, rejeter ou modifier les actions avant exécution.
- En tant que manager, je veux consulter des KPIs et analyses BI pour mesurer les performances.

### Tâches

#### Layout & Navigation

- [x] **UI-01** — Créer `app/layout.tsx` : layout global avec providers, fonts, metadata.
- [x] **UI-02** — Créer `app/page.tsx` : page principale avec navigation par onglets entre les sections.
- [x] **UI-03** — Créer `app/globals.css` : styles globaux, variables CSS, dark mode.
- [x] **UI-04** — Créer `components/Header.tsx` : barre de navigation avec logo, onglets, statut worker, notifications.

#### Composants UI de base

- [x] **UI-05** — Créer les composants `components/ui/` : `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx`, `table.tsx`, `switch.tsx`, `textarea.tsx`.

#### Composants métier

- [x] **UI-06** — Créer `components/Dashboard.tsx` : vue d'ensemble avec cartes stats et activité récente.
- [x] **UI-07** — Créer `components/StatsCards.tsx` : cartes KPI (connexions envoyées, messages, taux de réponse, taux de conversion).
- [x] **UI-08** — Créer `components/RecentActivity.tsx` : liste des dernières actions avec statuts.
- [x] **UI-09** — Créer `components/ProspectsPipeline.tsx` : tableau complet des prospects avec filtres, statuts, scoring, ajout/édition/suppression.
- [x] **UI-10** — Créer `components/Campaigns.tsx` : gestion des campagnes (création, liste, détail, exécution, duplication, stats).
- [x] **UI-11** — Créer `components/ApprovalQueue.tsx` : queue d'approbation avec boutons approuver/rejeter/modifier/arrêter/reprendre.
- [x] **UI-12** — Créer `components/Settings.tsx` : settings complets (délais, horaires, limites, IA, AI model, tone, language, sentiment, smart-followup).
- [x] **UI-13** — Créer `components/LinkedInAccount.tsx` : connexion du compte LinkedIn, statut de session, historique d'actions.
- [x] **UI-14** — Créer `components/NotificationPanel.tsx` : panneau de notifications en temps réel.
- [x] **UI-15** — Créer `components/UsersManagement.tsx` : gestion des utilisateurs et rôles (admin).
- [x] **UI-16** — Créer `components/PerformanceCharts.tsx` : graphiques de performance avec Recharts.

#### Module BI Analytics

- [x] **BI-01** — Créer `components/bi/BIShell.tsx` : shell du module BI avec navigation entre sous-sections.
- [x] **BI-02** — Créer `components/bi/KPIHero.tsx` : cartes KPI principaux (reply rate, conversion rate, hours saved, money saved).
- [x] **BI-03** — Créer `components/bi/AgentAnalytics.tsx` : analytics de l'agent IA (conversations, tool calls, succès/échec).
- [x] **BI-04** — Créer `components/bi/ConversionIntelligence.tsx` : analyse des conversions par secteur, taille entreprise, délai de réponse.
- [x] **BI-05** — Créer `components/bi/AIInsights.tsx` : insights générés par IA sur les campagnes et prospects.
- [x] **BI-06** — Créer `components/bi/Forecast.tsx` : prévisions de performance sur 30/60/90 jours.
- [x] **BI-07** — Créer `components/bi/ProspectMap.tsx` : carte géographique des prospects.
- [x] **BI-08** — Créer `components/bi/TemplateLab.tsx` : laboratoire de templates avec scoring et comparaison A/B.
- [x] **BI-09** — Créer `components/bi/biTypes.ts` : types TypeScript partagés pour le module BI.

#### API BI

- [x] **BI-10** — Créer `app/api/bi/route.ts` : données agrégées pour les KPIs principaux.
- [x] **BI-11** — Créer `app/api/bi/agent/route.ts` : analytics de l'agent IA (usage, coûts, performances).
- [x] **BI-12** — Créer `app/api/bi/conversion/route.ts` : données de conversion par segment.
- [x] **BI-13** — Créer `app/api/bi/forecast/route.ts` : calculs de prévision.
- [x] **BI-14** — Créer `app/api/bi/insights/route.ts` : génération d'insights IA.
- [x] **BI-15** — Créer `app/api/bi/seed/route.ts` : endpoint pour insérer les données BI de démonstration.

#### Contextes React

- [x] **UI-17** — Créer `contexts/SettingsContext.tsx` : contexte global pour les settings utilisateur accessibles dans tous les composants.

**Critères d'acceptation Sprint 6 :**
- Le dashboard se charge sans erreur de compilation.
- Le pipeline prospects affiche, filtre et édite les prospects.
- La queue d'approbation permet d'approuver/rejeter des actions.
- Le module BI affiche les graphiques avec les données seed.

---

## Sprint 7 — IA, Settings avancés & DevOps

**Objectif :** Implémenter l'agent IA conversationnel LangChain/OpenAI, l'analyse de sentiment, le smart follow-up, les settings avancés, les pipelines CI/CD, et la configuration de déploiement final.

**Durée :** 2 semaines

**Dépendances :** Sprints 1–6 entièrement terminés

### User Stories

- En tant qu'utilisateur, je veux un agent IA capable de gérer ma prospection par conversation.
- En tant qu'utilisateur, je veux que les réponses négatives soient détectées pour éviter les relances inutiles.
- En tant que DevOps, je veux un pipeline CI/CD automatisé pour les déploiements.

### Tâches

#### Agent IA LangChain

- [x] **AI-01** — Créer `lib/agent.ts` : classe `LinkedInAgent` avec LangChain, ChatOpenAI, gestion historique conversations, boucle multi-tool max 5 rounds.
- [x] **AI-02** — Créer `lib/tools.ts` : ensemble complet des outils de l'agent (recherche prospects, création campagne, envoi connexion, envoi message, consultation stats, gestion queue).
- [x] **AI-03** — Créer `lib/agent-config.ts` : configuration des paramètres de l'agent (modèle, température, max tokens, tools actifs).
- [x] **AI-04** — Créer `lib/agent-context.ts` : contexte utilisateur injecté dans l'agent (tone, langue, objectifs).
- [x] **AI-05** — Créer `app/api/agent/route.ts` : route principale du chat IA avec gestion session et historique.

#### Composant Chat IA

- [x] **AI-06** — Créer `components/AgentChat.tsx` : interface de chat complète avec historique, indicateurs d'outil, streaming des réponses, suggestions.

#### Analyse de Sentiment

- [x] **AI-07** — Implémenter `sentimentAnalysis` dans `app/api/auto-reply/route.ts` : appel OpenAI pour classifier positive/neutral/negative, score -1 à +1, reason en français.
- [x] **AI-08** — Sauvegarder le résultat du sentiment dans `notes` du prospect en DB.
- [x] **AI-09** — Bloquer l'auto-reply si sentiment négatif, retourner `skipped: true` avec la raison pour revue manuelle.

#### Smart Follow-Up

- [x] **AI-10** — Implémenter `smartFollowUp` dans `app/api/followups/execute/route.ts` : lecture du setting `smartFollowUp`, annulation automatique si prospect négatif, responded, ou auto_replied.
- [x] **AI-11** — Étendre la vérification des statuts à `auto_replied` et `responded` en plus de `replied` et `converted`.

#### Exposition des paramètres IA

- [x] **AI-12** — Exposer `sentimentAnalysis` dans `app/api/settings/agent/route.ts` avec défaut `false`.
- [x] **AI-13** — Exposer `smartFollowUp` dans `app/api/settings/agent/route.ts` avec défaut `false`.

#### CI/CD & Workflows GitHub Actions

- [x] **DEVOPS-01** — Créer `.github/workflows/ci.yml` : lint, build TypeScript frontend et worker à chaque push.
- [x] **DEVOPS-02** — Créer `.github/workflows/deploy.yml` : déploiement automatique sur Coolify via webhook après merge sur `main`.
- [x] **DEVOPS-03** — Créer `.github/workflows/backup.yml` : backup automatique PostgreSQL planifié quotidiennement.
- [x] **DEVOPS-04** — Créer `.github/workflows/security.yml` : audit de sécurité npm et scan des dépendances vulnérables.
- [x] **DEVOPS-05** — Créer `.github/dependabot.yml` : mises à jour automatiques des dépendances npm.

#### Documentation

- [x] **DOC-01** — Créer `linkedin-agent-frontend/README.md` : guide d'installation, variables d'environnement, routes API documentées.
- [x] **DOC-02** — Créer `linkedin-agent-worker/README.md` : guide d'installation worker, variables d'environnement, commandes.
- [x] **DOC-03** — Créer `DEVOPS.md` : documentation complète de l'architecture de déploiement.
- [x] **DOC-04** — Créer `README.md` racine : vue d'ensemble du projet, architecture, prérequis, démarrage rapide.

**Critères d'acceptation Sprint 7 :**
- L'agent IA répond correctement aux questions de prospection via le chat.
- L'analyse de sentiment bloque les auto-replies négatifs.
- Le smart follow-up annule les relances sur prospects négatifs.
- Le pipeline CI est vert sur la branche `main`.
- Le déploiement Coolify s'exécute automatiquement après merge.

---

## Récapitulatif Sprint Planning

| Sprint | Durée | Nbre de tâches | Statut |
|---|---|---|---|
| Sprint 1 — Infrastructure & DB | 2 semaines | 19 tâches | ✅ Terminé |
| Sprint 2 — Backend API Core | 2 semaines | 24 tâches | ✅ Terminé |
| Sprint 3 — Auth & Sécurité | 2 semaines | 16 tâches | ✅ Terminé |
| Sprint 4 — Worker Cloud & Actions LinkedIn | 2 semaines | 16 tâches | ✅ Terminé |
| Sprint 5 — Extension Chrome | 2 semaines | 16 tâches | ✅ Terminé |
| Sprint 6 — Dashboard Frontend & BI | 2 semaines | 32 tâches | ✅ Terminé |
| Sprint 7 — IA, Settings & DevOps | 2 semaines | 18 tâches | ✅ Terminé |
| **TOTAL** | **14 semaines** | **141 tâches** | **✅ Projet livré** |

---

## Définition of Done (DoD) — Critères globaux

- Le code compile sans erreur TypeScript.
- Les routes API retournent les codes HTTP corrects.
- Les composants React se rendent sans erreur dans le navigateur.
- Les fonctionnalités sont testées manuellement sur un environnement local Docker.
- Les variables d'environnement sensibles ne sont pas commitées.
- Les migrations DB sont versionnées et documentées.
- Le code est mergé sur la branche principale après review.
