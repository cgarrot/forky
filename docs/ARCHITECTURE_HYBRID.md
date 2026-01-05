# NonLinear - Architecture Hybride (Atomic + Feature-Based)

> **Architecture scalable pour le projet NonLinear avec ambitions multi-user, multimodal et agents IA**

---

## 📋 Table des Matières

1. [Vision Globale](#1-vision-globale)
2. [Pourquoi Architecture Hybride ?](#2-pourquoi-architecture-hybride)
3. [Vue d'Ensemble](#3-vue-densemble)
4. [Design System (Atomic)](#4-design-system-atomic)
5. [Features (Feature-Based)](#5-features-feature-based)
6. [Packages Partagés](#6-packages-partagés)
7. [Monorepo Structure](#7-monorepo-structure)
8. [Principes Fondamentaux](#8-principes-fondamentaux)
9. [Avantages](#9-avantages)
10. [Roadmap](#10-roadmap)

---

## 1. Vision Globale

NonLinear vise à devenir une plateforme d'exploration non-linéaire des idées avec des ambitions majeures :

- ✅ **Multi-user en temps réel** : Collaboration sur le même board
- ✅ **Contenu multimodal** : Images, vidéos, liens, documents
- ✅ **Interactions vocales** : Voice-to-text et text-to-voice
- ✅ **Nœuds spécialisés** : Plan, Flashcard, Présentation, Check-list, etc.
- ✅ **Mode projet** : Accompagnement vers un résultat final
- ✅ **Agents IA autonomes** : Orchestration de tâches complexes
- ✅ **Mode focus** : Sélection et surlignage de texte

Pour supporter ces ambitions, une architecture **hybride** combinant :

- **Atomic Design** → Pour le design system (cohérence, réutilisabilité)
- **Feature-Based** → Pour la logique métier (cohésion, scalabilité)

---

## 2. Pourquoi Architecture Hybride ?

### ❌ Architecture Purement Atomic

```
packages/ui/
├── atoms/
│   ├── Button/
│   ├── Input/
│   └── ...
├── molecules/
│   └── ...
└── organisms/
    └── ...
```

**Problèmes pour NonLinear :**
- Trop granulaire pour la logique complexe (graph algorithms, cascade, etc.)
- Difficile à maintenir la cohésion métier
- Les composants "intelligents" (CustomNode, Canvas) ne rentrent pas bien
- Pas adapté pour les features complexes (multi-user, agents, etc.)

### ❌ Architecture Purement Feature-Based

```
src/features/
├── canvas/
├── nodes/
└── sidebar/
```

**Problèmes pour NonLinear :**
- Duplication UI entre features (chaque feature recrée ses boutons, inputs)
- Difficile à maintenir un design system cohérent
- Pas de réutilisation optimisée des composants UI

### ✅ Architecture Hybride (Recommandée)

```
packages/ui/              # Design System (Atomic)
├── atoms/              # Composants primitifs
├── molecules/           # Composants composés simples
├── organisms/          # Composants complexes UI
└── templates/          # Layouts

apps/web/src/features/    # Logique Métier (Feature-Based)
├── canvas/
├── nodes/
├── collaboration/
├── multimodal/
└── voice/
```

**Avantages :**
- ✅ Design system cohérent via `packages/ui`
- ✅ Logique métier organisée par feature
- ✅ Réutilisation maximale des composants UI
- ✅ Scalabilité pour ajouter de nouvelles features
- ✅ Testabilité à tous les niveaux

---

## 3. Vue d'Ensemble

```
next-gen-chat/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── (app)/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── api/              # Route Handlers
│   │   │   ├── features/             # 🎯 FEATURE MODULES
│   │   │   │   ├── canvas/
│   │   │   │   ├── nodes/
│   │   │   │   ├── sidebar/
│   │   │   │   ├── projects/
│   │   │   │   ├── collaboration/     # Multi-user
│   │   │   │   ├── multimodal/        # Multimodal
│   │   │   │   ├── voice/            # Interactions vocales
│   │   │   │   ├── node-types/       # Nœuds spécialisés
│   │   │   │   ├── project-mode/      # Mode projet
│   │   │   │   └── agents/           # Agents IA
│   │   │   ├── components/           # Composants app-specific
│   │   │   ├── lib/
│   │   │   │   ├── store/
│   │   │   │   ├── api/
│   │   │   │   └── utils/
│   │   │   ├── hooks/               # Hooks partagés
│   │   │   ├── config/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                          # Backend (futur)
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── models/
│       └── package.json
│
├── packages/                          # Shared Packages
│   ├── ui/                          # 🎨 DESIGN SYSTEM
│   │   ├── src/
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   └── templates/
│   │   ├── package.json
│   │   └── .storybook/
│   │
│   ├── shared/                       # 🔄 SHARED CODE
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   ├── utils/
│   │   │   └── graph/
│   │   └── package.json
│   │
│   └── config/                      # ⚙️ CONFIG SHARED
│       ├── src/
│       │   ├── env.ts
│       │   ├── llm.ts
│       │   └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json (root)
├── turbo.json (optionnel)
└── tsconfig.base.json
```

---

## 4. Design System (Atomic)

### Structure `packages/ui`

```
packages/ui/
├── src/
│   ├── atoms/                        # Composants primitifs
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Badge/
│   │   ├── Icon/
│   │   ├── Spinner/
│   │   ├── Modal/
│   │   ├── Toast/
│   │   ├── Tooltip/
│   │   ├── Dropdown/
│   │   ├── Switch/
│   │   ├── Checkbox/
│   │   ├── ProgressBar/
│   │   └── index.ts
│   │
│   ├── molecules/                     # Composants composés simples
│   │   ├── FormField/
│   │   ├── SearchBar/
│   │   ├── QuickActionButton/
│   │   ├── NodeHeader/
│   │   ├── NodeMenu/
│   │   ├── ConfirmationDialog/
│   │   ├── Dropzone/
│   │   ├── MediaPreview/
│   │   └── index.ts
│   │
│   ├── organisms/                    # Composants complexes UI
│   │   ├── Sidebar/
│   │   ├── Toolbar/
│   │   ├── ToastContainer/
│   │   ├── CanvasControls/
│   │   ├── ProjectList/
│   │   ├── QuickActionsList/
│   │   └── index.ts
│   │
│   ├── templates/                    # Layouts
│   │   ├── AppLayout/
│   │   ├── ProjectLayout/
│   │   └── index.ts
│   │
│   └── styles/                       # Styles partagés
│       ├── variables.css
│       ├── mixins.css
│       └── index.css
│
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .eslintrc.cjs
```

### Exemple d'Atome : Button

```typescript
// packages/ui/src/atoms/Button/Button.tsx
import { cn } from '@nonlinear/shared/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref
) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'hover:bg-gray-100': variant === 'ghost',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          'disabled:opacity-50 disabled:cursor-not-allowed': disabled || loading,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

### Exemple de Molécule : NodeHeader

```typescript
// packages/ui/src/molecules/NodeHeader/NodeHeader.tsx
import { Button } from '@nonlinear/ui/atoms'
import { Menu, MoreVertical, Trash2, Edit3 } from 'lucide-react'

export interface NodeHeaderProps {
  title?: string
  status?: 'idle' | 'loading' | 'error' | 'stale'
  onEdit?: () => void
  onDelete?: () => void
}

export const NodeHeader = ({ title, status, onEdit, onDelete }: NodeHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center gap-2">
        {status === 'loading' && <span className="animate-pulse">Génération...</span>}
        {status === 'error' && <span className="text-red-600">Erreur</span>}
        {status === 'stale' && <span className="text-orange-600">Obsolète</span>}
        {title && <span className="font-medium">{title}</span>}
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} icon={<Edit3 className="h-4 w-4" />} />
        <Button variant="ghost" size="sm" onClick={onDelete} icon={<Trash2 className="h-4 w-4" />} />
      </div>
    </div>
  )
}
```

---

## 5. Features (Feature-Based)

### Structure d'une Feature Module

Chaque feature suit cette structure cohérente :

```
src/features/[feature-name]/
├── components/                      # Composants spécifiques à la feature
│   ├── [ComponentName].tsx
│   └── index.ts
├── hooks/                          # Hooks custom pour la feature
│   ├── use[HookName].ts
│   └── index.ts
├── services/                        # Appels API/services externes
│   ├── [ServiceName].ts
│   └── index.ts
├── actions/                         # Server Actions (si applicable)
│   ├── [actionName].ts
│   └── index.ts
├── types/                          # Types spécifiques à la feature
│   ├── [typeName].types.ts
│   └── index.ts
├── utils/                          # Helpers spécifiques
│   ├── [utilName].ts
│   └── index.ts
├── constants/                       # Constantes spécifiques
│   └── index.ts
└── index.ts                        # API publique de la feature
```

### List des Features Principales

#### 1. **canvas/** - Canvas & Interactions
- Composants : Canvas, CanvasControls, Minimap
- Hooks : `useCanvasState`, `useViewport`, `useNodeInteraction`
- Services : React Flow wrapper, drag & drop
- Algorithmes : Pan, zoom, selection

#### 2. **nodes/** - Gestion des Nœuds
- Composants : CustomNode, NodePrompt, NodeResponse
- Hooks : `useNodeGeneration`, `useNodeActions`, `useNodeSelection`
- Services : Génération LLM, cascade updates
- Types : Node, NodeStatus, NodeMetadata

#### 3. **sidebar/** - Barre latérale
- Composants : Sidebar, NewNodeButton, ProjectList, QuickActionsList
- Hooks : `useSidebar`, `useProjects`
- Services : Project CRUD

#### 4. **collaboration/** - Multi-user (futur)
- Composants : PresenceIndicator, CursorTracker, UserAvatar
- Hooks : `useRealtime`, `usePresence`, `useCollaborativeState`
- Services : WebSocket client, Yjs adapter

#### 5. **multimodal/** - Contenu multimodal (futur)
- Composants : ImageUpload, VideoEmbed, DocumentPreview, LinkPreview
- Hooks : `useMediaUpload`, `useMediaStorage`
- Services : Storage (S3, Cloudinary), media processing

#### 6. **voice/** - Interactions vocales (futur)
- Composants : VoiceInput, TTSPlayer, VoiceControls
- Hooks : `useVoiceRecognition`, `useTTS`, `useVoiceCommands`
- Services : Web Speech API, Speech-to-text provider

#### 7. **node-types/** - Nœuds spécialisés (futur)
- Composants :
  - PlanNode (outline hiérarchique)
  - FlashcardNode (spaced repetition)
  - PresentationNode (slides)
  - CheckListNode (to-do)
  - ReferenceNode (citations)
  - CodeSnippetNode
  - ResearchNode (web search)
- Hooks : Spécifiques à chaque type
- Services : Logique métier par type

#### 8. **project-mode/** - Mode projet (futur)
- Composants : ProgressTracker, PhaseStepper, ProjectDashboard
- Hooks : `useProjectProgress`, `useAgentOrchestration`
- Services : Agent coordination, milestone tracking

#### 9. **agents/** - Agents IA autonomes (futur)
- Composants : AgentStatusPanel, AgentLogs, AgentConfig
- Hooks : `useAgents`, `useAgentOrchestrator`
- Services : Agent execution, cursor-agent integration

### Exemple : Feature `nodes`

```typescript
// src/features/nodes/components/CustomNode.tsx
'use client'

import { useNodeGeneration } from '../hooks/useNodeGeneration'
import { Button, Badge, Spinner } from '@nonlinear/ui'
import { NodeHeader } from '@nonlinear/ui/molecules'
import { NodePrompt } from './NodePrompt'
import { NodeResponse } from './NodeResponse'

export const CustomNode = ({ id, data }) => {
  const { generate, isGenerating, error } = useNodeGeneration(id)

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 min-w-[300px]">
      <NodeHeader
        title={data.summary || data.prompt}
        status={data.status}
        onEdit={() => {/* edit prompt */}
        onDelete={() => {/* delete node */}}
      />

      <NodePrompt prompt={data.prompt} />

      <div className="p-4 border-t">
        {isGenerating && <Spinner />}
        {error && <Badge variant="danger">{error}</Badge>}
        {data.response && <NodeResponse response={data.response} />}
        {!isGenerating && !data.response && (
          <Button onClick={generate} loading={isGenerating}>
            Générer
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## 6. Packages Partagés

### packages/ui - Design System
**Responsabilité :** Fournir tous les composants UI réutilisables
**Dépendances :**
- `@nonlinear/shared/utils` → Utilitaires partagés
- `lucide-react` → Icônes
- `clsx`, `tailwind-merge` → Class utilities
- `framer-motion` → Animations

### packages/shared - Code Partagé
**Responsabilité :** Types, constants, utilitaires et algorithmes partagés
**Sous-modules :**
- `types/` → Types TypeScript partagés
- `constants/` → Constantes d'application
- `utils/` → Utilitaires généraux
- `graph/` → Algorithmes de graphe (buildContext, detectCycle, cascade)
- `validation/` → Zod schemas

### packages/config - Configuration Partagée
**Responsabilité :** Configuration centrale de l'application
**Contenu :**
- `env.ts` → Variables d'environnement (validées avec Zod)
- `llm.ts` → Configuration des modèles LLM
- `constants.ts` → Constantes globales

---

## 7. Monorepo Structure

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "next-gen-chat-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "turbo run format",
    "clean": "turbo run clean && rm -rf node_modules",
    "ui:dev": "pnpm --filter @nonlinear/ui run dev",
    "ui:build": "pnpm --filter @nonlinear/ui run build",
    "web:dev": "pnpm --filter @nonlinear/web run dev",
    "web:build": "pnpm --filter @nonlinear/web run build"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0",
    "eslint": "^9.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### packages/ui/package.json

```json
{
  "name": "@nonlinear/ui",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./atoms/*": {
      "types": "./dist/atoms/*/index.d.ts",
      "import": "./dist/atoms/*/index.js"
    },
    "./molecules/*": {
      "types": "./dist/molecules/*/index.d.ts",
      "import": "./dist/molecules/*/index.js"
    },
    "./organisms/*": {
      "types": "./dist/organisms/*/index.d.ts",
      "import": "./dist/organisms/*/index.js"
    },
    "./templates/*": {
      "types": "./dist/templates/*/index.d.ts",
      "import": "./dist/templates/*/index.js"
    }
  },
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "tsc && vite build",
    "test": "vitest",
    "lint": "eslint src/",
    "storybook": "storybook build"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@nonlinear/shared/utils": "workspace:*",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@storybook/react": "^8.0.0",
    "@storybook/react-vite": "^8.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

### apps/web/package.json

```json
{
  "name": "@nonlinear/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@nonlinear/ui": "workspace:*",
    "@nonlinear/shared": "workspace:*",
    "@nonlinear/config": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@xyflow/react": "^12.0.0",
    "zustand": "^5.0.0",
    "immer": "^10.0.0",
    "react-markdown": "^9.0.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "eslint": "^9.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 8. Principes Fondamentaux

### 🎨 1. Séparation des Préoccupations

- **UI Layer (`packages/ui`)** → Pure présentation, sans logique métier
- **Feature Layer (`src/features`)** → Logique métier + composants spécifiques
- **Shared Layer (`packages/shared`)** → Types, utilitaires, algorithmes
- **Config Layer (`packages/config`)** → Configuration centrale

### 🔄 2. Réutilisation Maximale

- Tous les composants UI doivent venir de `@nonlinear/ui`
- Utiliser des atoms/molecules/organisms du design system
- Éviter la duplication de code UI

### 📦 3. Cohésion de Feature

- Toute la logique métier liée à X est ensemble dans `src/features/x/`
- Composants, hooks, services, types co-localisés
- API publique via `index.ts`

### 🔌 4. Faible Couplage

- Features communiquent via props, hooks, ou état global
- Pas de dépendances directes entre features
- Utiliser `@nonlinear/shared` pour les types communs

### ✅ 5. Type Safety

- TypeScript strict partout
- Zod pour validation des inputs (server + client)
- Environment variables validées

### 🧪 6. Testabilité

- Chaque package/feature peut être testé indépendamment
- Composants UI testés avec Storybook
- Hooks/services testés unitairement

### 🚀 7. Scalabilité

- Ajouter une nouvelle feature = nouveau dossier dans `src/features/`
- Ajouter un composant UI = nouveau dossier dans `packages/ui/src/`
- Préparé pour multi-user, multimodal, agents

---

## 9. Avantages

| Aspect | Avantage Concret |
|---------|------------------|
| **Maintenabilité** | Tout le code lié à une fonctionnalité est au même endroit |
| **Scalabilité** | Ajouter des features sans toucher au code existant |
| **Réutilisabilité** | Design system partagé via `@nonlinear/ui` |
| **Cohérence UI** | Toutes les features utilisent les mêmes composants |
| **Testabilité** | Tests isolés par package/feature |
| **Collaboration** | Frontend/backend séparés dans le monorepo |
| **Futur-proof** | Structure prête pour multi-user, multimodal, agents |
| **Onboarding** | Nouveaux développeurs trouvent rapidement leur chemin |
| **Performance** | Turborepo optimise le build/cache |
| **Code Quality** | Linting, formatting, tests partagés via root |

---

## 10. Roadmap

### Phase 1 : Fondations (Semaines 1-2)
- ✅ Créer la structure monorepo
- ✅ Configurer pnpm workspace
- ✅ Créer `packages/ui` avec atomes de base
- ✅ Créer `packages/shared` avec types/utilitaires
- ✅ Créer `packages/config` avec validation env

### Phase 2 : Design System (Semaines 3-4)
- ✅ Extraire tous les atomes existants
- ✅ Créer les molecules de base
- ✅ Configurer Storybook pour `@nonlinear/ui`
- ✅ Documenter les composants

### Phase 3 : Migration Features (Semaines 5-8)
- ✅ Migrer `canvas` en feature
- ✅ Migrer `nodes` en feature
- ✅ Migrer `sidebar` en feature
- ✅ Migrer `projects` en feature
- ✅ Mettre à jour tous les imports

### Phase 4 : Nettoyage & Optimisation (Semaines 9-10)
- ✅ Supprimer l'ancienne structure
- ✅ Configurer path aliases
- ✅ Tests end-to-end
- ✅ Performance audit

### Phase 5 : Features Futures (Semaines 11+)
- 🔄 Multi-user (collaboration)
- 🔄 Multimodal (images, vidéos)
- 🔄 Voice interactions
- 🔄 Node types spécialisés
- 🔄 Project mode
- 🔄 Agents IA

---

## 📚 Documentation Connexe

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guide de migration étape par étape
- [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) - Structure détaillée des features
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Documentation du design system
- [MONOREPO_SETUP.md](./MONOREPO_SETUP.md) - Guide de setup pnpm workspace
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - Standards de code

---

**Document créé pour le projet NonLinear - Architecture Hybride v1.0**
**Dernière mise à jour : 2026-01-03**
