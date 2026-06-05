# Scénario Complet : Prospection Manuelle via l'Agent IA

> **Objectif** : Décrire exhaustivement le flux de création d'un prospect à partir du chat avec l'agent IA, en passant par la file d'approbation, l'exécution par l'extension Chrome, jusqu'à l'apparition dans le pipeline CRM.
>
> **Exclusion** : Ce document ne couvre PAS la création automatique directe d'un prospect par l'agent sans action LinkedIn exécutée.

---

## 1. Acteurs et Objets du Système

| Entité | Rôle |
|--------|------|
| **User** | Utilisateur authentifié qui discute avec l'agent, approuve les actions et consulte le pipeline |
| **AgentChat** | Composant React frontend (`components/AgentChat.tsx`) — interface de conversation |
| **ApprovalQueue** | Composant React frontend (`components/ApprovalQueue.tsx`) — file d'attente des actions |
| **ProspectsPipeline** | Composant React frontend (`components/ProspectsPipeline.tsx`) — kanban CRM |
| **API_AgentChat** | Route Next.js `app/api/agent/chat/route.ts` — orchestrateur du chat |
| **Agent_IA** | Instance singleton (`lib/agent.ts` + `lib/tools.ts`) — moteur LangChain + OpenAI |
| **DB_AgentChatHistory** | Table `agent_chat_history` — persistence des messages |
| **DB_ToolSteps** | Table `agent_tool_steps` — trace des appels outils |
| **DB_LinkedInActionsQueue** | Table `linkedin_actions_queue` — file des actions à exécuter |
| **DB_Prospects** | Table `prospects` — registre des prospects CRM |
| **DB_Messages** | Table `messages` — copie des messages envoyés |
| **API_LinkedInActions** | Route Next.js `app/api/linkedin-actions/route.ts` — CRUD + exécution actions |
| **API_LinkedInActionsApproval** | Route Next.js `app/api/linkedin-actions/approval/route.ts` — approbation/rejet |
| **API_Prospects** | Route Next.js `app/api/prospects/route.ts` — gestion des prospects |
| **ExtensionChrome** | `linkedin-chrome-extension/background.js` — exécute les actions sur LinkedIn |
| **LinkedIn** | Site web LinkedIn (cible des actions) |
| **Worker** | `linkedin-agent-worker/src/queue.ts` — worker de file d'attente (claim/release) |

---

## 2. Flux Détaillé

### Étape 1 — Initiation de la Conversation

1. **User** s'authentifie via le système d'auth (`/api/auth/*`).
2. **User** ouvre l'onglet **Agent** dans le dashboard.
3. **AgentChat** s'initialise et effectue un `bootstrap` : il appelle en parallèle :
   - `GET /api/agent/chat` → récupère la liste des conversations et l'historique du dernier chat
   - `GET /api/agent/activity` → récupère la timeline des actions (`linkedin_action`, `followup`, `campaign`, `tool_step`)
4. **AgentChat** affiche le message de bienvenue de l'agent IA et l'historique existant.
5. Un **intervalle de polling** est démarré côté frontend (toutes les 4 secondes) pour rafraîchir automatiquement la timeline des actions dans le panneau latéral.

### Étape 2 — L'User Formule une Demande de Prospection

6. **User** tape un message dans le chat (ex: *"Envoie une demande de connexion à Jean Dupont, CTO chez TechCorp, avec une note personnalisée"*).
7. **AgentChat** envoie `POST /api/agent/chat` avec le corps :
   ```json
   {
     "message": "...",
     "conversationId": "uuid-...",
     "context": { "currentPage": "/agent", "timestamp": "..." }
   }
   ```
8. L'**API_AgentChat** :
   - Génère un `conversationId` si absent
   - Identifie l'utilisateur (`getRequestUser`) et son `ownerId`
   - Lit les settings utilisateur (modèle AI, ton, langue) dans la table `users`
   - Appelle `agent.chat(message, enrichedContext, chosenModel)`

### Étape 3 — L'Agent IA Analyse et Appelle le Tool

9. **Agent_IA** (`lib/agent.ts`) :
   - Construit le prompt système avec le ton et la langue
   - Envoie le message au LLM OpenAI (modèle configuré, par défaut GPT-4)
   - Le LLM détecte l'intention et appelle le **tool** approprié :
     - `linkedin_send_connection` — demande de connexion
     - `linkedin_send_message` — message direct
     - `linkedin_search` — recherche de profils
     - `linkedin_visit_profile` — visite de profil
     - `search_and_message` / `search_and_connection` — campagnes

10. Le **tool** (`lib/tools.ts`) exécute sa logique métier :
    - **Vérification des limites LinkedIn** (`checkRateLimit`) — limites quotidiennes et horaires par type d'action
    - **Anti-doublon** — vérifie si une action identique n'existe pas déjà (`pending_approval`, `approved`, `processing` dans l'heure)
    - **Normalisation de l'URL** LinkedIn (`normalizeLinkedInUrl`)
    - **Insertion dans la file** via `insertLinkedInAction` (`lib/db.ts`) :
      ```sql
      INSERT INTO linkedin_actions_queue
      (action_type, target_url, target_name, payload, status, campaign_id, user_id, created_at)
      VALUES ('send_connection', 'https://www.linkedin.com/in/jean-dupont',
              'Jean Dupont', '{"note":"..."}', 'pending_approval', NULL, 42, NOW())
      ```
    - Le `status` est TOUJOURS `'pending_approval'` pour les actions créées par l'agent (`source === 'agent'`)
    - Le `user_id` est l'ID de l'utilisateur authentifié (isolation des données)

11. **Agent_IA** retourne à l'**API_AgentChat** :
    - La réponse textuelle de confirmation
    - La liste des `toolSteps` exécutés

12. L'**API_AgentChat** persiste :
    - Le message user + la réponse assistant dans `agent_chat_history`
    - Les tool steps dans `agent_tool_steps`

13. **AgentChat** affiche la réponse de l'agent à l'utilisateur, mentionnant l'ID de l'action créée et invitant à aller dans l'onglet **Approbations**.

### Étape 4 — L'Action Apparaît dans la File d'Approbation

14. Le panneau latéral **Actions de l'agent** dans **AgentChat** (et la page **ApprovalQueue** dédiée) affiche automatiquement la nouvelle action grâce au polling (toutes les 4–5 secondes).
15. **ApprovalQueue** appelle `GET /api/linkedin-actions/approval` qui :
    - Vérifie l'authentification et le scope (`getScopeUserIds`)
    - Filtre les actions par `user_id` (ou toute l'équipe pour un admin)
    - Retourne les actions avec leur statut, icône, payload décompressé, et nom du propriétaire (`owner_name`)
    - Fournit aussi les **stats** par statut (`pending_approval`, `approved`, `completed`, `rejected`, `failed`, `processing`, `stopped`)

16. L'action s'affiche avec :
    - Un badge **"En attente"** (jaune)
    - Les détails (type, cible, note/message)
    - Deux boutons : **Approuver** (vert) et **Rejeter** (rouge)

### Étape 5 — L'User Approuve l'Action

17. **User** clique sur **Approuver** dans **ApprovalQueue**.
18. **ApprovalQueue** envoie `POST /api/linkedin-actions/approval` avec :
    ```json
    { "id": 123, "action": "approve" }
    ```
19. L'**API_LinkedInActionsApproval** :
    - Vérifie l'authentification et l'**ownership** de l'action (scope user)
    - Vérifie que le statut actuel est bien `pending_approval`
    - Met à jour le statut vers `approved`
    - Enregistre dans `result` : `{ approved_at, last_action: "approve" }`
    - Si l'action est liée à une **campagne** (`campaign_id`), active automatiquement la campagne (`status = 'active'`)
    - Retourne le message de confirmation : *"Action #123 approuvée. Elle sera exécutée par l'extension Chrome."*

20. **ApprovalQueue** met à jour son état local, navigue vers l'onglet **Approuvées**, et démarre un **polling rapide** (toutes les 5 secondes, 6 fois = 30 secondes) pour suivre l'exécution.

### Étape 6 — L'Extension Chrome Récupère l'Action Approuvée

21. L'**ExtensionChrome** (`background.js`) a une alarme `pollActions` qui se déclenche **toutes les 12 secondes** (`periodInMinutes: 0.2`).
22. L'extension appelle `GET /api/linkedin-actions?status=approved`.
23. L'**API_LinkedInActions** :
    - Vérifie les **heures de travail** configurées par l'utilisateur (`isWithinWorkingHours`) :
      - Jours de prospection (`workingDays`)
      - Plage horaire (`workingHoursStart` → `workingHoursEnd`)
      - Si hors plage → retourne `actions: []` avec `paused: true` et `reason`
    - Vérifie que la campagne liée n'est pas en `paused` ou `completed`
    - Filtre par `user_id` (scope)
    - Retourne les actions approuvées, triées par `created_at ASC`

24. L'**ExtensionChrome** reçoit l'action et vérifie ses propres **limites journalières** (`LinkedIn Guard`) :
    ```js
    DAILY_LIMITS = {
      send_connection: 20,
      send_message: 30,
      visit_profile: 50,
      search: 25,
      search_and_message: 15,
      search_and_connection: 20
    }
    ```
    Si la limite est atteinte, l'action est ignorée.

### Étape 7 — Exécution de l'Action sur LinkedIn

25. L'**ExtensionChrome** marque `isProcessing = true` et ouvre un onglet LinkedIn (ou réutilise un onglet existant).
26. Selon le `action_type` :

    **a) `send_connection`** :
    - Ouvre le profil LinkedIn cible
    - Clique sur "Se connecter"
    - Remplit la note personnalisée (`payload.note`)
    - Clique sur "Envoyer"
    - Attend la confirmation visuelle

    **b) `send_message`** :
    - Ouvre la page de messagerie LinkedIn avec le profil cible
    - Remplit le message (`payload.message`)
    - Clique sur "Envoyer"
    - Attend la confirmation

    **c) `search` / `search_and_message` / `search_and_connection`** :
    - Ouvre l'URL de recherche LinkedIn
    - Scrolle et collecte les profils
    - Pour chaque profil, envoie la connexion ou le message (avec délais aléatoires entre chaque)

27. Pendant l'exécution, des **délais aléatoires** sont injectés pour simuler un comportement humain :
    - `send_connection` : 2–3 minutes entre chaque
    - `send_message` : 1m30–2m30 entre chaque
    - `visit_profile` : 20–40 secondes
    - `search` : 45–70 secondes

### Étape 8 — Retour du Résultat et Création du Prospect

28. Une fois l'action terminée, l'**ExtensionChrome** envoie :
    `PATCH /api/linkedin-actions`
    ```json
    {
      "id": 123,
      "status": "completed",
      "result": { "sent": true, "profile": { "name": "Jean Dupont", "role": "CTO", "company": "TechCorp" } }
    }
    ```

29. L'**API_LinkedInActions** (`PATCH`) :
    - Vérifie l'ownership (scope)
    - Vérifie que l'action n'a pas été **arrêtée** par l'utilisateur (`stopped`)
    - Met à jour le statut vers `completed` + `executed_at = NOW()`
    - Crée une **notification in-app** (`createNotification`) :
      - Type `connection` : "Invitation envoyée à Jean Dupont"
      - Type `message` : "Message envoyé à Jean Dupont"
      - Type `alert` si échec

    - **Crée ou met à jour le prospect dans `DB_Prospects`** :
      ```sql
      INSERT INTO prospects (name, role, company, linkedin_url, industry, location, score, status, created_at, updated_at)
      VALUES ('Jean Dupont', 'CTO', 'TechCorp', 'https://www.linkedin.com/in/jean-dupont', NULL, NULL, 50, 'identified', NOW(), NOW())
      ON CONFLICT (linkedin_url) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, prospects.name),
        role = COALESCE(EXCLUDED.role, prospects.role),
        company = COALESCE(EXCLUDED.company, prospects.company),
        updated_at = NOW()
      ```
      - Si `send_connection` ou `search_and_connection` → `status = 'identified'`
      - Si `send_message` → `status = 'contacted'` (si le prospect était `identified` ou `connected`)
      - Si `connection_accepted` → `status = 'connected'`

    - Met à jour la table **messages** (statut `pending` → `sent`)
    - Met à jour les **stats de campagne** (`contacted++`)
    - Si campagne terminée → `status = 'completed'`

### Étape 9 — Affichage dans le Pipeline CRM

30. **ProspectsPipeline** fait du **polling toutes les 10 secondes** (`fetchProspects(true)`).
31. Il appelle `GET /api/prospects?limit=100`.
32. L'**API_Prospects** retourne tous les prospects du scope utilisateur avec :
    - `owner_name` et `owner_id` (pour les admins)
    - `message_count` et `last_contact` (jointure avec `messages`)
33. **ProspectsPipeline** organise les prospects par **statut** dans 6 colonnes Kanban :
    - `identified` → **Identifiés** (demande de connexion envoyée)
    - `connected` → **Connectés** (connexion acceptée)
    - `contacted` → **Contactés** (premier message envoyé)
    - `responded` → **Réponses** (réponse reçue)
    - `interested` → **Intéressés**
    - `converted` → **Convertis** (client converti)
34. Le nouveau prospect apparaît dans la colonne appropriée avec son **score** calculé automatiquement (`calculateProspectScore`) basé sur la complétude du profil.

### Étape 10 — Détection Automatique des Avancées

35. L'**ExtensionChrome** exécute également des vérifications périodiques **automatiques** (indépendamment des actions approuvées) :

    **a) `checkPendingConnectionsFast`** (toutes les 2 minutes) :
    - Récupère les prospects en statut `identified`
    - Visite leur profil LinkedIn
    - Détecte le degré de connexion (1er degré = connecté)
    - Si connecté → `PATCH /api/prospects/{id}` avec `status = 'connected'`
    - Met à jour les stats campagne (`connections_accepted`)

    **b) `checkInboxForReplies`** (toutes les 5 minutes) :
    - Récupère les prospects en statut `contacted`
    - Ouvre la messagerie LinkedIn, scrape les conversations
    - Détecte les réponses par nom
    - Met à jour le prospect en `status = 'responded'`
    - Déclenche l'**auto-réponse** si activée (`autoReplyEnabled`)

    **c) `checkAcceptedConnections`** (toutes les 5 minutes) :
    - Fallback pour la page "Mon Réseau" LinkedIn
    - Met à jour les prospects identifiés en connectés

---

## 3. Gestion des Erreurs et Sécurité

| Point de contrôle | Mécanisme |
|-------------------|-----------|
| **Authentification** | JWT + sessions, vérifiée sur chaque endpoint API |
| **Scope / Ownership** | `getScopeUserIds` — un user ne voit que ses actions ; un admin voit toute l'équipe |
| **Working Hours** | Vérifiée avant de servir les actions `approved` à l'extension |
| **Rate Limiting** | Limites quotidiennes et horaires par type d'action, persistantes en DB |
| **Anti-doublon** | Vérifiée avant création (`send_message` : pas de doublon dans l'heure) |
| **LinkedIn Guard** | Compteurs journaliers côté extension, limites conservatives |
| **Recovery** | Actions bloquées en `processing` > 5 min sont automatiquement libérées (`releaseStuckActions`) |
| **Stop** | L'utilisateur peut arrêter une action approuvée/en cours → statut `stopped` |
| **Retry** | Une action rejetée ou échouée peut être remise en attente (`retry` → `pending_approval`) |

---

## 4. Récapitulatif du Flux en Une Phrase

> **User** discute avec l'**Agent IA** → l'agent crée une **action en attente** dans la DB → **User** l'approuve → l'**Extension Chrome** la récupère, l'exécute sur **LinkedIn** → le résultat revient à l'**API** qui **crée le prospect** → le **Pipeline CRM** l'affiche après son prochain rafraîchissement.
