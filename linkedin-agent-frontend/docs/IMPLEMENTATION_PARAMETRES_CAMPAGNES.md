# Implémentation des Paramètres de Campagnes

## Vue d'ensemble

Cette implémentation ajoute le support complet des paramètres de campagnes pour que les campagnes réagissent automatiquement selon leurs caractéristiques configurées.

## Fonctionnalités Implémentées

### 1. Relances Automatiques (Follow-ups)

**Paramètre:** `follow_up_days` (défaut: 3 jours)

**Fonctionnement:**
- Lorsqu'une campagne est activée, le système vérifie automatiquement les prospects qui n'ont pas répondu après le nombre de jours configuré
- Les relances sont planifiées automatiquement dans la table `scheduled_followups`
- Les relances sont exécutées automatiquement via le cron job

**API Endpoints:**
- `POST /api/campaigns/[id]/check-followups` - Vérifie et planifie les relances pour une campagne
- `POST /api/followups/execute` - Exécute les relances planifiées

**Logique:**
1. Détecte les prospects avec statut 'messaged' ou 'replied' qui n'ont pas répondu après X jours
2. Vérifie qu'aucune relance n'est déjà planifiée pour ce prospect
3. Respecte la limite journalière de la campagne
4. Planifie la relance pour le lendemain à 10h
5. Met à jour le statut du prospect à 'followup_scheduled'

### 2. Limite Journalière par Campagne

**Paramètre:** `daily_limit` (défaut: 20)

**Fonctionnement:**
- Chaque campagne a sa propre limite journalière d'actions
- Le système vérifie le nombre d'actions exécutées aujourd'hui pour chaque campagne
- Si la limite est atteinte, l'exécution est bloquée avec un message d'erreur 429

**Implémentation:**
- Vérification dans `/api/campaigns/[id]/execute` avant de créer une nouvelle action
- Compte les actions 'completed' exécutées aujourd'hui pour la campagne spécifique
- Bloque l'exécution si `today_count >= daily_limit`

### 3. Mise à Jour Automatique du Pipeline

**Fonctionnement:**
- Le pipeline des prospects est mis à jour automatiquement selon les actions LinkedIn
- Les statuts évoluent: connected → messaged → replied → clicked_link → converted
- Les prospects sans réponse après 14 jours sont marqués comme 'lost'

**API Endpoint:**
- `POST /api/prospects/update-pipeline` - Met à jour le pipeline des prospects

**Règles de mise à jour:**
- `connected` → `messaged` quand un message est envoyé
- `messaged`/`followup_sent` → `replied` quand une réponse est reçue
- `messaged`/`replied`/`followup_sent` → `clicked_link` quand un lien est cliqué
- `clicked_link`/`replied` → `converted` quand une conversion est détectée
- `messaged`/`followup_sent` → `lost` après 14 jours sans réponse

### 4. Cron Job Automatisé

**Script:** `scripts/cron-job.ts`

**Fonctionnement:**
- Exécute automatiquement les tâches périodiques
- Doit être configuré pour s'exécuter toutes les heures (ou selon les besoins)

**Tâches exécutées:**
1. `executeFollowups()` - Exécute les relances planifiées pour aujourd'hui
2. `checkCampaignFollowups()` - Vérifie toutes les campagnes actives et planifie les relances
3. `updateProspectPipeline()` - Met à jour le pipeline des prospects

**Configuration:**
```bash
# Exécution manuelle
npm run ts-node scripts/cron-job.ts

# Configuration cron (Linux/Mac)
0 * * * * cd /path/to/project && npm run ts-node scripts/cron-job.ts
```

## Intégration dans le Composant Campaigns

**Modification dans `components/Campaigns.tsx`:**

```typescript
const toggleStatus = async (id: number) => {
  // ...
  if (newStatus === "active") {
    await executeCampaign(id);
    // Vérifier et planifier les relances automatiques
    try {
      await fetch(`/api/campaigns/${id}/check-followups`, { method: 'POST' });
    } catch (error) {
      console.error('Error checking follow-ups:', error);
    }
  }
};
```

Lorsqu'une campagne est activée:
1. L'exécution de la campagne est lancée
2. Les relances automatiques sont vérifiées et planifiées
3. Le système respecte les paramètres `follow_up_days` et `daily_limit`

## Base de Données

### Table `scheduled_followups`

```sql
CREATE TABLE scheduled_followups (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER REFERENCES prospects(id),
  campaign_id INTEGER REFERENCES campaigns(id),
  message_text TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'executed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Statuts des Prospects

- `identified` - Prospect identifié
- `visited` - Profil visité
- `connected` - Connection acceptée
- `messaged` - Premier message envoyé
- `followup_scheduled` - Relance planifiée
- `followup_sent` - Relance envoyée
- `replied` - Prospect a répondu
- `clicked_link` - Prospect a cliqué sur un lien
- `converted` - Prospect converti
- `lost` - Prospect non intéressé (après 14 jours sans réponse)

## Utilisation

### Activer une campagne avec relances automatiques

1. Créer une campagne avec les paramètres:
   - `follow_up_days: 3` (ou autre valeur)
   - `daily_limit: 20` (ou autre valeur)
   - `template_followup: "Template de relance..."`

2. Activer la campagne
   - Les relances seront automatiquement planifiées
   - La limite journalière sera respectée

3. Le cron job s'exécute périodiquement:
   - Exécute les relances planifiées
   - Vérifie les nouvelles relances à planifier
   - Met à jour le pipeline des prospects

### Surveillance

- Vérifier les logs du cron job pour voir l'activité
- Consulter la table `scheduled_followups` pour voir les relances planifiées
- Surveiller les limites journalières dans le dashboard

## Limitations et Améliorations Futures

**Actuel:**
- Les relances sont planifiées pour 10h le lendemain
- Un seul template de relance par campagne
- Pas de relances multiples (J+3, J+7, J+14)

**Améliorations possibles:**
- Système de relances multiples avec templates différents
- Horaires configurables pour les relances
- A/B testing des templates de relance
- Notifications lors de l'exécution des relances
- Dashboard de surveillance des relances

## Dépannage

**Problème: Les relances ne sont pas exécutées**

Solutions:
1. Vérifier que le cron job est configuré et s'exécute
2. Vérifier que la campagne est active
3. Vérifier que `follow_up_days` est configuré
4. Vérifier les logs du cron job

**Problème: La limite journalière est atteinte trop vite**

Solutions:
1. Augmenter `daily_limit` dans les paramètres de la campagne
2. Vérifier que les actions sont bien comptées comme 'completed'
3. Vérifier que `executed_at` est bien défini

**Problème: Les prospects ne changent pas de statut**

Solutions:
1. Exécuter manuellement `/api/prospects/update-pipeline`
2. Vérifier que les actions LinkedIn sont bien marquées comme 'completed'
3. Vérifier les logs pour les erreurs SQL
