# Implémentation du Choix de Type de Campagne au Début

## Vue d'ensemble

Cette implémentation permet à l'utilisateur de choisir le type de campagne dès le début du processus de création, offrant trois options:
- **Messages**: Envoi de messages directs
- **Connexions**: Envoi de demandes de connexion seulement
- **Connexions + Messages**: Envoi de connexions puis messages automatiques après acceptation

## Fonctionnement

### 1. Étape 0 - Choix du Type

Lorsque l'utilisateur clique sur "Nouveau", une nouvelle étape initiale (step 0) s'affiche avec trois options:

```
┌─────────────────────────────────────┐
│  Type de campagne                    │
│  Choisissez comment contacter...    │
│                                     │
│  [📧 Messages]                      │
│  Envoyer des messages directs       │
│                                     │
│  [👥 Connexions]                    │
│  Envoyer des demandes de connexion │
│                                     │
│  [📤 Connexions + Messages]         │
│  Connexions puis messages après...  │
└─────────────────────────────────────┘
```

### 2. Logique d'Affichage Conditionnelle

**Si type = "Connexions"**:
- L'étape "Template" est masquée dans le stepper
- L'étape 3 (Template) n'est pas affichée
- Le formulaire passe directement de l'étape 2 (Ciblage) à l'étape 4 (Paramètres)
- Nombre total d'étapes: 4 (Type → Général → Ciblage → Paramètres)

**Si type = "Messages" ou "Connexions + Messages"**:
- L'étape "Template" est affichée normalement
- Toutes les étapes sont visibles
- Nombre total d'étapes: 5 (Type → Général → Ciblage → Template → Paramètres)

### 3. Flux de Création

#### Messages Seulement
```
Étape 0 (Type) → Étape 1 (Général) → Étape 2 (Ciblage) → Étape 3 (Template) → Étape 4 (Paramètres) → Création
```

#### Connexions Seulement
```
Étape 0 (Type) → Étape 1 (Général) → Étape 2 (Ciblage) → Étape 4 (Paramètres) → Création
```
*(L'étape 3 Template est sautée)*

#### Connexions + Messages
```
Étape 0 (Type) → Étape 1 (Général) → Étape 2 (Ciblage) → Étape 3 (Template) → Étape 4 (Paramètres) → Création
```

### 4. Comportement Backend

#### Type "messages"
- Action créée: `search_and_message`
- Recherche + envoi de messages immédiat
- Template utilisé pour les messages

#### Type "connections_only"
- Action créée: `search_and_connection`
- Recherche + envoi de connexions seulement
- Pas de template (section masquée dans l'interface)

#### Type "messages_and_connections"
- Action initiale: `search_and_connection`
- Recherche + envoi de connexions d'abord
- Template stocké mais pas utilisé immédiatement
- Après acceptation des connexions: messages envoyés automatiquement
- Les messages utilisent le template_type et objective pour le contexte

### 5. Instructions pour l'Agent

Le fichier `lib/agent-config.ts` contient maintenant un WORKFLOW F spécifique pour le type "messages_and_connections":

```
WORKFLOW F — "Créer une campagne Connexions + Messages":
1. Appeler create_campaign avec campaign_type='messages_and_connections' + template_invitation
2. Appeler EXECUTE_CAMPAIGN(campaign_id) → action 'search_and_connection' en pending_approval
3. Informer l'utilisateur:
   - Que la campagne enverra D'ABORD les connexions
   - Que les messages seront envoyés AUTOMATIQUEMENT après acceptation
   - Qu'une action est EN ATTENTE D'APPROBATION
4. À l'approbation: campagne activée + recherche + envoi des connexions
5. Après acceptation: le système envoie automatiquement les messages selon template + objective
```

## Modifications du Code

### 1. Interface (components/Campaigns.tsx)

**État initial changé**:
```typescript
const [currentStep, setCurrentStep] = useState(0); // était 1
```

**Stepper modifié**:
```typescript
[
  { step: 0, label: "Type" },
  { step: 1, label: "Général" },
  { step: 2, label: "Ciblage" },
  { step: 3, label: "Template" },
  { step: 4, label: "Paramètres" },
].filter(s => form.campaignType !== 'connections_only' || s.step !== 3)
```

**Nouvelle étape 0 ajoutée**:
- Cartes pour choisir entre Messages, Connexions, Connexions+Messages
- Icônes et descriptions pour chaque option

**Navigation modifiée**:
```typescript
const nextStep = () => {
  const maxStep = form.campaignType === 'connections_only' ? 3 : 4;
  if (currentStep < maxStep) setCurrentStep(currentStep + 1);
};
const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };
```

**Section "Type de campagne" supprimée de l'étape 1**:
- Déplacée à l'étape 0
- Étape 1 ne contient plus que: Nom, Description, Objectif

### 2. Backend (app/api/campaigns/[id]/execute/route.ts)

**Logique de type d'action étendue**:
```typescript
let actionType: string;
if (campaignType === 'connections_only') {
  actionType = 'search_and_connection';
} else if (campaignType === 'messages_and_connections') {
  actionType = 'search_and_connection'; // D'abord envoyer les connexions
} else {
  actionType = 'search_and_message';
}
```

**Template de message étendu**:
```typescript
if (campaignType === 'messages' || campaignType === 'messages_and_connections') {
  messageTemplate = campaign.template_invitation;
  // ...
}
```

### 3. Agent (lib/agent-config.ts)

**Nouveau WORKFLOW F ajouté**:
- Instructions spécifiques pour campaign_type='messages_and_connections'
- Explication du flux en deux temps (connexions puis messages)

## Avantages

1. **Clarté**: L'utilisateur choisit immédiatement le type de campagne
2. **Flexibilité**: Trois options pour différents scénarios de prospection
3. **Efficacité**: Pas de template inutile pour les campagnes de connexions seulement
4. **Automatisation**: Type "Connexions + Messages" automatise le suivi après acceptation
5. **Contexte**: L'agent génère des messages adaptés selon le type et l'objectif

## Utilisation

1. Cliquer sur "Nouveau"
2. Choisir le type de campagne (Messages, Connexions, ou Connexions + Messages)
3. Remplir les informations générales
4. Définir le ciblage
5. (Si Messages ou Connexions+Messages) Choisir le template
6. Configurer les paramètres avancés
7. Créer la campagne

## Tests

Pour tester l'implémentation:

1. Créer une campagne de type "Connexions" → vérifier que l'étape Template est masquée
2. Créer une campagne de type "Messages" → vérifier que toutes les étapes sont affichées
3. Créer une campagne de type "Connexions + Messages" → vérifier que toutes les étapes sont affichées
4. Activer une campagne "Connexions + Messages" → vérifier que les connexions sont envoyées d'abord
5. Vérifier que les messages sont envoyés après acceptation des connexions
