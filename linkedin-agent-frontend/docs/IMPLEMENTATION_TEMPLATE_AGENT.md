# Implémentation de la Génération de Messages par l'Agent selon Template et Objectif

## Vue d'ensemble

Cette implémentation permet à l'agent de générer automatiquement des messages personnalisés en fonction du template sélectionné et de l'objectif de la campagne. L'agent comprend le contexte du template et l'objectif, et adapte le message en conséquence.

## Fonctionnement

### 1. Sélection du Template dans l'Interface

L'utilisateur sélectionne un template lors de la création de campagne:

- Premier contact
- Message de suivi
- Partage de lien
- Relance finale
- Invitation événement
- Démonstration

Ce template est stocké dans `campaign.template` en base de données.

### 1.5. Sélection de l'Objectif dans l'Interface

L'utilisateur sélectionne également un objectif lors de la création de campagne:

- Générer des leads - Qualification
- Démos produit - Présentations
- Étendre le réseau - Connexions
- Croissance - Acquisition

Cet objectif est stocké dans `campaign.objective` en base de données.

### 2. Payload avec template_type et objective

L'API `/api/campaigns/[id]/execute` inclut maintenant `template_type` et `objective` dans le payload envoyé à l'agent:

```typescript
{
  message_template: messageTemplate,
  campaign_type: campaignType,
  campaign_id: id,
  campaign_name: campaign.name,
  target_role: campaign.target_role,
  industry: campaign.industry,
  location: campaign.location,
  company_size: campaign.company_size,
  daily_limit: dailyLimit,
  follow_up_days: campaign.follow_up_days || 3,
  template_type: campaign.template || 'Premier contact',
  objective: campaign.objective || 'Générer des leads',
}
```

### 3. Instructions pour l'Agent

Le fichier `lib/agent-config.ts` contient maintenant des instructions détaillées pour chaque type de template:

```typescript
⚠️ IMPORTANT — GÉNÉRATION DE MESSAGES SELON TEMPLATE_TYPE:
Quand tu exécutes une campagne avec template_type dans le payload, tu dois générer le message selon le contexte du template:

TEMPLATE_TYPES ET CONTEXXES:
- "Premier contact": Message d'introduction, bref et professionnel, max 300 caractères. Objectif: établir un premier contact et susciter l'intérêt.
- "Message de suivi": Message après connexion acceptée, plus personnel, mentionne la connexion récente. Objectif: transformer la connexion en conversation.
- "Partage de lien": Partage d'un contenu pertinent (article, blog post, ressource) avant de vendre. Objectif: apporter de la valeur et positionner comme expert.
- "Relance finale": Dernier message avant arrêt du suivi, ton plus direct. Objectif: "take it or leave it" pour clore la relation.
- "Invitation événement": Invitation à un événement (webinar, conférence, meetup). Objectif: engager de manière informelle et créer opportunité de discussion.
- "Démonstration": Proposition d'une démo produit pour montrer la valeur. Objectif: accélérer le processus de vente.

RÈGLES DE GÉNÉRATION:
1. TOUJOURS adapter le message au template_type fourni dans le payload
2. Si template_type n'est pas fourni ou inconnu, utiliser "Premier contact" par défaut
3. Utiliser les variables {name}, {role}, {company} pour personnaliser
4. Respecter le ton et l'objectif spécifique à chaque template_type
5. Structurer avec retours à la ligne: "Bonjour {name},\n\n[corps]\n\n[formule]"

⚠️ IMPORTANT — ADAPTATION SELON OBJECTIF:
Quand tu exécutes une campagne avec objective dans le payload, tu dois adapter ton approche et ton message selon l'objectif:

OBJECTIFS ET STRATÉGIES:
- "Générer des leads": Focus sur la qualification. Messages orientés vers l'échange d'informations, compréhension des besoins, établissement de relation. Ton: consultatif, questionnant. Call-to-action: échange rapide, appel pour en savoir plus.
- "Démos produit": Focus sur la présentation/démonstration. Messages orientés vers proposition de démo, showcase de la solution. Ton: confiant, orienté produit. Call-to-action: réserver une démo, voir comment ça marche.
- "Étendre le réseau": Focus sur les connexions. Messages plus légers, orientés vers établissement de relation professionnelle. Ton: amical, networking. Call-to-action: accepter la connexion, échanger sur le secteur.
- "Croissance": Focus sur l'acquisition. Messages plus orientés vente directe, proposition de valeur claire. Ton: commercial, persuasif. Call-to-action: discuter d'opportunité, partenariat.

RÈGLES D'ADAPTATION:
1. TOUJOURS adapter le message et le ton à l'objective fourni dans le payload
2. Si objective n'est pas fourni ou inconnu, utiliser "Générer des leads" par défaut
3. Combiner template_type ET objective pour un message optimal
4. Le call-to-action doit correspondre à l'objectif (ex: "démo" pour Démos produit, "échange" pour Générer des leads)
5. Adapter la longueur du message selon l'objectif (plus court pour Étendre le réseau, plus détaillé pour Démos produit)
```

### 4. Utilisation par l'Agent

L'agent (via `lib/agent.ts`) lit ces instructions dans `SYSTEM_PROMPTS.prospecting` et les applique automatiquement quand il voit `template_type` et `objective` dans le payload d'une action de campagne.

## Exemples de Messages Générés selon Template et Objectif

### Template: Premier contact + Objectif: Générer des leads

```
Bonjour {name},

J'ai remarqué votre parcours chez {company} et votre expertise en tant que {role}. J'aimerais comprendre vos défis actuels.

Avez-vous 5 minutes pour un échange rapide ?

À bientôt !
```

### Template: Premier contact + Objectif: Démos produit

```
Bonjour {name},

Je travaille sur une solution qui aide les {role} chez {company} à optimiser leurs processus.

Je vous propose une démo de 15 min pour voir comment ça marche. Ça vous intéresse ?

Cordialement
```

### Template: Premier contact + Objectif: Étendre le réseau

```
Bonjour {name},

Votre profil m'intéresse. J'aimerais élargir mon réseau avec des professionnels comme vous dans le secteur.

Accepteriez-vous ma connexion ?

Bien à vous
```

### Template: Premier contact + Objectif: Croissance

```
Bonjour {name},

Notre solution a aidé plusieurs {role} chez {company} à augmenter leur ROI de 30%.

Discutons d'une opportunité de partenariat ?

Cordialement
```

### Template: Message de suivi + Objectif: Générer des leads

```
Bonjour {name},

Merci d'avoir accepté ma connexion ! J'aimerais en savoir plus sur vos projets actuels chez {company}.

Quels sont vos défis principaux ?

Cordialement
```

### Template: Message de suivi + Objectif: Démos produit

```
Bonjour {name},

Merci pour la connexion ! Je vous propose de découvrir notre solution en action.

Quand seriez-vous disponible pour une démo personnalisée ?

À très bientôt
```

### Template: Invitation événement + Objectif: Générer des leads

```
Bonjour {name},

Nous organisons un webinar exclusif sur les défis des {role}. Ce serait un plaisir de vous y voir !

Lien: [lien]

J'aimerais avoir votre retour après l'événement.

Bien à vous
```

### Template: Invitation événement + Objectif: Démos produit

```
Bonjour {name},

Webinar exclusif: Découvrez notre solution en live !

Date: [date]
Lien: [lien]

On vous fera une démo complète pendant le webinar.

À très bientôt
```

## Avantages de la Combinaison Template + Objectif

1. **Messages ultra-personnalisés**: Le ton, le contenu et le call-to-action sont adaptés à l'objectif
2. **Contexte double**: L'agent comprend à la fois le type de message ET le but de la campagne
3. **Conversion optimisée**: Call-to-action aligné avec l'objectif (démo, échange, connexion, partenariat)
4. **Flexibilité**: Combinaison infinie de templates et objectifs pour des campagnes ciblées
5. **Cohérence**: Messages cohérents avec la stratégie commerciale

## Fichiers Modifiés

1. `app/api/campaigns/[id]/execute/route.ts` - Ajout de `template_type` et `objective` dans le payload
2. `lib/agent-config.ts` - Ajout des instructions de génération selon template_type et objective
3. `components/Campaigns.tsx` - Interface de sélection des templates et objectifs (déjà existante)

## Utilisation

1. Créer une nouvelle campagne
2. Sélectionner un template (ex: "Invitation événement")
3. Sélectionner un objectif (ex: "Démos produit")
4. Remplir les autres paramètres
5. Activer la campagne
6. L'agent génère automatiquement un message adapté au contexte "Invitation événement" + "Démos produit"

## Tests

Pour tester l'implémentation:

1. Créer une campagne avec différentes combinaisons template + objectif
2. Activer chaque campagne
3. Vérifier que les messages générés correspondent au contexte du template ET de l'objectif
4. Vérifier que les call-to-action correspondent à l'objectif (démo, échange, connexion, partenariat)
5. Vérifier que les variables {name}, {role}, {company} sont bien remplacées
