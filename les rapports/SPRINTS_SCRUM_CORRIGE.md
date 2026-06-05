# Répartition corrigée des 7 Sprints — LinkedIn Agent Project

## Méthodologie utilisée

Le projet est réparti selon la méthodologie **Scrum** en **7 sprints**. Chaque sprint livre un incrément fonctionnel du produit et contient des tâches réellement présentes dans le projet :

- **Front-end** : composants React/Next.js, dashboard, pages, UI.
- **Back-end** : routes API Next.js, logique métier, services.
- **Base de données** : schéma PostgreSQL, migrations, seed data.
- **Cloud / Worker** : Docker, Puppeteer, worker queue, exécution LinkedIn.
- **Extension Chrome** : popup, background, content script, bridge.
- **IA / BI** : agent LangChain/OpenAI, auto-reply, sentiment analysis, analytics.
- **DevOps / Tests** : Docker, GitHub Actions, build, déploiement, monitoring.

---

## Vue globale des sprints

| Sprint | Objectif | Incrément livré |
|---|---|---|
| **Sprint 1** | Initialisation technique et socle projet | Structure Next.js, PostgreSQL, Docker, composants UI de base |
| **Sprint 2** | Gestion des prospects et campagnes | CRUD prospects, CRUD campagnes, pipeline frontend, templates |
| **Sprint 3** | Queue d'approbation et actions LinkedIn | Queue d'actions, approbation humaine, rate limiter, début worker |
| **Sprint 4** | Worker cloud et automatisation LinkedIn | Worker Puppeteer, login LinkedIn, actions connect/message/visit |
| **Sprint 5** | Extension Chrome et auto-réponse | Extension, détection inbox, notifications, auto-reply API |
| **Sprint 6** | Dashboard BI et intelligence commerciale | KPIs, analytics agent, conversion, forecast, template lab |
| **Sprint 7** | IA avancée, sécurité, DevOps et finalisation | Agent IA, sentiment analysis, smart follow-up, auth, CI/CD, preuves |

---

# Sprint 1 — Initialisation technique, base de données et socle UI

## Objectif du sprint

Mettre en place la structure technique du projet, préparer l'environnement local/Docker, créer le schéma PostgreSQL initial et construire les composants UI de base nécessaires aux futurs écrans.

## Tâches Front-end

- Créer la structure Next.js dans `linkedin-agent-frontend`.
- Créer `app/layout.tsx` pour le layout global de l'application.
- Créer `app/page.tsx` comme point d'entrée du dashboard.
- Créer `app/globals.css` pour les styles globaux.
- Créer les composants UI de base dans `components/ui/` :
  - `button.tsx`
  - `card.tsx`
  - `badge.tsx`
  - `input.tsx`
  - `select.tsx`
  - `dialog.tsx`
  - `tabs.tsx`
  - `table.tsx`
  - `switch.tsx`
  - `textarea.tsx`
- Créer `components/Header.tsx` pour la navigation principale.

## Tâches Back-end

- Créer `lib/db.ts` pour la connexion PostgreSQL.
- Créer `lib/utils.ts` pour les fonctions utilitaires.
- Créer `app/api/health/route.ts` pour vérifier l'état de l'application.
- Créer `app/api/test-db/route.ts` pour tester la connexion PostgreSQL.
- Créer `app/api/db-columns/route.ts` pour vérifier les colonnes disponibles dans la base.

## Tâches Base de données

- Créer `linkedin-agent-frontend/db/schema.sql`.
- Créer les tables principales :
  - `users`
  - `prospects`
  - `campaigns`
  - `messages`
  - `templates`
  - `scheduled_followups`
  - `linkedin_actions_queue`
- Créer `linkedin-agent-frontend/db/seed.sql` avec des données de démonstration.
- Créer `linkedin-agent-frontend/db/error_logs.sql`.
- Créer `db/migrations/README.md`.

## Tâches Cloud / DevOps

- Créer le `Dockerfile` racine.
- Créer `linkedin-agent-frontend/Dockerfile`.
- Créer `docker-compose.yml`.
- Créer `nginx.conf`.
- Créer les fichiers `.dockerignore`.
- Définir les variables d'environnement nécessaires :
  - `DATABASE_URL`
  - `OPENAI_API_KEY`
  - `JWT_SECRET`
  - `LINKEDIN_EMAIL`
  - `LINKEDIN_PASSWORD`

## Livrable du sprint

Un projet Next.js initialisé, connecté à PostgreSQL, exécutable en local/Docker, avec une base de données initiale et une UI prête pour les modules métier.

---

# Sprint 2 — Gestion des prospects, campagnes et templates

## Objectif du sprint

Développer le noyau métier de la prospection : gestion des prospects, gestion des campagnes, templates de messages et première visualisation des données dans le dashboard.

## Tâches Front-end

- Créer `components/ProspectsPipeline.tsx`.
- Ajouter l'affichage de la liste des prospects.
- Ajouter les filtres par statut, campagne, score et recherche texte.
- Ajouter le formulaire d'ajout/modification de prospect.
- Créer `components/Campaigns.tsx`.
- Ajouter l'affichage des campagnes.
- Ajouter le formulaire de création de campagne.
- Ajouter les actions de modification, duplication et suppression de campagne.
- Créer `components/Dashboard.tsx`.
- Créer `components/StatsCards.tsx` pour les premiers indicateurs.
- Créer `components/RecentActivity.tsx` pour l'activité récente.

## Tâches Back-end

- Créer `app/api/prospects/route.ts` pour lister et créer les prospects.
- Créer `app/api/prospects/[id]/route.ts` pour lire, modifier et supprimer un prospect.
- Créer `app/api/prospects/bulk/route.ts` pour l'import en masse.
- Créer `app/api/prospects/score/route.ts`.
- Créer `lib/prospectScore.ts` pour calculer le score d'un prospect.
- Créer `app/api/campaigns/route.ts`.
- Créer `app/api/campaigns/[id]/route.ts`.
- Créer `app/api/campaigns/[id]/prospects/route.ts`.
- Créer `app/api/campaigns/[id]/stats/route.ts`.
- Créer `app/api/templates/route.ts`.
- Créer `app/api/messages/route.ts`.
- Créer `app/api/stats/route.ts`.

## Tâches Base de données

- Vérifier les relations entre `prospects`, `campaigns`, `messages` et `templates`.
- Ajouter les données de test nécessaires aux prospects et campagnes.
- Vérifier les statuts de prospects : contacté, répondu, converti, relance planifiée.

## Tâches Tests / Validation

- Tester l'ajout d'un prospect depuis l'interface.
- Tester la modification d'un prospect.
- Tester la création d'une campagne.
- Tester l'association de prospects à une campagne.
- Tester l'affichage des statistiques de base.

## Livrable du sprint

Un module fonctionnel de gestion des prospects et campagnes avec API backend, base de données et interface utilisateur.

---

# Sprint 3 — Queue d'approbation, rate limiting et premières actions LinkedIn

## Objectif du sprint

Mettre en place le système de contrôle humain avant exécution, la queue d'actions LinkedIn, les limites de sécurité et le début de l'intégration worker.

## Tâches Front-end

- Créer `components/ApprovalQueue.tsx`.
- Afficher les actions LinkedIn en attente.
- Ajouter les boutons :
  - approuver
  - rejeter
  - modifier
  - stopper
  - reprendre
- Afficher le statut des actions : pending, approved, running, completed, failed.
- Afficher les erreurs d'exécution dans la queue.
- Intégrer la queue dans `app/page.tsx`.

## Tâches Back-end

- Créer `app/api/linkedin-actions/route.ts`.
- Créer `app/api/linkedin-actions/[id]/route.ts`.
- Créer `app/api/linkedin-actions/[id]/approve/route.ts`.
- Créer `lib/rate-limiter.ts` pour contrôler :
  - limite quotidienne
  - limite horaire
  - délai minimum entre actions
  - limite par campagne
- Créer `app/api/followups/route.ts`.
- Créer la première version de `app/api/followups/execute/route.ts`.
- Ajouter les actions queue générées depuis les campagnes.

## Tâches Base de données

- Créer la migration `db/migrations/001_add_worker_queue.sql`.
- Ajouter les colonnes :
  - `worker_id`
  - `claimed_at`
  - `completed_at`
  - `retry_count`
  - `error_message`
- Ajouter les indexes nécessaires pour récupérer rapidement les actions `approved`.

## Tâches Cloud / Worker

- Initialiser le dossier `linkedin-agent-worker`.
- Créer `linkedin-agent-worker/package.json`.
- Créer `linkedin-agent-worker/tsconfig.json`.
- Créer `linkedin-agent-worker/src/types.ts`.
- Créer `linkedin-agent-worker/src/queue.ts` avec :
  - `claimNextAction()`
  - `completeAction()`
  - `failAction()`
  - `releaseStuckActions()`
  - `getQueueStats()`
  - `updateWorkerHeartbeat()`

## Tâches Tests / Validation

- Tester la création d'une action depuis l'API.
- Tester l'approbation d'une action.
- Tester le blocage par rate limiter.
- Tester la récupération d'une action approuvée par le worker.

## Livrable du sprint

Une queue d'actions sécurisée avec validation humaine, limites d'exécution et fondation du worker cloud.

---

# Sprint 4 — Worker cloud Puppeteer et automatisation LinkedIn

## Objectif du sprint

Développer le worker cloud capable d'exécuter les actions LinkedIn approuvées : visiter un profil, envoyer une invitation, envoyer un message et gérer la session LinkedIn.

## Tâches Cloud / Worker

- Créer `linkedin-agent-worker/src/browser.ts`.
- Implémenter `getBrowser()`.
- Implémenter `createPage()`.
- Implémenter `closeBrowser()`.
- Ajouter les helpers Puppeteer :
  - `safeWaitForSelector()`
  - `safeClick()`
  - `humanTyping()`
  - `humanScroll()`
  - `sleep()`
- Ajouter le redémarrage du navigateur après plusieurs utilisations.
- Implémenter `isLoggedInToLinkedIn()`.
- Implémenter `loginToLinkedIn()`.
- Ajouter la détection de checkpoint LinkedIn.
- Créer `linkedin-agent-worker/src/index.ts`.
- Ajouter la boucle principale du worker.
- Ajouter le heartbeat du worker.
- Ajouter la recovery loop des actions bloquées.
- Ajouter le graceful shutdown.
- Appeler le login LinkedIn au démarrage.

## Tâches Actions LinkedIn

- Créer `linkedin-agent-worker/src/actions/connect.ts`.
- Implémenter l'envoi d'invitation LinkedIn.
- Ajouter le support d'une note personnalisée.
- Corriger le bug d'apostrophe dans la chaîne `Envoyer l'invitation`.
- Ajouter plusieurs sélecteurs robustes pour le bouton de connexion.
- Créer `linkedin-agent-worker/src/actions/message.ts`.
- Implémenter l'envoi d'un message LinkedIn.
- Ajouter les fallbacks DOM text pour le bouton Message.
- Ajouter le fallback `Ctrl+Enter` pour l'envoi.
- Créer `linkedin-agent-worker/src/actions/visit.ts`.
- Implémenter la visite de profil.
- Extraire nom, rôle, entreprise et localisation.
- Renforcer tous les sélecteurs pour LinkedIn 2024/2025.

## Tâches Back-end

- Vérifier que les actions exécutées par le worker mettent bien à jour la queue.
- Vérifier que les erreurs du worker sont remontées dans `linkedin_actions_queue`.
- Vérifier que le statut `completed` est bien enregistré après réussite.

## Tâches DevOps / Tests

- Créer ou finaliser `linkedin-agent-worker/Dockerfile`.
- Installer les dépendances worker avec `npm install`.
- Tester la compilation worker avec `npm run build`.
- Valider que TypeScript compile sans erreur.
- Documenter la preuve dans `PREUVE_TEST_WORKER_JURY.md`.

## Livrable du sprint

Un worker Puppeteer compilable et opérationnel, capable d'exécuter les actions LinkedIn approuvées depuis la queue.

---

# Sprint 5 — Extension Chrome, inbox detection et auto-reply

## Objectif du sprint

Développer l'extension Chrome permettant l'exécution côté navigateur, la détection des réponses LinkedIn et le déclenchement automatique de réponses IA.

## Tâches Extension Chrome

- Créer `linkedin-chrome-extension/manifest.json`.
- Définir les permissions Chrome :
  - `storage`
  - `alarms`
  - `tabs`
  - `scripting`
  - `notifications`
- Définir les permissions LinkedIn dans `host_permissions`.
- Créer `linkedin-chrome-extension/popup.html`.
- Créer `linkedin-chrome-extension/popup.js`.
- Créer `linkedin-chrome-extension/background.js`.
- Créer `linkedin-chrome-extension/content.js`.
- Créer `linkedin-chrome-extension/bridge.js`.
- Créer `linkedin-chrome-extension/selectors.js`.
- Créer `linkedin-chrome-extension/styles.css`.
- Créer les icônes dans `linkedin-chrome-extension/icons/`.
- Créer `create-icons.js`.

## Tâches Back-end

- Créer `app/api/settings/agent/route.ts` pour exposer les paramètres à l'extension.
- Créer `app/api/auto-reply/route.ts`.
- Créer `app/api/notifications/route.ts`.
- Créer `lib/extensionBridge.ts`.
- Ajouter les headers CORS pour permettre à l'extension d'appeler les routes API.

## Tâches Fonctionnelles

- Implémenter le chargement des settings dans `background.js`.
- Implémenter les alarmes Chrome :
  - check inbox
  - check connections
  - recovery
- Implémenter la détection des messages inbox LinkedIn.
- Implémenter la détection des nouvelles connexions acceptées.
- Implémenter les limites journalières côté extension.
- Déclencher `POST /api/auto-reply` lorsqu'un prospect répond.
- Stocker les notifications côté backend.

## Tâches Front-end

- Créer `components/NotificationPanel.tsx`.
- Afficher les notifications venant de l'extension.
- Afficher l'état auto-reply dans les settings.

## Tâches Tests / Validation

- Charger l'extension en mode développeur dans Chrome.
- Tester l'ouverture du popup.
- Tester l'appel à `/api/settings/agent` depuis l'extension.
- Tester la détection d'un message LinkedIn.
- Tester le déclenchement de l'auto-reply.

## Livrable du sprint

Une extension Chrome fonctionnelle connectée au backend, capable de détecter les réponses LinkedIn et déclencher l'auto-reply.

---

# Sprint 6 — Dashboard complet, paramètres et Business Intelligence

## Objectif du sprint

Construire l'interface complète de supervision : dashboard principal, paramètres, compte LinkedIn, gestion utilisateurs, graphiques et module BI.

## Tâches Front-end

- Finaliser `components/Dashboard.tsx`.
- Finaliser `components/StatsCards.tsx`.
- Finaliser `components/RecentActivity.tsx`.
- Finaliser `components/ProspectsPipeline.tsx`.
- Finaliser `components/Campaigns.tsx`.
- Finaliser `components/ApprovalQueue.tsx`.
- Créer `components/Settings.tsx`.
- Créer `components/LinkedInAccount.tsx`.
- Créer `components/UsersManagement.tsx`.
- Créer `components/PerformanceCharts.tsx`.
- Créer `contexts/SettingsContext.tsx`.

## Tâches BI Front-end

- Créer `components/bi/BIShell.tsx`.
- Créer `components/bi/KPIHero.tsx`.
- Créer `components/bi/AgentAnalytics.tsx`.
- Créer `components/bi/ConversionIntelligence.tsx`.
- Créer `components/bi/AIInsights.tsx`.
- Créer `components/bi/Forecast.tsx`.
- Créer `components/bi/ProspectMap.tsx`.
- Créer `components/bi/TemplateLab.tsx`.
- Créer `components/bi/biTypes.ts`.

## Tâches Back-end BI

- Créer `app/api/bi/route.ts`.
- Créer `app/api/bi/agent/route.ts`.
- Créer `app/api/bi/conversion/route.ts`.
- Créer `app/api/bi/forecast/route.ts`.
- Créer `app/api/bi/insights/route.ts`.
- Créer `app/api/bi/seed/route.ts`.
- Créer `app/api/performance/route.ts`.
- Créer `app/api/monitoring/route.ts`.

## Tâches Base de données

- Créer `linkedin-agent-frontend/db/bi_seed.sql`.
- Ajouter les données nécessaires aux graphes BI.
- Vérifier les métriques :
  - taux de réponse
  - taux de conversion
  - nombre d'actions approuvées
  - nombre d'actions échouées
  - temps économisé
  - argent économisé

## Tâches Tests / Validation

- Tester l'affichage des KPIs.
- Tester les graphiques de performance.
- Tester les pages BI.
- Tester la cohérence des données entre API BI et composants React.

## Livrable du sprint

Un dashboard complet permettant de superviser les prospects, campagnes, actions, paramètres et statistiques BI.

---

# Sprint 7 — IA avancée, sécurité, DevOps et finalisation projet

## Objectif du sprint

Finaliser le projet avec l'agent IA, l'analyse de sentiment, le smart follow-up, la sécurité, les workflows CI/CD, la documentation et les preuves pour la soutenance.

## Tâches IA

- Créer `lib/agent.ts`.
- Implémenter la classe `LinkedInAgent`.
- Ajouter LangChain et OpenAI.
- Ajouter l'historique de conversation.
- Ajouter la boucle multi-tool.
- Créer `lib/tools.ts` avec les outils de l'agent :
  - recherche prospects
  - création campagne
  - génération message
  - consultation statistiques
  - création action LinkedIn
  - gestion queue
- Créer `lib/agent-config.ts`.
- Créer `lib/agent-context.ts`.
- Créer `app/api/agent/route.ts`.
- Créer `components/AgentChat.tsx`.

## Tâches Auto-reply avancées

- Implémenter `sentimentAnalysis` dans `app/api/auto-reply/route.ts`.
- Classer les réponses en :
  - positive
  - neutral
  - negative
- Générer un score de sentiment entre -1 et +1.
- Sauvegarder le sentiment dans les notes du prospect.
- Bloquer l'auto-reply si le sentiment est négatif.
- Retourner `skipped: true` avec une raison claire.

## Tâches Smart Follow-up

- Améliorer `app/api/followups/execute/route.ts`.
- Lire le paramètre `smartFollowUp` depuis les settings.
- Annuler une relance si le prospect a répondu.
- Annuler une relance si le prospect est converti.
- Annuler une relance si le prospect a été auto-replied.
- Annuler une relance si un sentiment négatif est détecté.

## Tâches Settings

- Mettre à jour `app/api/settings/agent/route.ts`.
- Exposer `autoReplyEnabled`.
- Exposer `autoDetectLanguage`.
- Exposer `sentimentAnalysis`.
- Exposer `smartFollowUp`.
- Exposer `tone`.
- Exposer `aiModel`.

## Tâches Authentification / Sécurité

- Créer `app/api/auth/login/route.ts`.
- Créer `app/api/auth/logout/route.ts`.
- Créer `lib/auth.ts`.
- Créer `lib/requestAuth.ts`.
- Créer `lib/security.ts`.
- Créer `app/api/users/route.ts`.
- Créer `app/api/users/[id]/route.ts`.
- Créer la migration `db/migrations/002_add_auth_roles.sql`.

## Tâches DevOps

- Créer `.github/workflows/ci.yml`.
- Créer `.github/workflows/deploy.yml`.
- Créer `.github/workflows/backup.yml`.
- Créer `.github/workflows/security.yml`.
- Créer `.github/dependabot.yml`.
- Créer `DEVOPS.md`.
- Mettre à jour `README.md` racine.
- Mettre à jour `linkedin-agent-frontend/README.md`.
- Mettre à jour `linkedin-agent-worker/README.md`.

## Tâches Tests / Preuves soutenance

- Tester `npm run build` du worker.
- Créer `PREUVE_TEST_WORKER_JURY.md`.
- Créer `TABLEAU_COMPARATIF_FINAL.md`.
- Créer `TABLEAU_COMPARATIF_FINAL.csv`.
- Créer `TABLEAU_COMPARATIF_FINAL.png`.
- Créer `TABLEAU_COMPARATIF_EXISTING_SOLUTIONS.png`.
- Créer `SPRINTS_SCRUM_CORRIGE.md`.

## Livrable du sprint

Une version finalisée du projet avec IA avancée, sécurité, DevOps, documentation et preuves utilisables pour la soutenance.

---

# Récapitulatif final

| Sprint | Front-end | Back-end | DB | Worker / Cloud | Extension | IA / BI | DevOps / Tests |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Sprint 1** | Oui | Oui | Oui | Oui | Non | Non | Oui |
| **Sprint 2** | Oui | Oui | Oui | Non | Non | Non | Oui |
| **Sprint 3** | Oui | Oui | Oui | Oui | Non | Non | Oui |
| **Sprint 4** | Non | Oui | Non | Oui | Non | Non | Oui |
| **Sprint 5** | Oui | Oui | Non | Non | Oui | Oui | Oui |
| **Sprint 6** | Oui | Oui | Oui | Non | Non | Oui | Oui |
| **Sprint 7** | Oui | Oui | Oui | Oui | Oui | Oui | Oui |

## Conclusion

Cette répartition est cohérente avec le projet réel :

- Les premières bases techniques sont posées dans le Sprint 1.
- Les modules métier principaux sont développés dans les Sprints 2 et 3.
- L'automatisation LinkedIn cloud est concentrée dans le Sprint 4.
- L'extension Chrome et la détection inbox sont réalisées dans le Sprint 5.
- Le dashboard complet et la BI sont livrés dans le Sprint 6.
- L'IA avancée, la sécurité, le DevOps et les preuves finales sont terminés dans le Sprint 7.
