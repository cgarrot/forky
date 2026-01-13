# NonLinear - Guide Fonctionnel

Guide complet du fonctionnement de l'application NonLinear, une interface node-based pour l'exploration non-linéaire d'idées avec des LLM.

---

## 📋 Table des Matières

1. [Concept et Vision](#concept-et-vision)
2. [Architecture Fonctionnelle](#architecture-fonctionnelle)
3. [Modèle de Données](#modèle-de-données)
4. [Fonctionnalités Clés](#fonctionnalités-clés)
5. [Flux Utilisateur](#flux-utilisateur)
6. [Algorithmes de Graphe](#algorithmes-de-graphe)
7. [Gestion d'État](#gestion-détat)
8. [Intégration LLM](#intégration-llm)
9. [Expérience Utilisateur](#expérience-utilisateur)
10. [Cas d'Usage](#cas-dusage)

---

## Concept et Vision

### Le Problème Résolu

Les chats LLM traditionnels sont **linéaires** : une timeline unique de messages. C'est parfait pour des questions simples, mais limitatif pour :

- **Explorer plusieurs hypothèses** en parallèle
- **Modifier une décision** sans perdre tout le contexte
- **Comparer des alternatives** efficacement
- **Visualiser la structure** des pensées

### La Solution NonLinear

NonLinear transforme les conversations en un **graphe de pensées** où chaque idée est un nœud connecté. L'utilisateur peut :

1. **Brancher** - Créer plusieurs explorations parallèles depuis le même point
2. **Éditer rétroactivement** - Modifier un nœud parent et voir l'impact sur tous ses descendants
3. **Fusionner** - Combiner plusieurs branches en une synthèse
4. **Explorer** - Naviguer sur un canvas infini plutôt que dans un chat qui défile

### Métaphores de Conception

- **Canvas infini** : Comme un tableau blanc virtuel pour organiser ses pensées
- **Graphe orienté** : Structure mathématique représentant les dépendances entre idées
- **Arborescence dynamique** : Pousser des branches et les fusionner comme des idées naturelles

---

## Architecture Fonctionnelle

### Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────┐
│                    Interface Utilisateur                      │
│  ┌──────────────┐          ┌──────────────┐              │
│  │   Canvas     │◄─────────►│   Sidebar    │              │
│  │  (ReactFlow) │          │  (Projet)    │              │
│  └──────┬───────┘          └──────┬───────┘              │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌──────────────────────────────────────────┐              │
│  │      Gestion d'État (Zustand)           │              │
│  │  - Noeuds, Arêtes, Sélection            │              │
│  │  - Settings, Quick Actions               │              │
│  └──────┬───────────────────────────────────┘              │
│         │                                             │
│         ▼                                             │
│  ┌──────────────────────────────────────────┐              │
│  │         Logique Métier                   │              │
│  │  - Algorithmes de Graphe                │              │
│  │  - Cascade Updates                      │              │
│  │  - Construction du Contexte              │              │
│  └──────┬───────────────────────────────────┘              │
│         │                                             │
│         ▼                                             │
│  ┌──────────────────────────────────────────┐              │
│  │        Couche API                        │              │
│  │  - Generate (Streaming)                 │              │
│  │  - Summarize (Auto-génération)         │              │
│  │  - Generate Title                       │              │
│  └──────┬───────────────────────────────────┘              │
│         │                                             │
│         ▼                                             │
│  ┌──────────────────────────────────────────┐              │
│  │    Fournisseurs LLM                     │              │
│  │  - Zhipu AI (GLM-4.7)                  │              │
│  │  - OpenAI (GPT-4o)                      │              │
│  │  - Anthropic (Claude)                   │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Principes Architecturaux

#### 1. Séparation des Responsabilités

- **UI Components** : Pure présentation, aucune logique métier
- **Custom Hooks** : Logique réutilisable et effets de bord
- **Store (Zustand)** : Gestion d'état centralisée
- **Lib/Graph** : Algorithmes purs, testables indépendamment
- **API Routes** : Couche d'abstraction pour les LLM

#### 2. Flux de Données Unidirectionnel

```
User Action → Component → Hook → Store → Algorithmes → API
                                                        ↓
                                                   LLM Response
                                                        ↓
Store Update → Component Re-render → UI Update
```

#### 3. Optimisation des Performances

- **Map au lieu de Array** pour les nœuds (O(1) vs O(n) pour les recherches)
- **Sélecteurs granulaires** dans Zustand pour minimiser les re-renders
- **Memoization** avec useMemo et useCallback
- **Streaming** pour éviter le blocage UI pendant la génération
- **Debouncing** pour la sauvegarde automatique

---

## Modèle de Données

### Nœud (Node)

Un nœud représente une interaction LLM : un prompt utilisateur et sa réponse.

**Propriétés :**
- `id` : Identifiant unique (nanoid)
- `prompt` : Question/instruction de l'utilisateur
- `response` : Réponse générée par le LLM
- `status` : État actuel (`idle`, `loading`, `error`, `stale`)
- `position` : Position sur le canvas `{x, y}`
- `parentIds` : Liste des identifiants des nœuds parents
- `childrenIds` : Liste des identifiants des nœuds enfants
- `createdAt` / `updatedAt` : Timestamps pour le tri
- `summary` : Résumé court généré automatiquement (affiché sur le nœud)
- `metadata` : Informations additionnelles (modèle utilisé, tokens, erreurs)

**Cycle de Vie d'un Nœud :**

```
1. Création (idle)
   ↓
2. Saisie du prompt (idle)
   ↓
3. Génération en cours (loading)
   ↓
4a. Succès (idle)
   ↓
   Auto-génération du résumé
   ↓
   Marquage des descendants comme "stale"

4b. Erreur (error)
   ↓
   L'utilisateur peut régénérer

5. Modification d'un parent (stale)
   ↓
   L'utilisateur peut régénérer
```

### Arête (Edge)

Connexion orientée entre deux nœuds représentant une dépendance de contexte.

- `id` : Identifiant unique
- `source` : ID du nœud parent (la source du contexte)
- `target` : ID du nœud enfant (le receveur du contexte)

**Règles :**
- Les arêtes sont toujours orientées parent → enfant
- Un nœud peut avoir plusieurs parents (fusion)
- Les cycles sont interdits (détection automatique)
- Les arêtes sont dérivées des relations parentIds/childrenIds des nœuds

### Projet (Project)

Un projet contient un graphe complet de nœuds et leurs métadonnées.

**Propriétés :**
- `id`, `name` : Identifiant et nom du projet
- `nodes` / `edges` : Le graphe de conversation
- `systemPrompt` : Prompt système global pour tous les nœuds
- `quickActions` : Macros de transformation réutilisables
- `viewport` : État de zoom et pan du canvas
- `createdAt` / `updatedAt` : Timestamps

### Quick Action (Macro de Prompt)

Transformation réutilisable applicable à n'importe quel nœud.

**Exemples :**
- "Concis" : Reformule de manière plus concise
- "Détails" : Développe avec plus d'exemples
- "ELI5" : Explique comme à un enfant de 5 ans
- "Code" : Extrais et formate le code

**Propriétés :**
- `id`, `label`, `instruction`, `order`

---

## Fonctionnalités Clés

### 1. Branching (Création de Branches)

**Objectif :** Explorer plusieurs hypothèses à partir du même point de départ.

**Mécanisme :**
1. L'utilisateur clique sur le handle de connexion d'un nœud (point bleu)
2. Il拖拽 vers une zone vide du canvas
3. Un nouveau nœud enfant est créé
4. Le nœud enfant hérite automatiquement de tout le contexte du parent

**Utilisation :**
- Explorer différentes approches pour résoudre un problème
- Tester plusieurs idées sans perdre la première
- Créer des variantes d'une solution

**Exemple :**
```
Nœud A : "Comment optimiser cette fonction?"
  │
  ├─> Nœud B1 : "Approche récursive..."
  │
  └─> Nœud B2 : "Approche itérative..."
  │
  └─> Nœud B3 : "Approche avec memoization..."
```

### 2. Édition Rétroactive (Cascade Updates)

**Objectif :** Modifier une décision ancienne sans perdre tout le travail effectué ensuite.

**Mécanisme :**
1. L'utilisateur modifie le prompt d'un nœud parent
2. Il clique "Régénérer" sur ce nœud
3. La nouvelle réponse est générée
4. **Tous les descendants** sont automatiquement marqués comme "obsolète" (stale)
5. L'utilisateur peut choisir de régénérer sélectivement ou en cascade

**Algorithme de Marquage Stale :**
```
markDescendantsStale(nodeId):
  Pour chaque descendant direct et indirect:
    Marquer le statut comme "stale"
```

**Utilisation :**
- Corriger une erreur de prompt sans tout refaire
- Affiner une question pour de meilleurs résultats
- Ajuster un contexte pour des réponses plus pertinentes

**Exemple :**
```
Nœud A : "Explique React" → Régénéré → "Explique React en détail"
  │ (stale)                         (stale)
  ├─> Nœud B1 : "React vs Vue"     → À régénérer
  │
  └─> Nœud B2 : "Hooks concept"    → À régénérer
```

### 3. Fusion (Multi-Parent Nodes)

**Objectif :** Combiner plusieurs branches pour créer une synthèse.

**Mécanisme :**
1. L'utilisateur connecte plusieurs nœuds parents vers un seul nœud enfant
2. Le nœud enfant hérite du contexte de **tous** ses parents
3. Les contextes sont étiquetés séparément (ex: "Contexte Branche 1", "Contexte Branche 2")
4. Le LLM peut alors comparer et synthétiser

**Construction du Contexte de Fusion :**
```
Nœud Enfant avec 2 parents:

--- Contexte [Parent 1: Optimisation récursive] ---
User: Comment optimiser récursivement?
Assistant: Voici l'approche récursive...

--- Contexte [Parent 2: Optimisation itérative] ---
User: Comment optimiser itérativement?
Assistant: Voici l'approche itérative...

User: Compare ces approches et recommande la meilleure.
```

**Utilisation :**
- Comparer plusieurs solutions
- Synthétiser des recherches différentes
- Faire converger des explorations divergentes

### 4. Contexte Hérité (Context Inheritance)

**Objectif :** Maintenir la cohérence contextuelle dans tout le graphe.

**Mécanisme :**
- Chaque nœud hérite de tout l'historique de ses ancêtres
- Le contexte est construit récursivement en remontant les parents
- Pour les nœuds racines (sans parents), seul le prompt actuel est envoyé

**Algorithme de Construction du Contexte :**
```
buildContext(nodeId):
  messages = []
  
  # Ajouter le prompt système global
  if systemPrompt:
    messages.append({role: "system", content: systemPrompt})
  
  # Récupérer le contexte des parents
  for parent in getAncestors(nodeId):
    messages.append({role: "user", content: parent.prompt})
    messages.append({role: "assistant", content: parent.response})
  
  # Ajouter le prompt actuel
  messages.append({role: "user", content: currentNode.prompt})
  
  return messages
```

**Exemple de Flux Contextuel :**

```
Nœud 1 (Racine): "Qu'est-ce que React?"
  ↓
Nœud 2 (Enfant): "Explique les Hooks"
  ↓
Nœud 3 (Enfant): "useState en détail"

Contexte envoyé au Nœud 3:
- System: [Prompt système global]
- User: "Qu'est-ce que React?"
- Assistant: "React est une bibliothèque JavaScript..."
- User: "Explique les Hooks"
- Assistant: "Les Hooks permettent d'ajouter..."
- User: "useState en détail" ← Le prompt actuel
```

### 5. Quick Actions

**Objectif :** Automatiser les transformations courantes.

**Mécanisme :**
1. L'utilisateur crée des quick actions dans la sidebar
2. Chaque action a un label et une instruction
3. Un clic sur une action dans un nœud crée un nœud enfant
4. L'instruction de l'action est appliquée automatiquement au prompt

**Exemples d'Utilisation :**
- Transformer une réponse trop longue → Quick action "Concis"
- Simplifier une réponse technique → Quick action "ELI5"
- Extraire du code → Quick action "Extraire le code"

**Exemple :**
```
Quick Action: "Concis"
Instruction: "Reformule la réponse précédente de manière plus concise en gardant l'essentiel."

Nœud parent: "Explication très détaillée de 2000 mots..."
  ↓ (Application quick action)
Nœud enfant: "En résumé, cela consiste en..."
```

### 6. Gestion de Projet

**Objectif :** Organiser et sauvegarder plusieurs conversations.

**Fonctionnalités :**

**Sauvegarde Automatique :**
- Chaque modification est sauvegardée dans localStorage
- Indicateur visuel "Sauvegardé" / "Sauvegarde en cours..."
- Debouncing pour éviter les écritures excessives

**Export/Import :**
- Export au format JSON (backup, partage)
- Import pour restaurer un projet
- Compatible avec localStorage

**Multiple Projets :**
- Liste de projets dans la sidebar
- Chaque projet indépendant (nœuds, settings, quick actions)
- Renommage, suppression des projets

**Génération Automatique du Titre :**
- Premier nœud sans titre → Auto-génération par le LLM
- Analyse du prompt et de la réponse
- Titre descriptif et concis

---

## Flux Utilisateur

### Scénario 1 : Création d'un Nouveau Projet

```
1. L'utilisateur ouvre l'application
   ↓
2. Vue par défaut : Canvas vide + Sidebar
   ↓
3. Clique sur "+ Nouvelle Instruction"
   ↓
4. Un nœud racine apparaît au centre du canvas
   ↓
5. Saisit son prompt dans le nœud
   ↓
6. Clique "Générer" ou presse Ctrl+Enter
   ↓
7. La réponse est générée avec streaming en temps réel
   ↓
8. Le titre du projet est auto-généré (si "Projet sans titre")
```

### Scénario 2 : Branching

```
1. L'utilisateur a un nœud avec une réponse
   ↓
2. Hover sur le handle de connexion (point bleu en bas)
   ↓
3. Clique et拖拽 vers une zone vide
   ↓
4. Relâche → Création d'un nouveau nœud enfant
   ↓
5. Le nouveau nœud est automatiquement connecté
   ↓
6. L'utilisateur saisit son prompt dans le nœud enfant
   ↓
7. Génère → Le contexte inclut tout l'historique du parent
```

### Scénario 3 : Édition Rétroactive

```
1. L'utilisateur veut modifier une question posée précédemment
   ↓
2. Édite le prompt du nœud parent
   ↓
3. Les descendants ne changent pas immédiatement
   ↓
4. Clique "Régénérer" sur le nœud parent
   ↓
5. Nouvelle réponse générée
   ↓
6. Les descendants sont marqués comme "obsolète" (stale)
   ↓
7. L'utilisateur peut régénérer sélectivement chaque descendant
   ↓
8. Option : Régénérer en cascade automatiquement
```

### Scénario 4 : Fusion de Branches

```
1. L'utilisateur a créé 2 branches d'exploration
   │
   ├─ Branche A : Approche récursive
   │
   └─ Branche B : Approche itérative
   ↓
2. Crée un nouveau nœud
   ↓
3. Connecte le nouveau nœud aux deux parents
   ↓
4. Saisit un prompt de comparaison : "Compare ces approches"
   ↓
5. Le LLM reçoit les deux contextes séparés
   ↓
6. Génère une comparaison et une recommandation
```

### Scénario 5 : Utilisation des Quick Actions

```
1. L'utilisateur a une réponse trop verbeuse
   ↓
2. Clique sur le bouton Quick Actions du nœud
   ↓
3. Sélectionne "Concis" dans la liste
   ↓
4. Un nouveau nœud enfant est créé
   ↓
5. Le prompt est automatiquement pré-rempli avec l'instruction
   ↓
6. La réponse est une version concise de la précédente
```

---

## Algorithmes de Graphe

### 1. Détection de Cycle

**Objectif :** Empêcher la création de boucles infinies dans le graphe.

**Problème :** Si A → B → C → A, on a une boucle infinie lors de la construction du contexte.

**Algorithme (DFS) :**

```
detectCycle(sourceId, targetId, nodes):
  visited = Set()
  stack = [targetId]  # Partir de la cible pour voir si on peut atteindre la source
  
  while stack not empty:
    current = stack.pop()
    
    if current == sourceId:
      return true  # Cycle détecté!
    
    if current in visited:
      continue
    
    visited.add(current)
    
    node = nodes.get(current)
    for childId in node.childrenIds:
      stack.push(childId)
  
  return false  # Pas de cycle
```

**Application :**
- Avant de créer une arête, on détecte si elle créerait un cycle
- Si cycle détecté → Bloquer la création et afficher un message à l'utilisateur
- Animation visuelle de refus (connection rouge)

### 2. Recherche de Descendants

**Objectif :** Trouver tous les nœuds qui dépendent d'un nœud donné.

**Utilisation :**
- Marquer les descendants comme "stale" lors d'une édition rétroactive
- Supprimer une branche complète
- Calculer les statistiques du sous-graphe

**Algorithme (BFS) :**

```
getDescendants(nodeId, nodes):
  descendants = []
  visited = Set()
  queue = [nodeId]
  
  while queue not empty:
    current = queue.shift()
    
    if current in visited:
      continue
    
    visited.add(current)
    node = nodes.get(current)
    
    for childId in node.childrenIds:
      descendants.append(childId)
      queue.push(childId)
  
  return descendants
```

**Complexité :** O(V + E) où V = nombre de nœuds, E = nombre d'arêtes

### 3. Recherche d'Ancêtres

**Objectif :** Trouver tous les nœuds qui sont des prédécesseurs d'un nœud.

**Utilisation :**
- Construire le contexte LLM (historique complet)
- Comprendre d'où vient une idée
- Tracer l'origine d'une réponse

**Algorithme (BFS) :**

```
getAncestors(nodeId, nodes):
  ancestors = []
  visited = Set()
  queue = [nodeId]
  
  while queue not empty:
    current = queue.shift()
    
    if current in visited:
      continue
    
    visited.add(current)
    node = nodes.get(current)
    
    for parentId in node.parentIds:
      ancestors.append(parentId)
      queue.push(parentId)
  
  return ancestors
```

### 4. Tri Topologique

**Objectif :** Ordonner les nœuds pour une régénération cascade correcte.

**Problème :** Si on régénère en cascade, il faut régénérer les parents avant les enfants.

**Utilisation :**
- Régénération automatique en cascade
- Export ordonné du graphe
- Calcul de la profondeur

**Algorithme :**

```
topologicalSort(nodeIds, nodes):
  result = []
  visited = Set()
  
  function visit(nodeId):
    if nodeId in visited:
      return
    
    visited.add(nodeId)
    node = nodes.get(nodeId)
    
    # Visiter les parents d'abord
    for parentId in node.parentIds:
      visit(parentId)
    
    result.append(nodeId)
  
  for nodeId in nodeIds:
    visit(nodeId)
  
  return result
```

**Exemple :**

```
Graphe original: D ← C ← A → B
Ordre topologique: A, C, D, B
(Régénérer A, puis C, puis D, puis B)
```

### 5. Construction du Contexte

**Objectif :** Construire l'historique de conversation complet pour un nœud.

**Cas 1 : Nœud sans parents (racine)**

```
Contexte = [
  System: [Prompt système global],
  User: [Prompt du nœud]
]
```

**Cas 2 : Nœud avec un parent**

```
buildContext(nodeId):
  context = []
  
  # Contexte récursif du parent
  parentContext = buildParentContext(node.parentIds[0])
  context.extend(parentContext)
  
  # Prompt actuel
  context.append({role: "user", content: node.prompt})
  
  return context
```

**Cas 3 : Nœud avec plusieurs parents (fusion)**

```
Contexte = [
  System: [Prompt système global],
  
  --- Contexte Branche 1: "Optimisation récursive" ---
  User: "Comment optimiser récursivement?"
  Assistant: "...",
  
  --- Contexte Branche 2: "Optimisation itérative" ---
  User: "Comment optimiser itérativement?"
  Assistant: "...",
  
  User: "Compare ces approches"
]
```

**Optimisation :**
- Mise en cache du contexte pour éviter les recalculs
- Invalidation du cache lors de modifications
- Limitation de la longueur du contexte (fenêtre glissante)

---

## Gestion d'État

### Architecture Zustand

**Pourquoi Zustand ?**
- Léger et performant
- Pas de Provider requis (contrairement à Redux)
- API simple et intuitive
- Supporte les middlewares (Immer, Persist)

### Structure du Store

```typescript
Store {
  // Données principales
  nodes: Map<id, Node>
  edges: Map<id, Edge>
  selectedNodeIds: Set<id>
  
  // Configuration
  settings: Settings
  quickActions: QuickAction[]
  
  // UI
  ui: {
    sidebarOpen: boolean
    activeModal: string | null
    focusModeNodeId: string | null
  }
  
  // Viewport
  viewport: {x, y, zoom}
  
  // Actions
  addNode(position): id
  updateNode(id, updates): void
  deleteNode(id): void
  addEdge(source, target): id | null
  // ... etc
}
```

### Utilisation de Maps vs Arrays

**Maps** pour les nœuds et arêtes :
- **Recherche O(1)** : `nodes.get(id)` vs `nodes.find(n => n.id === id)`
- **Suppression O(1)** : `nodes.delete(id)` vs `nodes.filter(...)`
- **Mise à jour O(1)** : `nodes.set(id, newNode)` vs reconstruction

**Arrays** pour React Flow (conversion à la volée) :
- React Flow attend des tableaux pour `useNodesState` / `useEdgesState`
- Conversion optimisée avec `useMemo`

### Middleware Immer

Immer permet des mises à jour immutables avec une syntaxe mutable :

```typescript
// Sans Immer (verbeux)
setState(prev => ({
  ...prev,
  nodes: new Map(prev.nodes).set(id, {
    ...prev.nodes.get(id),
    status: 'loading'
  })
}))

// Avec Immer (lisible)
setState(draft => {
  draft.nodes.get(id).status = 'loading'
})
```

### Middleware Persist

Persistance automatique dans localStorage :

```typescript
persist(
  createStore(...),
  {
    name: 'nonlinear-storage',
    partialize: (state) => ({
      // Seulement persister certaines parties
      nodes: mapToArray(state.nodes),
      edges: mapToArray(state.edges),
      settings: state.settings,
      // Ne pas persister selectedNodeIds, ui...
    }),
    merge: (persisted, current) => {
      // Logique de fusion lors du chargement
    }
  }
)
```

### Sélecteurs Optimisés

Pour éviter les re-renders inutiles :

```typescript
// ❌ Mauvais : Re-rendu à chaque changement du store
const store = useStore()

// ✅ Bon : Seulement re-rendu si nodes change
const nodes = useStore(state => state.nodes)

// ✅ Encore mieux : Seulement re-rendu si le nœud spécifique change
const node = useStore(state => state.nodes.get(nodeId))

// ✅ Sélecteurs composés
const isLoading = useStore(state => {
  const node = state.nodes.get(nodeId)
  return node?.status === 'loading'
})
```

### Actions du Store

**Actions Nœuds :**
- `addNode(position)` - Crée un nœud vide
- `addNodeWithPrompt(position, prompt)` - Crée un nœud avec un prompt
- `updateNode(id, updates)` - Met à jour un nœud
- `deleteNode(id)` - Supprime un nœud et ses connexions
- `setNodeStatus(id, status)` - Met à jour le statut
- `updateNodePrompt(id, prompt)` - Met à jour le prompt
- `updateNodeResponse(id, response)` - Met à jour la réponse (streaming)
- `updateNodeSummary(id, summary)` - Met à jour le résumé

**Actions Arêtes :**
- `addEdge(source, target)` - Crée une connexion
- `deleteEdge(id)` - Supprime une connexion

**Actions Sélection :**
- `selectNode(id)` - Sélectionne un nœud
- `deselectNode(id)` - Désélectionne un nœud
- `toggleNodeSelection(id)` - Bascule la sélection
- `clearSelection()` - Désélectionne tout

**Actions Settings :**
- `updateSettings(updates)` - Met à jour la configuration

**Actions Quick Actions :**
- `addQuickAction(label, instruction)` - Ajoute une macro
- `updateQuickAction(id, updates)` - Met à jour une macro
- `deleteQuickAction(id)` - Supprime une macro
- `reorderQuickActions(quickActions)` - Réordonne les macros

---

## Intégration LLM

### Fournisseurs Supportés

**Zhipu AI (Défaut) :**
- Modèles : GLM-4.7, GLM-4.6, GLM-4.5 Flash
- Avantages : Prix compétitif, bonne performance
- API : Compatible OpenAI
- Configuration : `https://api.z.ai/api/paas/v4`

**OpenAI :**
- Modèles : GPT-4o, GPT-4o-mini
- Avantages : Qualité excellente
- API : Native OpenAI

**Anthropic :**
- Modèles : Claude 3.5 Sonnet, Claude 3 Opus
- Avantages : Contexte très long, raisonnement fort
- API : Native Anthropic

### Configuration des Modèles

Chaque modèle a des caractéristiques spécifiques :

```typescript
ModelConfig {
  id: "glm-4.7"
  name: "GLM-4.7"
  provider: "zhipu"
  maxTokens: 128000      // Sortie max
  contextWindow: 200000   // Fenêtre de contexte
  temperature: 0.7        // Par défaut (0 = déterministe, 1 = créatif)
}
```

**Choix du modèle par défaut :**
- `glm-4.7` : Bon équilibre qualité/prix, support français
- Configurable dans les settings

### Streaming des Réponses

**Pourquoi le streaming ?**
- Feedback visuel immédiat
- Réduit le temps perçu d'attente
- Permet l'annulation (AbortController)
- Expérience utilisateur plus fluide

**Architecture du Streaming :**

```
Frontend → API Route → LLM Provider
              ↓
        SSE (Server-Sent Events)
              ↓
         StreamText (Vercel AI SDK)
              ↓
        decode() → chunks
              ↓
         append() → response
              ↓
         Component re-render
```

**Flux détaillé :**

1. L'utilisateur clique "Générer"
2. `POST /api/generate` avec les messages
3. API route appelle LLM avec `streamText()`
4. LLM renvoie un stream de tokens
5. Chaque token est décodé et ajouté à la réponse
6. Store est mis à jour en temps réel
7. React re-rendre le composant avec le texte partiel
8. Animation de streaming (curseur clignotant, etc.)

**Gestion des erreurs :**

```
Types d'erreurs :
- API key manquante → "Configurez votre clé API"
- 401 Unauthorized → "Vérifiez vos clés"
- 429 Rate limit → "Attendez et réessayez" (retry automatique après 3s)
- Timeout → "Erreur de connexion"
- Erreur générale → Message générique

Chaque erreur est stockée dans node.metadata.error
Le nœud affiche le statut "error" avec le message
```

### Auto-Génération de Résumés

**Objectif :** Générer automatiquement un résumé court pour l'affichage sur le nœud.

**Timing :**
- 2 secondes après la fin de la génération principale
- Évite le rate limiting (pause entre les appels)
- Si échec → Continue sans résumé (non bloquant)

**Prompt de résumé :**
```
"Résume la réponse en une phrase courte (max 30 mots).
Concis, informatif, sans détails superflus."
```

**Stockage :**
- `node.summary` - Résumé court
- Affiché sur le nœud à la place du prompt complet
- Clic sur le nœud → Affichage du prompt et de la réponse complète

### Auto-Génération du Titre de Projet

**Condition :**
- Seulement si le nom est "Projet sans titre"
- Basé sur le premier nœud généré

**Prompt de titre :**
```
"En fonction du prompt et de la réponse suivants,
génère un titre court et descriptif pour ce projet.
Max 10 mots, sans guillemets, en français."
```

**Résultat :**
- Titre mis à jour dans le store
- Sauvegardé avec le projet
- Visible dans la sidebar et l'onglet navigateur

---

## Expérience Utilisateur

### Design du Canvas

**Navigation :**
- **Pan** : Clic droit +拖拽 ou Barre d'espace +拖拽
- **Zoom** : Molette de souris ou boutons de contrôle
- **Mini-map** : Vue d'ensemble du graphe
- **Fit View** : Recentrer sur les nœuds

**Création de nœuds :**
- **Double-clic** sur canvas vide → Nouveau nœud racine
- **拖拽 depuis handle** → Nouveau nœud enfant
- **Bouton "+ Nouvelle Instruction"** → Nouveau nœud racine

**Gestion des nœuds :**
- **Clic** : Sélectionner un nœud
- **拖拽** : Déplacer un nœud
- **Double-clic** sur nœud → Mode focus
- **Delete/Backspace** : Supprimer nœud sélectionné

**Connexions :**
- **Handle bleu (bas)** : Point de sortie pour créer des enfants
- **拖拽 depuis handle** → Créer une connexion
- **Réflexion automatique** : Les connexions suivent le mouvement des nœuds
- **Anti-cycle** : Les cycles sont bloqués visuellement

### Interface des Nœuds

**Statuts visuels :**

```
┌─────────────────────┐
│ [Prompt]           │ ← Input modifiable
├─────────────────────┤
│ [Résumé]           │ ← Affiché sur le nœud (si généré)
└─────────────────────┘

Idle       : Bordure par défaut (gris)
Loading    : Bordure animée bleue (pulse)
Error      : Bordure rouge
Stale      : Bordure orange + badge "Obsolète"
Generating : Spinner + "Génération en cours..."
```

**Composants internes :**
- `NodePrompt` : Input pour le prompt (textarea auto-expand)
- `NodeResponse` : Affichage de la réponse avec markdown
- `QuickActionBar` : Boutons pour les quick actions
- `Handle` : Point de connexion (bleu, hover effect)

**Focus Mode :**
- Double-clic sur nœud → Overlay plein écran
- Affichage uniquement de ce nœud et de sa branche
- Clic sur fond ou Escape → Sortir du mode focus
- Utile pour se concentrer sur une partie du graphe

### Interface de la Sidebar

**Sections :**

1. **Liste de Projets**
   - Liste de tous les projets sauvegardés
   - Actions par projet : Charger, Exporter, Supprimer
   - Indicateur de projet actif

2. **Nouveau Projet**
   - Bouton pour créer un nouveau projet
   - Importer un projet depuis un fichier JSON

3. **Quick Actions**
   - Liste des macros disponibles
   - Drag & drop pour réordonner
   - Boutons : + (ajouter), ✏️ (éditer), 🗑️ (supprimer)

4. **System Prompt**
   - Prompt système global (appliqué à tous les nœuds)
   - Configuration du modèle par défaut
   - Sauvegarde automatique

5. **Contrôles**
   - Toggle sidebar (sur mobile)
   - Reset du canvas

### Indicateurs Visuels

**Save Indicator :**
- "💾 Sauvegardé" : Dernière sauvegarde réussie
- "💾 Sauvegarde..." : Sauvegarde en cours (debounce)
- Position : Coin supérieur droit

**Statut de Nœud :**
- Badge en haut du nœud
- "⏳ Génération" : Loading
- "✗ Erreur" : Error (avec message au survol)
- "⚠️ Obsolète" : Stale

**Connexions :**
- Arêtes : Courbes smoothstep (droites avec angles)
- Animées : Jamais (désactivé pour la performance)
- Couleur : Gris par défaut, rouge si tentative de cycle

### Animations et Feedback

**Transitions :**
- Création de nœud : Fade-in + scale (200ms)
- Suppression de nœud : Fade-out + scale (200ms)
- Déplacement : Smooth transition (drag)
- Loading : Pulse animation sur la bordure

**Feedback audio (optionnel) :**
- Son de création de nœud
- Son de génération terminée
- Son d'erreur

**Micro-interactions :**
- Hover sur boutons : Scale légère
- Hover sur handle : Grossissement
- Clic : Active state (pressed)

### Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Créer nouveau nœud racine |
| `Ctrl + Enter` | Générer nœud sélectionné |
| `Delete` / `Backspace` | Supprimer nœud sélectionné |
| `Escape` | Désélectionner tout / Sortir focus mode |
| `Ctrl + S` | Force save immédiat |
| `Ctrl + Z` | Undo (futur) |
| `Ctrl + Y` | Redo (futur) |

**Accessibilité :**
- Support du clavier complet
- Focus visible sur tous les éléments interactifs
- ARIA labels pour les lecteurs d'écran
- Contraste WCAG AA respecté

### Dark Mode

**Par défaut :**
- Appliqué via classe `.dark` sur `<html>`
- Variables CSS pour les couleurs
- Adaptation automatique des composants

**Thème React Flow :**
- Variables CSS spécifiques pour React Flow
- Surcharge des styles par défaut
- Contrôles et mini-map adaptés

**Couleurs :**
- Fond : `#0a0a0a` (presque noir)
- Texte : `#ededed` (gris clair)
- Accent : `#3b82f6` (bleu)
- Success : `#22c55e` (vert)
- Error : `#ef4444` (rouge)
- Warning : `#f59e0b` (orange)

---

## Cas d'Usage

### Cas 1 : Brainstorming Technique

**Scénario :** Un développeur veut explorer plusieurs approches pour optimiser une fonction.

**Flux :**

```
1. Crée nœud racine
   Prompt: "Comment optimiser une fonction de tri?"
   
2. Génère → Réponse: 3 approches (bubble sort, quicksort, merge sort)

3. Branche sur chaque approche
   - Nœud A: "Implémente bubble sort en Python"
   - Nœud B: "Implémente quicksort en Python"
   - Nœud C: "Implémente merge sort en Python"

4. Génère chaque branche → Code + explication

5. Compare
   Crée nœud de fusion connecté aux 3
   Prompt: "Compare les performances: O(n) vs O(n log n)"

6. Synthèse
   Nœud final: "Recommande quicksort pour la plupart des cas"
```

**Avantages par rapport au chat linéaire :**
- Visualisation claire des 3 approches côte à côte
- Possibilité de modifier une approche sans perdre les autres
- Facile de voir les relations entre les implémentations

### Cas 2 : Recherche Documentaire

**Scénario :** Un chercheur explore plusieurs sources sur un sujet.

**Flux :**

```
1. Racine: "Qu'est-ce que l'apprentissage profond?"

2. Branche A: Sources académiques
   - "Explique l'apprentissage profond selon Bengio"
   - "Explique selon Hinton"
   - "Explique selon LeCun"
   
3. Branche B: Applications pratiques
   - "Utilisation en vision par ordinateur"
   - "Utilisation en NLP"
   - "Utilisation en audio"

4. Fusion: Synthèse
   Connecte les branches à un nœud de synthèse
   "Synthèse des perspectives académiques et pratiques"
```

**Avantages :**
- Organiser les sources par thème
- Fusionner plusieurs perspectives
- Maintenir la traçabilité des sources

### Cas 3 : Rédaction d'Article

**Scénario :** Un auteur structure et développe un article.

**Flux :**

```
1. Racine: "Structure d'un article sur le changement climatique"

2. Première partie
   - "Introduction au changement climatique"
   - "Causes principales"
   - "Conséquences économiques"

3. Deuxième partie (branche)
   - "Solutions techniques"
   - "Solutions politiques"
   - "Actions individuelles"

4. Fusion et conclusion
   - "Synthèse des solutions"
   - "Conclusion et recommandations"

5. Quick Actions pour affiner
   - Sur chaque nœud: "Concis" pour raccourcir
   - Sur conclusion: "Tonalité journalistique" pour adapter le style
```

**Avantages :**
- Structure visuelle de l'article
- Facile de réorganiser les sections (drag & drop)
- Modifications propagées automatiquement

### Cas 4 : Debugging

**Scénario :** Un développeur investigue un bug avec plusieurs hypothèses.

**Flux :**

```
1. Racine: "Erreur: null pointer exception sur line 42"

2. Branche A: Hypothèse 1
   "Si c'est un problème d'initialisation, comment le résoudre?"
   
3. Branche B: Hypothèse 2
   "Si c'est un problème de concurrence, comment le résoudre?"
   
4. Branche C: Hypothèse 3
   "Si c'est un problème de data flow, comment le résoudre?"

5. Teste chaque solution
   → Branche A1: "Implémente fix initialisation"
   → Branche B1: "Ajoute synchronisation"
   → Branche C1: "Corrige le data flow"

6. Compare les solutions
   → Fusion: "Évalue laquelle est la plus appropriée"
```

**Avantages :**
- Explorer toutes les hypothèses en parallèle
- Tester des solutions sans casser le code existant
- Documenter le processus de debugging

### Cas 5 : Apprentissage Progressif

**Scénario :** Un étudiant apprend un concept complexe par étapes.

**Flux :**

```
1. Racine: "Explique ce qu'est React"

2. Niveau 1: Concepts de base
   - "Qu'est-ce qu'un composant?"
   - "Comment fonctionne le state?"
   - "Qu'est-ce que le virtual DOM?"
   
3. Niveau 2: Concepts intermédiaires (branches)
   - "Explique les Hooks"
   - "Explique le Context API"
   - "Explique Redux"
   
4. Niveau 3: Concepts avancés (sous-branches)
   - "Performance optimization"
   - "Testing"
   - "Server-side rendering"

5. Quick Actions pour approfondir
   - Sur chaque concept: "Détails" pour plus d'explications
   - Sur concepts complexes: "ELI5" pour simplifier
```

**Avantages :**
- Carte mentale interactive des concepts
- Progression logique et visible
- Possibilité de revenir et approfondir

### Cas 6 : Comparaison de Produits

**Scénario :** Un analyste compare plusieurs options pour un achat.

**Flux :**

```
1. Racine: "Compare les smartphones 2024"

2. Branche A: iPhone 15
   - "Spécifications techniques"
   - "Avantages"
   - "Inconvénients"
   - "Prix"

3. Branche B: Samsung Galaxy S24
   - Même structure

4. Branche C: Google Pixel 8
   - Même structure

5. Fusion: Comparaison directe
   - Tableau comparatif
   - Recommandation selon le profil utilisateur
   
6. Quick Actions
   - "Format pour présentation"
   - "Extrame points clés"
```

**Avantages :**
- Comparaison structurée et visuelle
- Facile d'ajouter de nouvelles options
- Synthèse automatisée par le LLM

### Cas 7 : Planification de Projet

**Scénario :** Un PM décompose et planifie un projet.

**Flux :**

```
1. Racine: "Plan de développement d'une app web"

2. Phase 1: Conception
   - "Spécifications fonctionnelles"
   - "Wireframes"
   - "Maquettes"
   
3. Phase 2: Développement (branches)
   - "Backend API"
     → "Authentification"
     → "Database schema"
     → "Endpoints"
   - "Frontend"
     → "Components"
     → "State management"
     → "Routing"
   
4. Phase 3: Testing
   - "Unit tests"
   - "Integration tests"
   - "E2E tests"
   
5. Timeline
   - Fusion: "Estime la durée de chaque phase"
   - "Identifie les dépendances"
```

**Avantages :**
- Décomposition visuelle du projet
- Identification claire des dépendances
- Facile d'ajuster et réorganiser

---

## Conclusion

NonLinear transforme l'interaction avec les LLM d'une expérience **linéaire** à une expérience **non-linéaire**, ouvrant de nouvelles possibilités :

✅ **Exploration parallèle** - Testez plusieurs idées simultanément
✅ **Édition flexible** - Modifiez n'importe quel point sans casser tout
✅ **Visualisation intuitive** - Comprenez la structure de vos pensées
✅ **Collaboration humain-IA** - Le LLM comme partenaire créatif

Cette architecture, basée sur des graphes orientés, offre un puissant modèle mental pour penser, créer et apprendre avec l'intelligence artificielle.

---

**Pour aller plus loin :**
- Voir [NEXT_GEN_CHAT_RECREATION_GUIDE.md](./NEXT_GEN_CHAT_RECREATION_GUIDE.md) pour les détails d'implémentation
- Voir [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) pour le plan de développement
