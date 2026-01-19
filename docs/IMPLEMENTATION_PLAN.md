# Plan d'Implémentation - forky avec Architecture Hybride

> **Guide complet avec prompts pour Cursor/Claude Code agents**

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Phase 1 : Préparation & Backup](#2-phase-1--préparation--backup)
3. [Phase 2 : Setup Monorepo](#3-phase-2--setup-monorepo)
4. [Phase 3 : Packages Partagés](#4-phase-3--packages-partagés)
5. [Phase 4 : Design System UI](#5-phase-4--design-system-ui)
6. [Phase 5 : Migration Features](#6-phase-5--migration-features)
7. [Phase 6 : Validation & Nettoyage](#7-phase-6--validation--nettoyage)

---

## 1. Vue d'Ensemble

### Objectif
Construire l'application **forky** (plateforme d'exploration non-linéaire des idées) en utilisant l'architecture hybride définie dans les docs.

### Architecture Cible

```
forky/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (app)/            # Route group principale
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── page.tsx      # Canvas page
│   │   │   │   └── api/              # Route Handlers
│   │   │   └── features/             # Features (canvas, nodes, sidebar, etc.)
│   │   │       ├── canvas/           # Canvas & interactions
│   │   │       ├── nodes/            # Gestion des nœuds
│   │   │       ├── sidebar/          # Sidebar & projets
│   │   │       ├── projects/         # Gestion projets
│   │   │       ├── collaboration/     # Multi-user (futur)
│   │   │       ├── multimodal/        # Contenu multimodal (futur)
│   │   │       ├── voice/            # Interactions vocales (futur)
│   │   │       ├── node-types/       # Nœuds spécialisés (futur)
│   │   │       ├── project-mode/      # Mode projet (futur)
│   │   │       └── agents/           # Agents IA (futur)
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── api/                          # Backend NestJS (futur)
│       ├── src/
│       │   ├── modules/              # Feature modules
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── projects/
│       │   │   ├── nodes/
│       │   │   ├── collaboration/
│       │   │   ├── llm/
│       │   │   └── agents/
│       │   └── common/
│       └── package.json
│
├── packages/                          # Shared Packages
│   ├── ui/                            # Design System (Atomic)
│   │   ├── src/
│   │   │   ├── atoms/               # Button, Input, Modal, Badge, Spinner
│   │   │   ├── molecules/            # NodeHeader, FormField, QuickActionButton
│   │   │   ├── organisms/            # Sidebar, CanvasControls, ToastContainer
│   │   │   └── templates/            # AppLayout, ProjectLayout
│   │   ├── package.json
│   │   └── .storybook/
│   │
│   ├── shared/                        # Code partagé (Front + Back)
│   │   ├── src/
│   │   │   ├── types/                # Node, Edge, Project, etc.
│   │   │   ├── constants/            # Constantes d'application
│   │   │   ├── utils/                # Utils généraux
│   │   │   ├── graph/                # Algorithmes graphe (cascade, buildContext)
│   │   │   └── validation/            # Zod schemas
│   │   └── package.json
│   │
│   ├── config/                        # Configuration partagée
│   │   ├── src/
│   │   │   ├── env.ts                # Variables d'environnement
│   │   │   └── llm.ts                # Configuration LLM
│   │   └── package.json
│   │
│   └── contracts/                     # Contrats partagés (futur)
│       ├── src/
│       │   ├── dto/
│       │   ├── events/
│       │   └── interfaces/
│       └── package.json
│
├── pnpm-workspace.yaml              # Workspace configuration
├── package.json (root)             # Scripts monorepo
├── turbo.json                      # Turborepo config
├── tsconfig.base.json              # TypeScript base config
├── docker-compose.yml              # Local dev services (futur)
└── README.md
```

### Principes Clés

✅ **Design System (Atomic Design)** : Tous les composants UI réutilisables dans `packages/ui`
✅ **Feature-Based Architecture** : Logique métier organisée par feature dans `apps/web/src/features/`
✅ **Code Partagé** : Types, utilitaires, algorithmes dans `packages/shared`
✅ **Pas de tests** : Tests exclus de ce plan
✅ **TypeScript Strict** : TypeScript strict mode partout
✅ **Monorepo** : pnpm workspace avec Turborepo
✅ **Futur-ready** : Préparé pour multi-user, multimodal, agents IA

---

## 2. Phase 1 : Préparation & Backup

### 🎯 Prompt Agent 1 : Initialiser le Projet forky

**Rôle** : Initialiser le projet forky avec la structure monorepo

**Prompt :**
```
Tu es un expert DevOps et architecture de logiciel. Ta tâche est d'initialiser le projet forky avec une architecture monorepo propre.

Contexte :
- Projet : forky (plateforme d'exploration non-linéaire des idées)
- Documentation de référence : /Users/cgarrot/zob/forky/docs/
- Architecture cible : Monorepo avec pnpm workspace et architecture hybride

Fonctionnalités principales de forky :
- Canvas infini avec React Flow
- Nœuds de brainstorming avec génération LLM
- Connexions entre nœuds
- Mode focus pour sélection et surlignage
- Système de projet avec sauvegarde
- Quick actions (macros)
- System prompt configurable

Tâches à accomplir :

1. **Créer la structure de dossiers du monorepo**
   - Créer apps/web/ et apps/api/
   - Créer packages/ui/, packages/shared/, packages/config/, packages/contracts/
   - Créer docs/architecture/ pour la documentation technique

2. **Initialiser apps/web (Frontend Next.js)**
   - Initialiser un projet Next.js 15.0.0 dans apps/web/
   - Configurer TypeScript strict mode
   - Configurer Tailwind CSS 3.4.0
   - Installer les dépendances :
     * next, react, react-dom (19.0.0)
     * @xyflow/react (12.0.0)
     * zustand (5.0.0)
     * immer (10.0.0)
     * react-markdown (9.0.0)
     * framer-motion (11.0.0)
     * lucide-react (0.400.0)
   - Créer la structure src/app/ avec App Router
   - Créer la structure src/features/ vide (pour les futures features)

3. **Créer apps/api (Backend NestJS - préparer)**
   - Créer la structure de base pour le backend NestJS
   - Initialiser un projet NestJS dans apps/api/
   - Configurer TypeScript strict mode
   - Installer les dépendances de base :
     * @nestjs/common, @nestjs/core, @nestjs/platform-express
     * @nestjs/config, @nestjs/jwt
     * class-validator, class-transformer
   - Créer la structure src/modules/ vide
   - Créer la structure src/common/ vide

4. **Configurer pnpm-workspace.yaml**
   - Créer le fichier pnpm-workspace.yaml à la racine
   - Configurer les workspaces : 'apps/*' et 'packages/*'

5. **Créer le package.json racine**
   - Créer package.json avec scripts :
     * dev: "turbo run dev"
     * build: "turbo run build"
     * lint: "turbo run lint"
     * clean: "turbo run clean && rm -rf node_modules"
     * ui:dev: "pnpm --filter @forky/ui run dev"
     * web:dev: "pnpm --filter @forky/web run dev"
     * web:build: "pnpm --filter @forky/web run build"
   - Ajouter devDependencies : turbo, typescript, eslint

6. **Créer tsconfig.base.json**
   - Configurer TypeScript base pour tout le monorepo
   - Activer strict mode et autres options strictes
   - Configurer les path aliases pour les packages

7. **Créer turbo.json**
   - Configurer les pipelines pour build, dev, lint
   - Activer le cache pour les builds
   - Configurer les dépendances entre packages

8. **Créer README.md à la racine**
   - Documenter le projet forky
   - Expliquer l'architecture monorepo
   - Documenter les commandes principales (pnpm dev, pnpm build, etc.)

9. **Créer le fichier .gitignore**
   - Configurer les ignores standard : node_modules, .next, dist, .env, etc.

10. **Initialiser Git**
    - Initialiser le repository git
    - Créer un commit initial
    - Créer un tag initial : v0.0.1-initial

Sortie attendue :
- Structure monorepo créée (apps/, packages/)
- apps/web initialisé avec Next.js 15
- apps/api initialisé avec NestJS (structure de base)
- pnpm workspace configuré
- Scripts root configurés (dev, build, lint)
- TypeScript base config créé
- Turbo configuré
- README.md créé
- .gitignore créé
- Git initialisé avec commit initial
```

---

## 3. Phase 2 : Setup Monorepo

### 🎯 Prompt Agent 2 : Créer Packages Partagés (Shared & Config)

**Rôle** : Créer les packages partagés pour le monorepo

**Prompt :**
```
Tu es un expert TypeScript et architecture de packages. Ta tâche est de créer les packages partagés pour le monorepo forky.

Contexte :
- Monorepo déjà initialisé avec structure de base
- Packages à créer : packages/shared/, packages/config/, packages/contracts/
- Documentation de référence : /Users/cgarrot/zob/forky/docs/

Tâches à accomplir :

1. **Créer packages/shared**
   - Créer la structure : src/types/, src/constants/, src/utils/, src/graph/, src/validation/
   - Créer package.json avec :
     * Nom : @forky/shared
     * Version : 0.1.0
     * Type : module
     * Main : ./dist/index.js
     * Types : ./dist/index.d.ts
     * Scripts : build, test
     * Dependencies : zod (3.22.0+)
     * DevDependencies : typescript, vitest
   - Configurer les exports dans package.json

2. **Créer les types dans packages/shared/src/types/**
   - Créer node.types.ts :
     * NodeStatus : 'idle' | 'loading' | 'error' | 'stale'
     * Node interface avec : id, prompt, response?, summary?, status, position, parentIds, createdAt, updatedAt, metadata
     * NodeMap interface
   - Créer edge.types.ts :
     * Edge interface avec : id, source, target, createdAt
     * EdgeMap interface
   - Créer project.types.ts :
     * Project interface avec : id, name, description, nodes, edges, systemPrompt, quickActions, viewport, createdAt, updatedAt
     * QuickAction interface avec : id, label, instruction, order
     * Viewport interface avec : x, y, zoom
   - Créer collaboration.types.ts :
     * User interface avec : id, name, email, avatar
     * UserPresence interface avec : userId, projectId, cursor, lastSeen
   - Créer multimodal.types.ts :
     * MediaType : 'image' | 'video' | 'document' | 'link' | 'audio'
     * Media interface avec : id, type, url, metadata, projectId
   - Créer voice.types.ts :
     * VoiceCommand interface avec : id, command, parameters, timestamp
   - Créer node-types.types.ts :
     * NodeType : 'standard' | 'plan' | 'flashcard' | 'presentation' | 'checklist' | 'reference' | 'code' | 'template' | 'objective' | 'note' | 'research'
   - Créer project-mode.types.ts :
     * ProjectPhase interface avec : id, name, description, order, status
     * ProjectModeState interface avec : currentPhase, phases, progress
   - Créer agent.types.ts :
     * AgentType interface avec : id, name, description, capabilities
     * AgentTask interface avec : id, agentId, status, result, error
   - Créer index.ts avec tous les exports

3. **Créer les constants dans packages/shared/src/constants/**
   - Créer app.constants.ts :
     * APP_NAME, APP_VERSION, APP_DESCRIPTION
     * DEFAULT_VIEWPORT
     * MAX_NODES_PER_PROJECT, MAX_EDGES_PER_NODE
   - Créer llm.constants.ts :
     * DEFAULT_MODEL, DEFAULT_TEMPERATURE
     * MAX_TOKENS, MAX_PROMPT_LENGTH
     * AVAILABLE_MODELS (GLM-4.7, GPT-4o, Claude 3.5)
   - Créer canvas.constants.ts :
     * DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT
     * MIN_ZOOM, MAX_ZOOM, ZOOM_STEP
     * GRID_SIZE, GRID_COLOR
   - Créer index.ts avec tous les exports

4. **Créer les utils dans packages/shared/src/utils/**
   - Créer cn.ts (className utility avec clsx et tailwind-merge)
   - Créer date.utils.ts (formatage de dates)
   - Créer crypto.utils.ts (génération d'IDs)
   - Créer validation.utils.ts (helpers de validation)
   - Créer storage.utils.ts (helpers pour localStorage)
   - Créer index.ts avec tous les exports

5. **Créer les graph algorithms dans packages/shared/src/graph/**
   - Créer index.ts (export principal)
   - Créer cascade.ts :
     * Fonction cascadeUpdate(nodeId, nodes, edges, onUpdate) : Propage les changements aux nœuds dépendants
     * Fonction detectCycle(nodes, edges) : Détecte les cycles dans le graphe
     * Fonction topologicalSort(nodes, edges) : Tri topologique
   - Créer context.ts :
     * Fonction buildContext(nodeId, nodes, edges) : Construit le contexte LLM pour un nœud
     * Fonction buildPromptContext(node, ancestors, siblings) : Construit le prompt avec contexte
   - Créer positioning.ts :
     * Fonction calculateNodePosition(node, existingNodes, edges) : Calcule la position optimale
     * Fonction autoLayout(nodes, edges) : Layout automatique du graphe
   - Créer validation.ts :
     * Fonction validateGraph(nodes, edges) : Valide la cohérence du graphe
     * Fonction validateNodeConnection(source, target, existingEdges) : Valide une connexion
   - Créer index.ts avec tous les exports

6. **Créer les validation schemas dans packages/shared/src/validation/**
   - Créer node.schema.ts :
     * nodePromptSchema : Validation du prompt (zod)
     * nodeUpdateSchema : Validation des updates
   - Créer project.schema.ts :
     * projectCreateSchema : Validation de création de projet
     * projectUpdateSchema : Validation des updates
   - Créer env.schema.ts :
     * EnvSchema : Validation des variables d'environnement
   - Créer index.ts avec tous les exports

7. **Créer le tsconfig pour packages/shared**
   - Créer tsconfig.json avec extends depuis tsconfig.base.json
   - Configurer l'output pour dist/
   - Configurer les path aliases

8. **Créer packages/config**
   - Créer la structure : src/
   - Créer package.json avec :
     * Nom : @forky/config
     * Version : 0.1.0
     * Type : module
     * Main : ./dist/index.js
     * Types : ./dist/index.d.ts
     * Scripts : build
     * Dependencies : zod
   - Configurer les exports dans package.json

9. **Créer la configuration dans packages/config/src/**
   - Créer env.ts :
     * Définir l'interface EnvConfig
     * Créer la fonction validateEnv() qui lit et valide les variables d'environnement
     * Variables : NODE_ENV, DATABASE_URL, REDIS_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY, GLM_API_KEY
   - Créer llm.ts :
     * Définir LLMConfig interface
     * Définir LLMModel interface avec : name, provider, maxTokens, capabilities
     * Créer la liste AVAILABLE_MODELS
     * Fonction getModelConfig(modelName)
     * Fonction getDefaultModel()
   - Créer index.ts avec tous les exports

10. **Créer packages/contracts**
    - Créer la structure : src/dto/, src/events/, src/interfaces/
    - Créer package.json avec :
      * Nom : @forky/contracts
      * Version : 0.1.0
      * Type : module
      * Main : ./dist/index.js
      * Types : ./dist/index.d.ts
      * Scripts : build
    - Configurer les exports dans package.json

11. **Créer les DTOs dans packages/contracts/src/dto/**
    - Créer project.dto.ts :
      * CreateProjectDto, UpdateProjectDto
      * ProjectResponseDto
    - Créer node.dto.ts :
      * CreateNodeDto, UpdateNodeDto
      * NodeResponseDto, GenerateNodeDto
    - Créer collaboration.dto.ts :
      * JoinProjectDto, LeaveProjectDto
      * CursorMoveDto
    - Créer index.ts avec tous les exports

12. **Créer les events dans packages/contracts/src/events/**
    - Créer node.events.ts :
      * NodeCreatedEvent, NodeUpdatedEvent, NodeDeletedEvent
      * NodeGeneratedEvent, NodeStreamEvent
    - Créer project.events.ts :
      * ProjectCreatedEvent, ProjectUpdatedEvent, ProjectDeletedEvent
    - Créer collaboration.events.ts :
      * UserJoinedEvent, UserLeftEvent, CursorMovedEvent
    - Créer index.ts avec tous les exports

13. **Créer les interfaces dans packages/contracts/src/interfaces/**
    - Créer repository.interfaces.ts :
      * IProjectRepository, INodeRepository
      * IUserRepository, IMediaRepository
    - Créer service.interfaces.ts :
      * ILLMProvider, IStorageProvider
      * ICollaborationService
    - Créer index.ts avec tous les exports

14. **Construire les packages**
    - Exécuter : pnpm --filter @forky/shared run build
    - Exécuter : pnpm --filter @forky/config run build
    - Exécuter : pnpm --filter @forky/contracts run build
    - Vérifier que les exports sont corrects

Sortie attendue :
- packages/shared construit avec types, constants, utils, graph algorithms, validation schemas
- packages/config construit avec configuration env et LLM
- packages/contracts construit avec DTOs, events, interfaces
- Tous les packages avec exports corrects
- Prêt pour être utilisés par apps/web et apps/api
```

---

## 4. Phase 3 : Packages Partagés

### 🎯 Prompt Agent 3 : Créer Package UI (Atomes)

**Rôle** : Créer le package UI avec les atomes de base selon Atomic Design

**Prompt :**
```
Tu es un expert React et Design Systems. Ta tâche est de créer le package UI avec les atomes de base selon Atomic Design pour forky.

Contexte :
- Monorepo déjà initialisé
- Packages partagés déjà créés (shared, config, contracts)
- Package à créer : packages/ui/
- Documentation de référence : /Users/cgarrot/zob/forky/docs/DESIGN_SYSTEM.md
- Style du projet : Moderne, clean, professionel avec accents bleus et gris

Tâches à accomplir :

1. **Initialiser packages/ui**
   - Créer la structure : src/atoms/, src/molecules/, src/organisms/, src/templates/, src/styles/
   - Créer package.json avec :
     * Nom : @forky/ui
     * Version : 0.1.0
     * Type : module
     * Main : ./dist/index.js
     * Types : ./dist/index.d.ts
     * Scripts : dev (storybook), build, test, lint, storybook
     * PeerDependencies : react, react-dom
     * Dependencies : clsx, tailwind-merge, lucide-react, framer-motion, dompurify
     * DevDependencies : @storybook/react, @storybook/react-vite, vite, vitest, typescript, tailwindcss
   - Configurer les exports dans package.json pour atoms, molecules, organisms, templates

2. **Créer les styles globaux**
   - Créer src/styles/variables.css avec :
     * Variables de couleurs (primary, gray, success, warning, danger, info)
     * Variables d'espacement (space-0 à space-24)
     * Variables de typographie (font-sizes, font-weights, line-heights)
     * Variables de border-radius
     * Variables de shadows
     * Variables de transitions
   - Créer src/styles/globals.css avec reset et styles de base

3. **Créer l'atome Button**
   - Créer src/atoms/Button/Button.tsx
   - Props : variant ('primary' | 'secondary' | 'danger' | 'ghost'), size ('sm' | 'md' | 'lg'), loading, disabled, icon, fullWidth
   - Utiliser cn() de @forky/shared/utils
   - Utiliser Loader2 de lucide-react pour loading
   - Styling avec Tailwind : rounded-md, font-medium, transition-colors
   - Variants de couleurs : primary (blue-600), secondary (gray-200), danger (red-600), ghost (hover:bg-gray-100)
   - Créer src/atoms/Button/index.ts
   - Créer src/atoms/Button/Button.stories.tsx avec au moins 8 stories (Primary, Secondary, Danger, Ghost, Small, Large, Loading, Disabled, WithIcon)

4. **Créer l'atome Input**
   - Créer src/atoms/Input/Input.tsx
   - Props : type (text | email | password | number), placeholder, label, error, icon, disabled, required
   - Styling avec Tailwind : border, rounded-md, focus-visible:ring-2
   - Afficher label au-dessus si fourni
   - Afficher message d'erreur en rouge si error présent
   - Support pour icône à gauche
   - Créer src/atoms/Input/index.ts
   - Créer src/atoms/Input/Input.stories.tsx avec stories (Default, WithLabel, WithError, WithIcon, Disabled, Required)

5. **Créer l'atome Modal**
   - Créer src/atoms/Modal/Modal.tsx
   - Props : isOpen, onClose, title, size ('sm' | 'md' | 'lg' | 'xl'), children, footer
   - Gérer body overflow quand ouvert
   - Backdrop semi-transparent avec click pour fermer
   - Header avec bouton close (X)
   - Footer optionnel
   - Animation de fade-in
   - Créer src/atoms/Modal/index.ts
   - Créer src/atoms/Modal/Modal.stories.tsx avec stories (Default, Small, Large, WithoutHeader, WithActions)

6. **Créer l'atome Badge**
   - Créer src/atoms/Badge/Badge.tsx
   - Props : variant ('success' | 'warning' | 'danger' | 'info'), size ('sm' | 'md' | 'lg'), children
   - Styling avec Tailwind : rounded-full, border, font-medium
   - Variants de couleurs : success (green), warning (yellow), danger (red), info (blue)
   - Créer src/atoms/Badge/index.ts
   - Créer src/atoms/Badge/Badge.stories.tsx avec stories (Success, Warning, Danger, Info, Small, Large)

7. **Créer l'atome Spinner**
   - Créer src/atoms/Spinner/Spinner.tsx
   - Props : size ('sm' | 'md' | 'lg'), color
   - Utiliser Loader2 de lucide-react
   - Animation spin
   - Créer src/atoms/Spinner/index.ts
   - Créer src/atoms/Spinner/Spinner.stories.tsx avec stories (Small, Medium, Large, CustomColor)

8. **Créer l'atome Icon**
   - Créer src/atoms/Icon/Icon.tsx
   - Wrapper autour de lucide-react
   - Props : name, size, className
   - Mapping des noms d'icônes courants
   - Créer src/atoms/Icon/index.ts
   - Créer src/atoms/Icon/Icon.stories.tsx avec stories (CommonIcons, Sizes)

9. **Créer l'atome Checkbox**
   - Créer src/atoms/Checkbox/Checkbox.tsx
   - Props : checked, onChange, disabled, label
   - Styling avec Tailwind : border rounded, accent-blue-600
   - Animation de transition
   - Créer src/atoms/Checkbox/index.ts
   - Créer src/atoms/Checkbox/Checkbox.stories.tsx avec stories (Default, Checked, Disabled, WithLabel)

10. **Créer l'atome Tooltip**
    - Créer src/atoms/Tooltip/Tooltip.tsx
    - Props : children, content, position ('top' | 'bottom' | 'left' | 'right')
    - Utiliser framer-motion pour l'animation
    - Styling avec Tailwind : bg-gray-900 text-white rounded px-2 py-1
    - Créer src/atoms/Tooltip/index.ts
    - Créer src/atoms/Tooltip/Tooltip.stories.tsx avec stories (Top, Bottom, Left, Right)

11. **Créer les index files**
    - Créer src/atoms/index.ts (exports tous les atomes)
    - Créer src/index.ts (barrel export principal)

12. **Configurer Storybook**
    - Créer .storybook/main.ts avec configuration
    - Créer .storybook/preview.ts avec thème et paramètres
    - Configurer les addons (themes, actions, controls)
    - Importer les styles globaux

13. **Construire et tester le package**
    - Exécuter : pnpm --filter @forky/ui run build
    - Exécuter : pnpm --filter @forky/ui run dev (storybook)
    - Vérifier que toutes les stories sont valides
    - Vérifier que les exports sont accessibles

Sortie attendue :
- packages/ui construit avec atomes de base
- Atomes : Button, Input, Modal, Badge, Spinner, Icon, Checkbox, Tooltip
- Stories Storybook créées pour chaque atome
- Styles globaux configurés
- Exports corrects via index.ts
- Storybook accessible sur localhost:6006
```

### 🎯 Prompt Agent 4 : Créer Package UI (Molecules)

**Rôle** : Créer les molecules du design system

**Prompt :**
```
Tu es un expert React et Design Systems. Ta tâche est de créer les molecules du package UI pour forky.

Contexte :
- packages/ui avec atomes déjà créés
- Molecules à créer pour forky : NodeHeader, FormField, QuickActionButton, Dropzone, MediaPreview
- Documentation de référence : /Users/cgarrot/zob/forky/docs/DESIGN_SYSTEM.md

Tâches à accomplir :

1. **Créer la molecule NodeHeader**
   - Créer src/molecules/NodeHeader/NodeHeader.tsx
   - Utiliser Button de @forky/ui/atoms
   - Utiliser Badge de @forky/ui/atoms
   - Utiliser des icônes de lucide-react (MoreVertical, Trash2, Edit3, Copy, Check)
   - Props :
     * title : string (optionnel)
     * status : 'idle' | 'loading' | 'error' | 'stale' (optionnel)
     * onEdit : callback
     * onDelete : callback
     * onDuplicate : callback
     * onToggleStatus : callback
   - Afficher un badge de statut selon le status (loading, error, stale)
   - Menu d'actions avec : Edit, Delete, Duplicate, Mark as Stale
   - Styling : flex items-center justify-between p-3 border-b border-gray-200
   - Créer src/molecules/NodeHeader/index.ts
   - Créer src/molecules/NodeHeader/NodeHeader.stories.tsx avec stories (Default, Loading, Error, Stale, WithActions)

2. **Créer la molecule FormField**
   - Créer src/molecules/FormField/FormField.tsx
   - Utiliser Input de @forky/ui/atoms
   - Props :
     * label : string (optionnel)
     * error : string (optionnel)
     * helperText : string (optionnel)
     * required : boolean
     * Hériter toutes les props de Input
   - Afficher le label au-dessus de l'input
   - Afficher un astérisque rouge si required
   - Afficher un message d'erreur en rouge si error présent
   - Afficher un helper text en gris si pas d'erreur
   - Créer src/molecules/FormField/index.ts
   - Créer src/molecules/FormField/FormField.stories.tsx avec stories (Default, WithLabel, WithError, Required, WithHelperText)

3. **Créer la molecule QuickActionButton**
   - Créer src/molecules/QuickActionButton/QuickActionButton.tsx
   - Utiliser Button de @forky/ui/atoms
   - Props :
     * label : string
     * onClick : callback
     * icon : React.ReactNode (optionnel)
     * color : 'blue' | 'green' | 'orange' | 'purple' | 'red' (défaut 'blue')
     * description : string (optionnel)
   - Styling : bouton avec bordure colorée à gauche, text-left, w-full, hover:bg-opacity
   - Afficher la description en gris si fournie
   - Créer src/molecules/QuickActionButton/index.ts
   - Créer src/molecules/QuickActionButton/QuickActionButton.stories.tsx avec stories (Blue, Green, Orange, Purple, Red, WithDescription)

4. **Créer la molecule Dropzone**
   - Créer src/molecules/Dropzone/Dropzone.tsx
   - Props :
     * onDrop : callback (files: File[])
     * onDragOver : callback
     * onDragLeave : callback
     * accept : string[] (types MIME acceptés)
     * maxSize : number (octets)
     * multiple : boolean
     * disabled : boolean
   - Utiliser des icônes de lucide-react (UploadCloud)
   - Styling : border-2 border-dashed rounded-lg, transition-all
   - States : idle, dragover, error
   - Messages pour différents états
   - Créer src/molecules/Dropzone/index.ts
   - Créer src/molecules/Dropzone/Dropzone.stories.tsx avec stories (Default, DragOver, MultipleFiles, WithSizeLimit)

5. **Créer la molecule MediaPreview**
   - Créer src/molecules/MediaPreview/MediaPreview.tsx
   - Props :
     * media : { type: MediaType, url: string, name?: string }
     * onDelete : callback
     * onEdit : callback
     * size : 'sm' | 'md' | 'lg'
   - Support pour images, vidéos, documents, liens
   - Afficher preview selon le type :
     * Images : img tag avec object-fit
     * Vidéos : video tag ou embed YouTube
     * Documents : icône de fichier avec nom
     * Liens : card avec preview (titre, description)
   - Boutons d'action (delete, edit)
   - Créer src/molecules/MediaPreview/index.ts
   - Créer src/molecules/MediaPreview/MediaPreview.stories.tsx avec stories (Image, Video, Document, Link, Small, Large)

6. **Créer la molecule NodePrompt**
   - Créer src/molecules/NodePrompt/NodePrompt.tsx
   - Utiliser Input de @forky/ui/atoms
   - Props :
     * value : string
     * onChange : (value: string) => void
     * disabled : boolean
     * placeholder : string
     * maxLength : number
     * showCounter : boolean
   - Textarea avec auto-resize
   - Compteur de caractères si showCounter=true
   - Validation de longueur
   - Placeholder : "What do you want to explore?"
   - Styling : min-height-100, resize-none
   - Créer src/molecules/NodePrompt/index.ts
   - Créer src/molecules/NodePrompt/NodePrompt.stories.tsx avec stories (Default, WithCounter, Disabled, MaxLength)

7. **Créer la molecule NodeResponse**
   - Créer src/molecules/NodeResponse/NodeResponse.tsx
   - Utiliser react-markdown pour le rendu Markdown
   - Props :
     * content : string
     * loading : boolean
     * error : Error | null
     * onCopy : callback
   - Utiliser dompurify pour la sanitization XSS
   - Styling : prose (Tailwind typography)
   - Animation de fade-in pour le contenu
   - Afficher le loader si loading
   - Afficher l'erreur si error
   - Bouton "Copy" pour copier le contenu
   - Créer src/molecules/NodeResponse/index.ts
   - Créer src/molecules/NodeResponse/NodeResponse.stories.tsx avec stories (Default, Loading, Error, LongContent, WithCopyButton)

8. **Mettre à jour les index files**
   - Créer src/molecules/index.ts (exports toutes les molecules)
   - Mettre à jour src/index.ts pour inclure les molecules

9. **Construire et tester**
   - Exécuter : pnpm --filter @forky/ui run build
   - Vérifier que toutes les stories s'affichent correctement dans Storybook
   - Vérifier que les exports sont accessibles

Sortie attendue :
- Molecules : NodeHeader, FormField, QuickActionButton, Dropzone, MediaPreview, NodePrompt, NodeResponse créés
- Stories Storybook pour chaque molecule
- Exports corrects via index.ts
- Intégration avec les atomes (Button, Input, Badge, Icon)
```

### 🎯 Prompt Agent 5 : Créer Package UI (Organismes & Templates)

**Rôle** : Créer les organismes et templates du design system

**Prompt :**
```
Tu es un expert React et Design Systems. Ta tâche est de créer les organismes et templates du package UI pour forky.

Contexte :
- packages/ui avec atomes et molecules déjà créés
- Organismes à créer : Sidebar, CanvasControls, ToastContainer, PresenceIndicator
- Templates à créer : AppLayout, ProjectLayout, CanvasLayout
- Documentation de référence : /Users/cgarrot/zob/forky/docs/DESIGN_SYSTEM.md

Tâches à accomplir :

1. **Créer l'organisme Sidebar**
   - Créer src/organisms/Sidebar/Sidebar.tsx
   - Props :
     * isOpen : boolean
     * onClose : callback (optionnel)
     * children : React.ReactNode
     * width : number (défaut 280)
     * position : 'left' | 'right' (défaut 'left')
   - Styling : position fixed, transition-transform, shadow-xl, border-r
   - Overlay mobile pour fermer quand clique dehors
   - Header avec titre et bouton close (mobile uniquement)
   - Zone scrollable pour le contenu
   - Créer src/organisms/Sidebar/index.ts
   - Créer src/organisms/Sidebar/Sidebar.stories.tsx avec stories (Default, Closed, RightPosition, WithContent)

2. **Créer l'organisme CanvasControls**
   - Créer src/organisms/CanvasControls/CanvasControls.tsx
   - Utiliser Button de @forky/ui/atoms
   - Utiliser des icônes de lucide-react (ZoomIn, ZoomOut, Maximize2, RotateCcw)
   - Props :
     * onZoomIn : callback
     * onZoomOut : callback
     * onFitView : callback
     * onResetView : callback
     * canZoomIn : boolean (défaut true)
     * canZoomOut : boolean (défaut true)
     * zoomLevel : number (défaut 1)
   - Styling : position fixed bottom-4 right-4, bg-white, shadow-lg, border, rounded-lg, p-2, flex items-center gap-2
   - Boutons : ZoomOut, ZoomIn, Fit View, Reset View
   - Indicateur de zoom en pourcentage
   - Créer src/organisms/CanvasControls/index.ts
   - Créer src/organisms/CanvasControls/CanvasControls.stories.tsx avec stories (Default, WithAllControls, MinZoom, MaxZoom)

3. **Créer l'organisme ToastContainer**
   - Créer src/organisms/ToastContainer/ToastContainer.tsx
   - Créer un store Zustand pour gérer les toasts
   - Types :
     * Toast : id, variant ('success' | 'error' | 'warning' | 'info'), message, duration, action?
   - ToastStore : toasts, addToast, removeToast, clearAll
   - Utiliser Button de @forky/ui/atoms
   - Utiliser des icônes de lucide-react (Check, X, AlertCircle, Info, AlertTriangle)
   - Position : fixed top-4 right-4, flex flex-col gap-2, w-full max-w-md
   - Animation : slide-in-from-right avec framer-motion
   - Auto-remove après duration (défaut 5000ms)
   - Bouton dismiss pour chaque toast
   - Créer le hook useToast() avec méthodes success, error, warning, info
   - Créer src/organisms/ToastContainer/index.ts (export ToastContainer et useToast)
   - Créer src/organisms/ToastContainer/ToastContainer.stories.tsx avec stories (SingleToast, MultipleToasts, WithAction, AutoRemove)

4. **Créer l'organisme PresenceIndicator**
   - Créer src/organisms/PresenceIndicator/PresenceIndicator.tsx
   - Utiliser UserAvatar (à créer dans atoms)
   - Props :
     * users : UserPresence[]
     * position : 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
     * maxVisible : number (défaut 5)
   - Afficher les utilisateurs connectés au projet
   - Afficher leur curseur en temps réel (optionnel)
   - Overflow : "X others" si plus que maxVisible
   - Animation de fade-in pour nouveaux utilisateurs
   - Créer src/organisms/PresenceIndicator/index.ts
   - Créer src/organisms/PresenceIndicator/PresenceIndicator.stories.tsx avec stories (SingleUser, MultipleUsers, Overflow)

5. **Créer l'atome UserAvatar (avant PresenceIndicator)**
   - Créer src/atoms/UserAvatar/UserAvatar.tsx
   - Props :
     * user : { name, email, avatar? }
     * size : 'sm' | 'md' | 'lg'
     * showTooltip : boolean
   - Styling : rounded-full, bg-gradient-to-br, flex items-center justify-center
   - Initials de l'utilisateur si pas d'avatar
   - Tooltip optionnel avec nom/email
   - Créer src/atoms/UserAvatar/index.ts
   - Créer src/atoms/UserAvatar/UserAvatar.stories.tsx avec stories (WithImage, WithoutImage, Sizes, WithTooltip)

6. **Créer le template AppLayout**
   - Créer src/templates/AppLayout/AppLayout.tsx
   - Utiliser Sidebar de @forky/ui/organisms
   - Props :
     * children : React.ReactNode
     * sidebar : React.ReactNode (optionnel)
     * header : React.ReactNode (optionnel)
   - Styling : flex h-screen bg-gray-50
   - Layout : Sidebar à gauche, Main content à droite
   - Header fixé en haut si fourni
   - Responsive : Sidebar toggleable sur mobile
   - Créer src/templates/AppLayout/index.ts
   - Créer src/templates/AppLayout/AppLayout.stories.tsx avec stories (Default, WithHeader, WithoutSidebar)

7. **Créer le template ProjectLayout**
   - Créer src/templates/ProjectLayout/ProjectLayout.tsx
   - Props :
     * children : React.ReactNode
     * header : React.ReactNode (optionnel)
     * sidebar : React.ReactNode (optionnel)
     * toolbar : React.ReactNode (optionnel)
   - Styling : flex flex-col h-screen bg-gray-50
   - Layout :
     * Header en haut (h-14, border-b)
     * Barre de progression/toolbar sous header (optionnel)
     * Body : flex-1 overflow-hidden (contient sidebar + main)
   - Sidebar dans le body (w-256, border-r)
   - Main content flex-1 overflow-auto
   - Créer src/templates/ProjectLayout/index.ts
   - Créer src/templates/ProjectLayout/ProjectLayout.stories.tsx avec stories (Default, WithToolbar, WithProgress)

8. **Créer le template CanvasLayout**
   - Créer src/templates/CanvasLayout/CanvasLayout.tsx
   - Props :
     * children : React.ReactNode (canvas)
     * controls : React.ReactNode (optionnel)
     * toolbar : React.ReactNode (optionnel)
   - Styling : relative h-full w-full overflow-hidden bg-gray-50
   - Layout :
     * Canvas occupe tout l'espace (absolute inset-0)
     * Controls en bas à droite (position fixed)
     * Toolbar en haut à droite (position fixed)
   - Background : grid pattern optionnel
   - Créer src/templates/CanvasLayout/index.ts
   - Créer src/templates/CanvasLayout/CanvasLayout.stories.tsx avec stories (Default, WithControls, WithToolbar, WithGridBackground)

9. **Mettre à jour les index files**
   - Créer src/organisms/index.ts (exports tous les organismes)
   - Créer src/templates/index.ts (exports tous les templates)
   - Mettre à jour src/index.ts pour inclure organismes et templates

10. **Construire et tester**
    - Exécuter : pnpm --filter @forky/ui run build
    - Vérifier que toutes les stories s'affichent correctement dans Storybook
    - Vérifier que tous les exports sont accessibles
    - Tester l'intégration des composants entre eux

Sortie attendue :
- Organismes : Sidebar, CanvasControls, ToastContainer, PresenceIndicator créés
- Atome UserAvatar créé
- Templates : AppLayout, ProjectLayout, CanvasLayout créés
- Stories Storybook pour chaque composant
- Store Zustand pour ToastContainer
- Hook useToast() disponible
- Exports corrects via index.ts
- Package UI complet et fonctionnel avec atome, molecules, organismes, templates
```

---

## 5. Phase 4 : Design System UI

### 🎯 Prompt Agent 6 : Intégrer UI Package dans Web App

**Rôle** : Intégrer le package @forky/ui dans l'application web apps/web

**Prompt :**
```
Tu es un expert React et intégration. Ta tâche est d'intégrer le package @forky/ui dans l'application web apps/web.

Contexte :
- packages/ui construit et fonctionnel
- apps/web initialisé avec Next.js 15
- Objectif : Utiliser @forky/ui pour tous les composants UI

Tâches à accomplir :

1. **Installer @forky/ui dans apps/web**
   - Exécuter : pnpm --filter @forky/web add @forky/ui @forky/shared @forky/config
   - Vérifier que les dépendances sont bien installées dans apps/web/package.json

2. **Configurer les path aliases dans apps/web/tsconfig.json**
   - Mettre à jour apps/web/tsconfig.json
   - Ajouter les paths :
     * "@/*" : ["./src/*"]
     * "@/features/*" : ["./src/features/*"]
     * "@forky/ui" : ["../../packages/ui/src"]
     * "@forky/shared" : ["../../packages/shared/src"]
     * "@forky/config" : ["../../packages/config/src"]
   - S'assurer que baseUrl est "./"
   - S'assurer que le moduleResolution est "bundler"

3. **Configurer Tailwind CSS dans apps/web**
   - Mettre à jour apps/web/tailwind.config.ts
   - Importer les styles de @forky/ui/steps/variables.css
   - Configurer les content paths
   - Configurer les plugins

4. **Créer la page principale (apps/web/src/app/page.tsx)**
   - Créer une page simple avec AppLayout de @forky/ui
   - Importer AppLayout, Sidebar, ToastContainer de @forky/ui
   - Importer useToast de @forky/ui
   - Créer un canvas de base avec React Flow
   - Utiliser les composants de @forky/ui
   - S'assurer que la page est un Client Component ('use client')

5. **Créer le layout principal (apps/web/src/app/layout.tsx)**
   - Importer les styles globaux de @forky/ui
   - Configurer le metadata (title, description)
   - Configurer les fonts (Inter)
   - Importer ToastContainer de @forky/ui
   - S'assurer que le layout est un Server Component (pas 'use client')

6. **Créer le fichier globals.css**
   - Importer les styles de @forky/ui
   - Ajouter les styles spécifiques à l'application

7. **Créer une page de test pour les composants UI**
   - Créer apps/web/src/app/test-ui/page.tsx
   - Importer tous les atomes de @forky/ui
   - Créer des exemples d'utilisation pour chaque composant
   - S'assurer que tous les composants fonctionnent correctement

8. **Tester l'intégration**
   - Exécuter : pnpm --filter @forky/web run dev
   - Ouvrir http://localhost:3000
   - Vérifier que :
     * Le layout s'affiche correctement
     * Les composants UI sont bien stylés
     * Les icônes s'affichent
     * Les animations fonctionnent
   - Tester la page de test UI : http://localhost:3000/test-ui

9. **Créer les composants de base pour forky**
   - Créer une Sidebar simple avec @forky/ui
   - Créer un CanvasControls avec @forky/ui
   - Intégrer ces composants dans la page principale
   - S'assurer que l'interactivité fonctionne

10. **Vérifier les imports**
    - Faire une recherche pour les imports de composants locaux
    - S'assurer que tous les imports utilisent @forky/ui
    - Corriger tous les imports cassés

Sortie attendue :
- @forky/ui intégré dans apps/web
- Path aliases configurés
- Tailwind CSS configuré avec les styles de @forky/ui
- Page principale créée avec AppLayout
- Layout principal créé avec ToastContainer
- Page de test UI créée
- Composants de base forky (Sidebar, CanvasControls) créés
- Application web fonctionnelle avec @forky/ui
```

---

## 6. Phase 5 : Migration Features

### 🎯 Prompt Agent 7 : Créer Feature Canvas

**Rôle** : Créer la feature Canvas selon l'architecture feature-based

**Prompt :**
```
Tu es un expert React et architecture de features. Ta tâche est de créer la feature Canvas selon l'architecture hybride pour forky.

Contexte :
- apps/web avec structure monorepo initialisée
- @forky/ui intégré
- Feature Canvas à créer dans apps/web/src/features/canvas/
- Composants React Flow à utiliser : @xyflow/react (version 12.0.0)
- Documentation de référence : /Users/cgarrot/zob/forky/docs/FRONTEND_ARCHITECTURE.md

Fonctionnalités de Canvas pour forky :
- Canvas infini avec pan et zoom
- Support pour React Flow
- Grille de fond
- Création de nœuds via drag & drop ou bouton
- Sélection de nœuds (simple et multiple)
- Connexion de nœuds via edges
- Raccourcis clavier

Tâches à accomplir :

1. **Créer la structure de feature canvas**
   - Créer apps/web/src/features/canvas/
   - Créer les dossiers : components/, hooks/, services/, types/, utils/

2. **Créer le hook useCanvasState (Zustand Store)**
   - Créer apps/web/src/features/canvas/hooks/useCanvasState.ts
   - Utiliser Zustand avec middleware immer
   - Définir l'interface CanvasState :
     * nodes : Map<string, Node>
     * edges : Map<string, Edge>
     * selectedNodeIds : Set<string>
     * viewport : { x: number; y: number; zoom: number }
     * isDragging : boolean
     * dragNodeId : string | null
   - Définir les actions :
     * addNode, updateNode, deleteNode
     * addEdge, deleteEdge
     * setViewport
     * setSelectedNodes, clearSelection
     * setDragState
   - Utiliser immer pour simplifier les mutations
   - Ajouter middleware de persistance (localStorage)
   - Créer des sélecteurs optimisés (useNodes, useEdges, useViewport, etc.)

3. **Créer le composant Canvas**
   - Créer apps/web/src/features/canvas/components/Canvas.tsx
   - Utiliser ReactFlow de @xyflow/react
   - Configurer ReactFlow :
     * nodes, edges depuis useCanvasState
     * onNodesChange, onEdgesChange
     * onConnect, onConnectStart, onConnectEnd
     * onNodeClick, onPaneClick
     * defaultViewport, minZoom, maxZoom
   - Créer des nœuds customisés (nodeTypes)
   - Créer des edges customisés (edgeTypes)
   - Configurer les styles :
     * Background avec grid pattern
     * Connection line type et style
     * Marker end pour les edges
   - Créer le composant BackgroundGrid
   - Exporter le composant Canvas

4. **Créer le composant BackgroundGrid**
   - Créer apps/web/src/features/canvas/components/BackgroundGrid.tsx
   - Composant ReactFlow Background avec pattern dots
   - Styling : bg-gray-50
   - Configurer le grid size, color

5. **Créer le composant CreationMenu**
   - Créer apps/web/src/features/canvas/components/CreationMenu.tsx
   - Utiliser Button, Modal de @forky/ui
   - Props : isOpen, onClose, onCreateNode
   - Menu pour créer différents types de nœuds
   - Options : Standard Node, Plan, Flashcard, Checklist, etc.
   - Input pour le prompt initial
   - Boutons d'action (Create, Cancel)

6. **Créer le composant CanvasControls**
   - Utiliser @forky/ui/organisms/CanvasControls
   - Adapter les handlers pour utiliser useCanvasState
   - Configurer onZoomIn, onZoomOut, onFitView, onResetView
   - Afficher le zoom level actuel

7. **Créer le composant Minimap**
   - Créer apps/web/src/features/canvas/components/Minimap.tsx
   - Utiliser ReactFlow Minimap
   - Configurer les styles
   - Position : bottom-left

8. **Créer le service react-flow-wrapper**
   - Créer apps/web/src/features/canvas/services/react-flow-wrapper.ts
   - Wrapper autour de ReactFlowProvider
   - Configuration par défaut pour ReactFlow
   - Types et interfaces pour React Flow

9. **Créer les types canvas**
   - Définir les types dans apps/web/src/features/canvas/types/ :
     * CanvasConfig
     * NodePosition
     * EdgeConnection
   - Créer l'index types

10. **Créer les utils canvas**
    - Créer apps/web/src/features/canvas/utils/viewport-helpers.ts
    * Fonctions pour gérer le viewport : fitView, centerView, zoomTo
    - Créer apps/web/src/features/canvas/utils/node-positioning.ts
    * Fonctions pour calculer les positions de nœuds : calculatePosition, autoLayout
    * Créer l'index utils

11. **Créer l'index de la feature**
    - Créer apps/web/src/features/canvas/index.ts
    * Exporter tous les composants, hooks, services, types, utils

12. **Intégrer Canvas dans la page principale**
    - Mettre à jour apps/web/src/app/page.tsx
    * Importer Canvas, CanvasControls, CreationMenu de @/features/canvas
    * Importer useCanvasState, useViewport de @/features/canvas
    * Wraper Canvas avec ReactFlowProvider
    * Intégrer CanvasControls dans CanvasLayout
    * Créer un bouton "New Node" qui ouvre CreationMenu

13. **Tester la feature Canvas**
    * Vérifier que le canvas s'affiche correctement
    * Vérifier que le pan et zoom fonctionnent
    * Vérifier que la création de nœuds fonctionne
    * Vérifier que la sélection de nœuds fonctionne
    * Vérifier que la connexion de nœuds fonctionne
    * Vérifier que les raccourcis clavier fonctionnent

Sortie attendue :
- Feature canvas créée dans apps/web/src/features/canvas/
- Hook useCanvasState (Zustand store) créé
- Composants Canvas, BackgroundGrid, CreationMenu créés
- CanvasControls intégré avec useCanvasState
- Composant Minimap créé
- Services react-flow-wrapper créés
- Types et utils canvas créés
- Index de la feature avec exports
- Canvas fonctionnel avec React Flow intégré
```

### 🎯 Prompt Agent 8 : Créer Feature Nodes

**Rôle** : Créer la feature Nodes selon l'architecture feature-based

**Prompt :**
```
Tu es un expert React et architecture de features. Ta tâche est de créer la feature Nodes selon l'architecture hybride pour forky.

Contexte :
- apps/web avec structure monorepo
- @forky/ui intégré
- Feature canvas créée
- Feature nodes à créer dans apps/web/src/features/nodes/
- LLM integration : génération de réponses avec streaming
- Documentation de référence : /Users/cgarrot/zob/forky/docs/FRONTEND_ARCHITECTURE.md

Fonctionnalités de Nodes pour forky :
- Nœuds de brainstorming avec prompt et réponse LLM
- Édition du prompt
- Génération LLM avec streaming
- Statut du nœud (idle, loading, error, stale)
- Cascade updates : propagation des changements aux nœuds dépendants
- Actions sur nœuds : edit, delete, duplicate, regenerate

Tâches à accomplir :

1. **Créer la structure de feature nodes**
   - Créer apps/web/src/features/nodes/
   - Créer les dossiers : components/, hooks/, services/, types/, utils/

2. **Créer le composant CustomNode**
   - Créer apps/web/src/features/nodes/components/CustomNode.tsx
   - Utiliser NodeHeader, Badge, Button de @forky/ui
   - Utiliser NodePrompt et NodeResponse de @forky/ui/molecules
   - Props :
     * id : string
     * data : Node
   - Structure :
     * NodeHeader en haut (title, status, actions)
     * NodePrompt (zone d'édition du prompt)
     * NodeResponse (zone d'affichage de la réponse)
     * Footer avec boutons d'action (Generate, Delete, Duplicate)
   - Styles : bg-white rounded-lg shadow-lg border-2 min-w-[300px] max-w-[600px]
   - Gestion des états : idle, loading, error, stale
   - Animation de fade-in pour la réponse

3. **Créer le hook useNodeGeneration**
   - Créer apps/web/src/features/nodes/hooks/useNodeGeneration.ts
   - Utiliser useCanvasState pour accéder aux nœuds et edges
   - États : isGenerating, error, canCancel
   - Méthodes :
     * generate(nodeId) : Déclenche la génération LLM
     * cancel(nodeId) : Annule la génération
   - Utiliser le service llm-service
   - Gérer le streaming de la réponse
   - Mettre à jour le nœud en temps réel pendant la génération
   - Gérer les erreurs

4. **Créer le hook useNodeActions**
   - Créer apps/web/src/features/nodes/hooks/useNodeActions.ts
   - Utiliser useCanvasState
   - Méthodes :
     * editNode(nodeId, updates)
     * deleteNode(nodeId)
     * duplicateNode(nodeId)
     * regenerateNode(nodeId)
   - Gérer les effets de cascade

5. **Créer le hook useNodeSelection**
   - Créer apps/web/src/features/nodes/hooks/useNodeSelection.ts
   - Gérer la sélection de nœuds (single, multiple)
   - Méthodes :
     * selectNode(nodeId)
     * selectMultipleNodes(nodeIds)
     * deselectNode(nodeId)
     * clearSelection()
   - Gérer les raccourcis clavier (Shift+Click, Cmd+A)

6. **Créer le service llm-service**
   - Créer apps/web/src/features/nodes/services/llm-service.ts
   - Fonction generateLLMResponse(nodeId, nodes, edges, onChunk, onComplete, onError)
   - Utiliser @forky/config pour les modèles LLM
   - Utiliser buildContext de @forky/shared/graph pour construire le contexte
   - Streaming de la réponse avec chunks
   - Gestion des erreurs
   - Callbacks :
     * onChunk(chunk) : appelé à chaque chunk de la réponse
     * onComplete(response) : appelé quand la génération est terminée
     * onError(error) : appelé en cas d'erreur

7. **Créer le service cascade-service**
   - Créer apps/web/src/features/nodes/services/cascade-service.ts
   - Utiliser cascade de @forky/shared/graph
   - Fonction cascadeUpdate(nodeId, nodes, edges, onUpdate)
   - Identifier les nœuds dépendants
   * Propager les changements aux nœuds dépendants
   * Déclencher des régénérations en cascade (optionnel)
   * Gérer les cycles pour éviter les boucles infinies

8. **Créer les types nodes**
   - Définir les types dans apps/web/src/features/nodes/types/ :
     * NodeGenerationState
     * NodeGenerationOptions
     * NodeActions
   - Créer l'index types

9. **Créer les utils nodes**
   - Créer apps/web/src/features/nodes/utils/node-helpers.ts
   - Helpers pour :
     * formatNode(data) : Formate les données du nœud
     * validateNode(node) : Valide un nœud
     * extractSummary(response) : Extrait un résumé de la réponse
     * estimateTokens(text) : Estime le nombre de tokens
   - Créer l'index utils

10. **Créer les schemas Zod**
    - Créer apps/web/src/features/nodes/schemas/node.schema.ts
    * nodePromptSchema : validation du prompt (min 1, max 10000)
    * nodeUpdateSchema : validation des updates
    * Créer l'index schemas

11. **Créer l'index de la feature**
    - Créer apps/web/src/features/nodes/index.ts
    * Exporter tous les composants, hooks, services, types, utils, schemas

12. **Intégrer Nodes dans Canvas**
    - Mettre à jour apps/web/src/features/canvas/components/Canvas.tsx
    * Importer CustomNode de @/features/nodes
    * Configurer nodeTypes dans ReactFlow :
      * customNode : CustomNode
    * Configurer les handlers :
      * onNodeClick : sélectionne le nœud
      * onNodeDragStop : met à jour la position

13. **Tester la feature Nodes**
    * Vérifier que les nœuds s'affichent correctement
    * Vérifier que l'édition du prompt fonctionne
    * Vérifier que la génération LLM fonctionne avec streaming
    * Vérifier que les statuts (idle, loading, error, stale) s'affichent
    * Vérifier que le cascade update fonctionne
    * Vérifier que les actions (edit, delete, duplicate) fonctionnent

Sortie attendue :
- Feature nodes créée dans apps/web/src/features/nodes/
- Composant CustomNode avec NodeHeader, NodePrompt, NodeResponse
- Hooks useNodeGeneration, useNodeActions, useNodeSelection créés
- Services llm-service, cascade-service créés
- Types et utils nodes créés
- Schemas Zod créés
- Index de la feature avec exports
- Nodes fonctionnels avec génération LLM et cascade updates
- Intégration réussie dans Canvas
```

### 🎯 Prompt Agent 9 : Créer Feature Sidebar & Projects

**Rôle** : Créer les features Sidebar et Projects selon l'architecture feature-based

**Prompt :**
```
Tu es un expert React et architecture de features. Ta tâche est de créer les features Sidebar et Projects selon l'architecture hybride pour forky.

Contexte :
- apps/web avec structure monorepo
- @forky/ui intégré
- Features canvas et nodes créées
- Features sidebar et projects à créer dans apps/web/src/features/
- Documentation de référence : /Users/cgarrot/zob/forky/docs/FRONTEND_ARCHITECTURE.md

Fonctionnalités de Sidebar pour forky :
- Sidebar avec navigation entre projets
- Création de nouveaux projets
- Liste des projets
- Création rapide de nœuds
- Quick actions (macros)
- Éditeur de système prompt
- Toggle sidebar (ouvert/fermé)

Fonctionnalités de Projects pour forky :
- Créer/sauvegarder/charger des projets
- Gestion du système prompt par projet
- Gestion des quick actions (macros)
- Export de projet
- Suppression de projets

Tâches à accomplir :

1. **Créer la structure de feature sidebar**
   - Créer apps/web/src/features/sidebar/
   - Créer les dossiers : components/, hooks/, services/, types/

2. **Créer le composant Sidebar**
   - Créer apps/web/src/features/sidebar/components/Sidebar.tsx
   - Utiliser Sidebar de @forky/ui/organisms
   - Créer un composant wrapper qui étend Sidebar
   - Contenu :
     * Logo/branding en haut
     * Liste des projets (ProjectList)
     * Bouton "New Project"
     * Bouton "New Node"
     * Section "Quick Actions" (QuickActionsList)
     * Section "Settings" (SystemPromptEditor)
   - Gérer l'état ouvert/fermé via hook useSidebar
   - Animation de transition

3. **Créer le hook useSidebar**
   - Créer apps/web/src/features/sidebar/hooks/useSidebar.ts
   - État : isOpen
   - Méthodes : openSidebar(), closeSidebar(), toggleSidebar()
   - Persistance dans localStorage
   - Gérer l'état responsive (mobile vs desktop)

4. **Créer la structure de feature projects**
   - Créer apps/web/src/features/projects/
   - Créer les dossiers : components/, hooks/, services/, types/

5. **Créer le composant ProjectList**
   - Créer apps/web/src/features/projects/components/ProjectList.tsx
   - Utiliser Button, Badge de @forky/ui
   - Props :
     * projects : Project[]
     * currentProjectId : string | null
     * onSelectProject : callback
     * onCreateProject : callback
     * onDeleteProject : callback
   - Afficher la liste des projets
   - Indiquer le projet actuel
   - Actions par projet : Load, Delete
   - Badge avec nombre de nœuds pour chaque projet
   - Animation de fade-in pour nouveaux projets

6. **Créer le composant NewProjectButton**
   - Créer apps/web/src/features/projects/components/NewProjectButton.tsx
   - Utiliser Button, Modal, FormField de @forky/ui
   - Ouvre une modale pour créer un projet
   - Formulaire :
     * Name (required)
     * Description (optionnel)
   - Boutons : Create, Cancel
   - Validation du formulaire

7. **Créer le composant SystemPromptEditor**
   - Créer apps/web/src/features/projects/components/SystemPromptEditor.tsx
   - Utiliser Input, Button de @forky/ui
   - Props :
     * systemPrompt : string
     * onUpdate : (prompt: string) => void
   - Zone de texte pour éditer le système prompt
   - Aide/tooltip pour expliquer le système prompt
   - Boutons : Save, Reset to Default
   - Compteur de caractères

8. **Créer le composant QuickActionsList**
   - Créer apps/web/src/features/projects/components/QuickActionsList.tsx
   - Utiliser QuickActionButton, Modal de @forky/ui
   - Props :
     * quickActions : QuickAction[]
     * onExecute : (action: QuickAction) => void
     * onAdd : (action: QuickAction) => void
     * onEdit : (action: QuickAction) => void
     * onDelete : (id: string) => void
   - Afficher la liste des quick actions
   - Bouton "Add Quick Action"
   - Menu d'actions par quick action : Execute, Edit, Delete

9. **Créer le composant QuickActionModal**
   - Créer apps/web/src/features/projects/components/QuickActionModal.tsx
   - Utiliser Modal, FormField, Input, Button de @forky/ui
   - Props :
     * isOpen : boolean
     * onClose : callback
     * onSave : (action: QuickAction) => void
     * action : QuickAction | null (pour édition)
   - Formulaire :
     * Label (required)
     * Instruction (required)
   - Boutons : Save, Cancel
   - Validation du formulaire

10. **Créer le hook useProjects**
    - Créer apps/web/src/features/projects/hooks/useProjects.ts
    * État :
      * projects : Project[]
      * currentProject : Project | null
      * isLoading : boolean
      * error : Error | null
    * Méthodes :
      * createProject(name, description)
      * loadProject(id)
      * saveProject(project)
      * deleteProject(id)
      * duplicateProject(id)
      * exportProject(id, format)
      * importProject(data)
    * Persistance dans localStorage
    * Gérer le projet actuel

11. **Créer le hook useQuickActions**
    - Créer apps/web/src/features/projects/hooks/useQuickActions.ts
    * État : quickActions : QuickAction[]
    * Méthodes :
      * addQuickAction(label, instruction)
      * updateQuickAction(id, updates)
      * deleteQuickAction(id)
      * executeQuickAction(id)
    * Persistance dans localStorage (par projet)

12. **Créer le service project-service**
    - Créer apps/web/src/features/projects/services/project-service.ts
    * CRUD sur les projets :
      * createProject(data)
      * getProject(id)
      * getAllProjects()
      * updateProject(id, updates)
      * deleteProject(id)
    * Persistance : localStorage
    * Validation des données
    * Helpers pour l'export/import

13. **Créer le service quick-actions-service**
    - Créer apps/web/src/features/projects/services/quick-actions-service.ts
    * CRUD sur les quick actions
    * Persistance : localStorage (par projet)
    * Helpers pour l'exécution d'actions

14. **Créer les types projects**
    - Définir les types dans apps/web/src/features/projects/types/ :
      * ProjectStatus
      * ProjectMetadata
      * QuickAction
    - Créer l'index types

15. **Créer les utils projects**
    - Créer apps/web/src/features/projects/utils/project-helpers.ts
    * Helpers pour :
      * validateProject(project)
      * sanitizeProject(project)
      * generateProjectId()
      * exportProjectAsJSON(project)
      * exportProjectAsMarkdown(project)
    - Créer l'index utils

16. **Créer les index des features**
    - Créer apps/web/src/features/sidebar/index.ts
    * Créer apps/web/src/features/projects/index.ts
    * Exporter tous les composants, hooks, services, types, utils

17. **Intégrer Sidebar et Projects dans l'app**
    - Mettre à jour apps/web/src/app/page.tsx
    * Importer Sidebar de @/features/sidebar
    * Importer useSidebar, useProjects de @/features/projects
    * Intégrer Sidebar dans AppLayout
    * Gérer l'état du projet actuel
    * Connecter les features (sidebar → projects → canvas/nodes)

18. **Tester les features**
    * Vérifier que la sidebar s'affiche correctement
    * Vérifier que la création de projet fonctionne
    * Vérifier que la sauvegarde de projet fonctionne
    * Vérifier que le chargement de projet fonctionne
    * Vérifier que l'édition de système prompt fonctionne
    * Vérifier que les quick actions fonctionnent
    * Vérifier que l'export de projet fonctionne

Sortie attendue :
- Features sidebar et projects créées
- Composants Sidebar, ProjectList, NewProjectButton créés
- Composants SystemPromptEditor, QuickActionsList, QuickActionModal créés
- Hooks useSidebar, useProjects, useQuickActions créés
- Services project-service, quick-actions-service créés
- Types et utils créés
- Index des features avec exports
- Intégration réussie dans l'application
- Features fonctionnelles avec gestion complète des projets
```

---

## 7. Phase 6 : Validation & Nettoyage

### 🎯 Prompt Agent 10 : Validation Finale & Documentation

**Rôle** : Valider l'architecture complète et créer la documentation

**Prompt :**
```
Tu es un expert en validation et documentation. Ta tâche est de valider l'architecture complète de forky et de créer la documentation.

Contexte :
- Toutes les features créées (canvas, nodes, sidebar, projects)
- Package UI complet avec atome, molecules, organismes, templates
- Packages partagés (shared, config, contracts)
- Objectif : Valider que tout fonctionne et créer la documentation

Tâches à accomplir :

1. **Valider l'application complète**
   - Exécuter : pnpm dev
   - Ouvrir http://localhost:3000
   - Tester toutes les fonctionnalités :
     * Créer un nouveau projet
     * Créer des nœuds
     * Connecter des nœuds
     * Générer des réponses LLM
     * Éditer des prompts
     * Supprimer des nœuds
     * Sauvegarder le projet
     * Charger un projet
     * Créer des quick actions
     * Utiliser le système prompt
   - Vérifier qu'il n'y a pas d'erreurs dans la console

2. **Valider le package UI**
   - Exécuter : pnpm --filter @forky/ui run dev
   - Ouvrir http://localhost:6006 (Storybook)
   - Vérifier que toutes les stories s'affichent
   - Vérifier que les composants sont bien stylés
   - Vérifier que les animations fonctionnent

3. **Vérifier les types**
   - Exécuter : pnpm type-check
   - Corriger toutes les erreurs TypeScript
   - S'assurer qu'il n'y a pas d'erreurs de type

4. **Vérifier le linting**
   - Exécuter : pnpm lint
   - Corriger tous les avertissements

5. **Créer le README principal**
   - Mettre à jour /Users/cgarrot/zob/forky/README.md
   - Inclure :
     * Description de forky
     * Screenshot/démonstration
     * Installation
     * Commandes de développement
     * Structure de l'architecture
     * Technologies utilisées
     * Roadmap

6. **Créer la documentation technique**
   - Créer docs/GETTING_STARTED.md
     * Comment installer les dépendances
     * Comment lancer l'application
     * Structure du monorepo
     * Commandes utiles
   - Créer docs/ARCHITECTURE.md
     * Vue d'ensemble de l'architecture
     * Packages partagés
     * Features
     * Flux de données
   - Créer docs/FEATURE_GUIDE.md
     * Comment créer une nouvelle feature
     * Structure d'une feature
     * Conventions à respecter

7. **Créer le guide de contribution**
   - Créer CONTRIBUTING.md
   - Comment configurer l'environnement de développement
   * Comment tester les changements
   * Convention de commits
   * Processus de review

8. **Mettre à jour les docs existants**
   - Mettre à jour docs/ARCHITECTURE_HYBRID.md avec les spécificités de forky
   - Mettre à jour docs/DESIGN_SYSTEM.md avec les composants spécifiques
   - Mettre à jour docs/FEATURE_STRUCTURE.md avec les features implémentées

9. **Créer le document de release**
   - Créer CHANGELOG.md
   * Documenter les changements
   * Version actuelle
   * Nouvelles fonctionnalités
   * Breaking changes
   * Prochaines étapes

10. **Git commit**
    - Committer tous les changements
    - Message : "feat: implement forky with hybrid architecture v1.0"
    - Pousser les changements

Sortie attendue :
- Application fonctionnelle et testée
- Package UI validé avec Storybook
- Pas d'erreurs TypeScript
- Pas d'erreurs linting
- Documentation complète créée
- README mis à jour
- Git commit avec message clair
- Prêt pour le déploiement
```

---

## 📚 Références

### Documents d'Architecture
- `forky/docs/ARCHITECTURE_HYBRID.md` - Architecture hybride complète
- `forky/docs/DESIGN_SYSTEM.md` - Design system détaillé
- `forky/docs/FRONTEND_ARCHITECTURE.md` - Architecture frontend
- `forky/docs/BACKEND_ARCHITECTURE.md` - Architecture backend
- `forky/docs/FEATURE_STRUCTURE.md` - Structure des features
- `forky/docs/MIGRATION_GUIDE.md` - Guide de migration
- `forky/docs/CODING_STANDARDS.md` - Standards de code

### Documentation forky
- `forky/docs/` - Documentation complète du projet

### Technologies
- Next.js 15.0.0
- React 19.0.0
- TypeScript 5.0.0
- pnpm 8.0.0+
- Turborepo 2.0.0+
- Tailwind CSS 3.4.0
- Zustand 5.0.0
- @xyflow/react 12.0.0
- Storybook 8.0.0
- NestJS 11+ (backend futur)

---

## 🚀 Roadmap Future (non inclus dans ce plan)

Ces fonctionnalités ne sont PAS incluses dans ce plan d'implémentation, mais sont prévues pour le futur :

### Phase 7 : Backend (Futur)
- Création du backend NestJS dans apps/api
- Authentification avec JWT
- API REST pour projects, nodes, edges
- WebSocket pour collaboration temps réel
- Base de données PostgreSQL avec Prisma
- Cache Redis
- Testing backend

### Phase 8 : Collaboration (Futur)
- Mode multi-user
- Curseurs en temps réel
- Indicateur de présence utilisateurs
- Synchronisation des modifications
- Permissions par rôle

### Phase 9 : Multimodal (Futur)
- Support des images
- Support des vidéos
- Support des documents (PDF)
- Support des liens avec preview
- Galerie multimédia

### Phase 10 : Voice (Futur)
- Voice-to-text (dictée)
- Text-to-voice (synthèse)
- Commandes vocales
- Enregistrement audio

### Phase 11 : Node Types Spécialisés (Futur)
- Plan node (outline)
- Flashcard node
- Presentation node
- Checklist node
- Reference node
- Code snippet node

### Phase 12 : Project Mode (Futur)
- Mode projet avec progression
- Phases et jalons
- Dashboard de projet
- Agents IA autonomes

### Phase 13 : Agents IA (Futur)
- Orchestrateur d'agents
- Agents spécialisés (Planner, Researcher, Writer, Coder, Architect, Analyst)
- Tâches autonomes
- Intégration Cursor Agent API

---

**Plan d'implémentation créé pour le projet forky v1.0**
**Date de création : 2026-01-05**
**Version : 1.0**
**Architecture : Hybride (Atomic + Feature-Based)**
**Technologie : Monorepo pnpm + Turborepo**
