# Structure Détaillée des Features

> **Documentation complète de la structure des features modules dans l'architecture hybride**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Structure Standard d'une Feature](#2-structure-standard-dune-feature)
3. [Liste Complète des Features](#3-liste-complète-des-features)
4. [Détail par Feature](#4-détail-par-feature)
5. [Best Practices](#5-best-practices)
6. [Exemples d'Implémentation](#6-exemples-dimplémentation)

---

## 1. Introduction

Dans l'architecture hybride, une **feature** est un module autonome contenant toute la logique, composants et services liés à une fonctionnalité spécifique de l'application.

### Objectifs

- ✅ **Cohésion** : Tout le code lié à X est ensemble
- ✅ **Encapsulation** : API publique claire via `index.ts`
- ✅ **Testabilité** : Facile à tester indépendamment
- ✅ **Scalabilité** : Facile à ajouter/supprimer des features
- ✅ **Maintenabilité** : Localisation rapide du code

### Principes

1. **Co-location** : Composants, hooks, services au même endroit
2. **Encapsulation** : Export publique via `index.ts`
3. **Pas de dépendances inter-features** : Communiquer via état global ou props
4. **Réutilisation UI** : Utiliser `@nonlinear/ui` pour tout

---

## 2. Structure Standard d'une Feature

```
src/features/[feature-name]/
├── components/                      # Composants UI spécifiques à la feature
│   ├── [ComponentName].tsx      # Composant principal
│   ├── [ComponentName].test.tsx  # Tests du composant
│   └── index.ts                  # Exports du module
│
├── hooks/                          # Hooks React spécifiques
│   ├── use[HookName].ts         # Hook implementation
│   ├── use[HookName].test.ts   # Tests du hook
│   └── index.ts
│
├── services/                        # Appels API/services externes
│   ├── [ServiceName].ts         # Service implementation
│   ├── [ServiceName].test.ts   # Tests du service
│   └── index.ts
│
├── actions/                         # Server Actions (si applicable)
│   ├── [actionName].ts         # Action implementation
│   └── index.ts
│
├── types/                          # Types TypeScript spécifiques
│   ├── [TypeName].types.ts    # Type definitions
│   └── index.ts
│
├── utils/                          # Helpers spécifiques
│   ├── [utilName].ts         # Helper function
│   ├── [utilName].test.ts   # Tests du helper
│   └── index.ts
│
├── constants/                       # Constantes spécifiques
│   └── index.ts
│
├── schemas/                         # Zod validation schemas
│   ├── [SchemaName].schema.ts  # Schema definition
│   └── index.ts
│
└── index.ts                        # 🎯 API PUBLIQUE de la feature
```

### Conventions de Nommage

| Type | Convention | Exemple |
|-------|-------------|----------|
| Composant | PascalCase | `CustomNode.tsx` |
| Hook | camelCase avec préfixe `use` | `useNodeGeneration.ts` |
| Service | camelCase | `llmService.ts` |
| Type/Interface | PascalCase + suffixe | `NodeProps.types.ts` |
| Utilitaire | camelCase | `formatDate.ts` |
| Constante | UPPER_SNAKE_CASE | `MAX_TOKENS` |

---

## 3. Liste Complète des Features

### 3.1 Canvas Feature

**Responsabilité :** Canvas infini, pan, zoom, interactions avec React Flow

```
features/canvas/
├── components/
│   ├── Canvas.tsx                  # Wrapper React Flow
│   ├── CanvasControls.tsx           # Contrôles zoom/pan
│   ├── Minimap.tsx                # Minim carte du graphe
│   ├── GridBackground.tsx          # Grille de fond
│   └── index.ts
│
├── hooks/
│   ├── useCanvasState.ts           # État global du canvas
│   ├── useViewport.ts              # Gestion viewport (x, y, zoom)
│   ├── useNodeInteraction.ts       # Interactions nœuds (drag, click)
│   ├── useKeyboardShortcuts.ts     # Raccourcis clavier
│   └── index.ts
│
├── services/
│   ├── react-flow-wrapper.ts      # Initialisation/config React Flow
│   └── index.ts
│
├── types/
│   ├── canvas.types.ts           # Types spécifiques canvas
│   └── index.ts
│
├── utils/
│   ├── viewport-helpers.ts       # Helpers viewport
│   └── index.ts
│
└── index.ts
```

**Clé d'export publique :**
```typescript
// features/canvas/index.ts
export * from './components'
export * from './hooks'
export { CanvasProvider } from './services/react-flow-wrapper'
```

---

### 3.2 Nodes Feature

**Responsabilité :** Gestion des nœuds, génération LLM, cascade updates

```
features/nodes/
├── components/
│   ├── CustomNode.tsx              # Nœud principal
│   ├── NodePrompt.tsx             # Zone prompt éditable
│   ├── NodeResponse.tsx            # Zone réponse Markdown
│   ├── NodeHeader.tsx              # Header avec status/actions
│   ├── NodeFooter.tsx              # Footer avec boutons d'action
│   ├── NodeFocusOverlay.tsx       # Overlay focus mode
│   └── index.ts
│
├── hooks/
│   ├── useNodeGeneration.ts        # Génération LLM avec streaming
│   ├── useNodeActions.ts          # Actions sur nœud (delete, edit)
│   ├── useNodeSelection.ts        # Sélection de nœuds
│   ├── useNodeState.ts           # État local d'un nœud
│   └── index.ts
│
├── services/
│   ├── llm-service.ts            # Appel API LLM
│   ├── cascade-service.ts         # Logique cascade update
│   └── index.ts
│
├── actions/
│   ├── generate-node.ts          # Server action pour génération
│   ├── update-node.ts           # Server action pour update
│   └── index.ts
│
├── types/
│   ├── node.types.ts            # Node, NodeStatus, etc.
│   ├── generation.types.ts       # GenerationRequest, GenerationResponse
│   └── index.ts
│
├── utils/
│   ├── node-helpers.ts         # Helpers nœuds (formatage, validation)
│   └── index.ts
│
└── index.ts
```

---

### 3.3 Sidebar Feature

**Responsabilité :** Barre latérale, navigation, gestion projets

```
features/sidebar/
├── components/
│   ├── Sidebar.tsx                # Container sidebar
│   ├── NewNodeButton.tsx         # Bouton nouveau nœud
│   ├── NewProjectButton.tsx     # Bouton nouveau projet
│   ├── SystemPromptEditor.tsx   # Éditeur system prompt
│   ├── QuickActionsList.tsx       # Liste des macros
│   ├── QuickActionModal.tsx      # Modale création macro
│   ├── ProjectList.tsx           # Liste des projets
│   └── index.ts
│
├── hooks/
│   ├── useSidebar.ts             # État ouvert/fermé
│   ├── useProjects.ts            # Gestion projets
│   ├── useQuickActions.ts       # Gestion macros
│   └── index.ts
│
├── services/
│   ├── project-service.ts        # CRUD projets
│   ├── quick-actions-service.ts  # CRUD macros
│   └── index.ts
│
├── actions/
│   ├── save-project.ts          # Server action sauvegarde
│   ├── load-project.ts          # Server action chargement
│   ├── delete-project.ts        # Server action suppression
│   └── index.ts
│
├── types/
│   ├── project.types.ts          # Project interface
│   ├── quick-action.types.ts    # QuickAction interface
│   └── index.ts
│
└── index.ts
```

---

### 3.4 Collaboration Feature (Futur)

**Responsabilité :** Multi-user en temps réel, présence, curseurs

```
features/collaboration/
├── components/
│   ├── PresenceIndicator.tsx       # Indicateur utilisateurs connectés
│   ├── CursorTracker.tsx          # Curseurs en temps réel
│   ├── UserAvatar.tsx            # Avatar utilisateur
│   ├── UserCursor.tsx            # Curseur utilisateur
│   ├── CollaborationPanel.tsx      # Panel collaboratif
│   └── index.ts
│
├── hooks/
│   ├── useRealtime.ts            # WebSocket/realtime connection
│   ├── usePresence.ts            # État présence utilisateurs
│   ├── useCollaborativeState.ts  # État partagé
│   ├── useCursors.ts            # Gestion curseurs distants
│   └── index.ts
│
├── services/
│   ├── websocket-service.ts       # WebSocket client
│   ├── yjs-service.ts            # Yjs CRDT adapter
│   ├── presence-service.ts        # Service présence
│   └── index.ts
│
├── types/
│   ├── presence.types.ts         # Presence, Cursor, UserPresence
│   ├── collaboration.types.ts    # CollaborationState
│   └── index.ts
│
└── index.ts
```

---

### 3.5 Multimodal Feature (Futur)

**Responsabilité :** Contenu multimodal : images, vidéos, liens, documents

```
features/multimodal/
├── components/
│   ├── ImageUpload.tsx           # Upload d'images
│   ├── VideoEmbed.tsx            # Embed vidéos (YouTube, Vimeo)
│   ├── DocumentPreview.tsx       # Aperçu documents (PDF, DOCX)
│   ├── LinkPreview.tsx           # Prévisualisation liens
│   ├── MediaGallery.tsx          # Galerie médias du projet
│   ├── MediaUploader.tsx         # Uploader multimodal
│   └── index.ts
│
├── hooks/
│   ├── useMediaUpload.ts          # Upload images/vidéos
│   ├── useMediaStorage.ts        # Storage (S3, Cloudinary)
│   ├── useDocumentProcessing.ts   # Extraction texte documents
│   └── index.ts
│
├── services/
│   ├── storage-service.ts        # Service stockage (S3, etc.)
│   ├── image-service.ts          # Traitement images (redimension, crop)
│   ├── video-service.ts          # Traitement vidéos (frames, transcode)
│   ├── document-service.ts       # Traitement documents
│   └── index.ts
│
├── types/
│   ├── media.types.ts           # Media, MediaType, MediaMetadata
│   ├── upload.types.ts          # UploadProgress, UploadError
│   └── index.ts
│
└── index.ts
```

---

### 3.6 Voice Feature (Futur)

**Responsabilité :** Interactions vocales : voice-to-text, text-to-voice

```
features/voice/
├── components/
│   ├── VoiceInput.tsx            # Input vocal (mic)
│   ├── TTSPlayer.tsx            # Player text-to-speech
│   ├── VoiceControls.tsx         # Contrôles vocaux
│   ├── VoiceIndicator.tsx        # Indicateur d'enregistrement
│   └── index.ts
│
├── hooks/
│   ├── useVoiceRecognition.ts    # Web Speech API (STT)
│   ├── useTTS.ts                # Text-to-Speech
│   ├── useVoiceCommands.ts       # Commandes vocales
│   └── index.ts
│
├── services/
│   ├── speech-service.ts         # Web Speech API wrapper
│   ├── voice-to-text.ts         # STT provider
│   ├── text-to-voice.ts         # TTS provider
│   └── index.ts
│
├── types/
│   ├── voice.types.ts           # VoiceCommand, VoiceState
│   └── index.ts
│
└── index.ts
```

---

### 3.7 Node Types Feature (Futur)

**Responsabilité :** Nœuds spécialisés avec fonctionnalités spécifiques

```
features/node-types/
├── components/
│   ├── PlanNode.tsx              # Nœud plan (outline)
│   ├── FlashcardNode.tsx          # Nœud flashcard
│   ├── PresentationNode.tsx        # Nœud présentation
│   ├── CheckListNode.tsx          # Nœud to-do
│   ├── ReferenceNode.tsx          # Nœud citation
│   ├── CodeSnippetNode.tsx        # Nœud code
│   ├── TemplateNode.tsx           # Nœud template
│   ├── ObjectiveNode.tsx          # Nœud objectif
│   ├── NoteNode.tsx              # Nœud note rapide
│   ├── ResearchNode.tsx           # Nœud recherche web
│   └── index.ts
│
├── hooks/
│   ├── useSpacedRepetition.ts    # Flashcard spaced repetition
│   ├── usePresentation.ts         # Presentation logic
│   ├── useChecklist.ts           # Checklist logic
│   └── index.ts
│
├── services/
│   ├── spaced-repetition-service.ts # Spaced repetition algo
│   └── index.ts
│
├── types/
│   ├── plan.types.ts            # Plan structure
│   ├── flashcard.types.ts        # Flashcard, CardState
│   ├── presentation.types.ts     # Presentation, Slide
│   └── index.ts
│
└── index.ts
```

---

### 3.8 Project Mode Feature (Futur)

**Responsabilité :** Mode projet avec progression, phases, agents IA

```
features/project-mode/
├── components/
│   ├── ProgressTracker.tsx       # Barre de progression
│   ├── PhaseStepper.tsx          # Stepper phases
│   ├── ProjectDashboard.tsx       # Dashboard projet
│   ├── MilestoneCard.tsx         # Carte milestone
│   ├── AgentPanel.tsx            # Panel agents IA
│   ├── AgentLogs.tsx             # Logs agents
│   └── index.ts
│
├── hooks/
│   ├── useProjectProgress.ts      # Gestion progression
│   ├── useAgentOrchestration.ts   # Orchestration agents
│   ├── useMilestones.ts          # Gestion milestones
│   └── index.ts
│
├── services/
│   ├── agent-orchestrator.ts     # Coordination agents
│   ├── milestone-service.ts      # Milestones tracking
│   ├── project-tracker.ts       # Progress tracking
│   └── index.ts
│
├── types/
│   ├── project-mode.types.ts     # ProjectMode, Phase, Milestone
│   ├── agent.types.ts            # Agent, AgentTask, AgentStatus
│   └── index.ts
│
└── index.ts
```

---

### 3.9 Agents Feature (Futur)

**Responsabilité :** Agents IA autonomes et orchestration

```
features/agents/
├── components/
│   ├── AgentStatusPanel.tsx      # Status des agents
│   ├── AgentConfig.tsx            # Configuration agents
│   ├── AgentTaskList.tsx         # Liste tâches agents
│   ├── AgentControlPanel.tsx      # Contrôle agents (start, stop)
│   └── index.ts
│
├── hooks/
│   ├── useAgents.ts             # Gestion agents
│   ├── useAgentOrchestrator.ts   # Orchestrateur
│   ├── useAgentTasks.ts          # Tâches agents
│   └── index.ts
│
├── services/
│   ├── agent-orchestrator.ts     # Orchestration logique
│   ├── agent-executor.ts         # Exécution agents
│   ├── cursor-agent-integration.ts # Cursor Agent API
│   └── index.ts
│
├── types/
│   ├── agent.types.ts            # AgentType, AgentTask
│   └── index.ts
│
└── index.ts
```

---

## 4. Détail par Feature

### 4.1 Exemple : Nodes Feature en Détail

#### Components

```typescript
// features/nodes/components/CustomNode.tsx
'use client'

import { useNodeGeneration } from '../hooks/useNodeGeneration'
import { useNodeState } from '../hooks/useNodeState'
import { Button, Badge, Spinner } from '@nonlinear/ui'
import { NodeHeader } from '@nonlinear/ui/molecules'
import { NodePrompt } from './NodePrompt'
import { NodeResponse } from './NodeResponse'

export interface CustomNodeProps {
  id: string
  data: Node
}

export const CustomNode = ({ id, data }: CustomNodeProps) => {
  const { status, prompt, response } = useNodeState(id)
  const { generate, isGenerating, error, cancel } = useNodeGeneration(id)

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 min-w-[300px] max-w-[600px]">
      <NodeHeader
        title={data.summary || prompt}
        status={status}
        onEdit={() => {/* edit prompt */}}
        onDelete={() => {/* delete node */}}
      />

      <NodePrompt prompt={prompt} />

      <div className="p-4 border-t border-gray-200">
        {isGenerating && (
          <div className="flex items-center gap-2">
            <Spinner />
            <span className="text-sm text-gray-600">Génération en cours...</span>
          </div>
        )}
        
        {error && (
          <Badge variant="danger">
            ❌ {error.message}
          </Badge>
        )}
        
        {response && <NodeResponse response={response} />}
        
        {!isGenerating && !response && (
          <div className="flex gap-2">
            <Button onClick={generate} loading={isGenerating}>
              Générer
            </Button>
            {isGenerating && (
              <Button variant="secondary" onClick={cancel}>
                Annuler
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

#### Hooks

```typescript
// features/nodes/hooks/useNodeGeneration.ts
'use client'

import { useCallback, useState } from 'react'
import { generateLLMResponse } from '../services/llm-service'
import { useCanvasState } from '@/features/canvas/hooks/useCanvasState'

export function useNodeGeneration(nodeId: string) {
  const { nodes, edges, updateNode } = useCanvasState()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      let fullResponse = ''
      
      await generateLLMResponse(
        nodeId,
        nodes,
        edges,
        // Stream handler
        (chunk) => {
          fullResponse += chunk
          updateNode(nodeId, { response: fullResponse })
        },
        // Complete handler
        (response) => {
          updateNode(nodeId, { 
            response,
            status: 'idle',
            summary: '...' // Generate summary
          })
        },
        // Error handler
        (err) => {
          setError(err)
          updateNode(nodeId, { status: 'error' })
        }
      )
    } finally {
      setIsGenerating(false)
    }
  }, [nodeId, nodes, edges, updateNode])

  const cancel = useCallback(() => {
    // Cancel streaming logic
    setIsGenerating(false)
  }, [])

  return { generate, isGenerating, error, cancel }
}
```

#### Services

```typescript
// features/nodes/services/llm-service.ts
import { streamText } from 'ai'
import { buildContext } from '@nonlinear/shared/graph'

export async function generateLLMResponse(
  nodeId: string,
  nodes: Record<string, Node>,
  edges: Record<string, Edge>,
  onChunk: (chunk: string) => void,
  onComplete: (response: string) => void,
  onError: (error: Error) => void,
) {
  try {
    // Build context from graph traversal
    const context = buildContext(nodeId, nodes, edges)
    
    // Stream LLM response
    const result = await streamText({
      model: 'glm-4.7',
      messages: context,
      onChunk,
      onFinish: onComplete,
      onError,
    })
    
    return result
  } catch (error) {
    onError(error as Error)
    throw error
  }
}
```

#### Index File (API Publique)

```typescript
// features/nodes/index.ts
// Components
export * from './components'

// Hooks
export { useNodeGeneration } from './hooks/useNodeGeneration'
export { useNodeActions } from './hooks/useNodeActions'
export { useNodeSelection } from './hooks/useNodeSelection'

// Services
export * from './services'

// Types
export * from './types'
```

---

## 5. Best Practices

### 5.1 Encapsulation

❌ **MAUVAIS :** Exporter tout sans organisation

```typescript
// Bad
export { CustomNode, NodePrompt, NodeResponse, useNodeGeneration, llmService, Node, Edge } from '@/features/nodes'
```

✅ **BON :** API claire via index.ts

```typescript
// features/nodes/index.ts
// Components
export * from './components'

// Hooks
export { useNodeGeneration } from './hooks/useNodeGeneration'
export { useNodeActions } from './hooks/useNodeActions'

// Services
export * from './services'

// Types
export * from './types'
```

### 5.2 Pas de Dépendances Inter-Features

❌ **MAUVAIS :** Import direct d'une autre feature

```typescript
// Bad - features/nodes/components/CustomNode.tsx
import { useCanvasState } from '@/features/canvas/hooks/useCanvasState'
```

✅ **BON :** Utiliser un hook partagé ou prop drilling

```typescript
// Good - features/nodes/components/CustomNode.tsx
// Option 1: Utiliser un hook partagé
import { useGlobalState } from '@/lib/store'

// Option 2: Prop drilling
interface Props {
  onNodeUpdate: (id: string, updates: Partial<Node>) => void
}
```

### 5.3 Réutilisation UI

❌ **MAUVAIS :** Créer un bouton dans chaque feature

```typescript
// Bad - features/nodes/components/CustomButton.tsx
export const CustomButton = () => {
  return <button className="px-4 py-2 rounded bg-blue-600">...</button>
}
```

✅ **BON :** Utiliser @nonlinear/ui

```typescript
// Good - features/nodes/components/CustomNode.tsx
import { Button } from '@nonlinear/ui'

export const CustomNode = () => {
  return <Button variant="primary">...</Button>
}
```

### 5.4 Tests Co-localisés

❌ **MAUVAIS :** Tests dans un dossier séparé

```
features/
├── nodes/
│   ├── components/
│   └── ...
tests/
├── nodes/
│   └── components.test.tsx
```

✅ **BON :** Tests à côté du code

```
features/nodes/
├── components/
│   ├── CustomNode.tsx
│   ├── CustomNode.test.tsx
│   └── index.ts
```

### 5.5 Typage Strict

❌ **MAUVAIS :** `any` partout

```typescript
// Bad
const data: any = getData()
const nodes: any[] = data.nodes
```

✅ **BON :** Types explicites

```typescript
// Good
import { Node, NodeMap } from '@nonlinear/shared/types'

const data: { nodes: NodeMap } = getData()
const nodes: NodeMap = data.nodes
```

### 5.6 Validation avec Zod

```typescript
// features/nodes/schemas/node.schema.ts
import { z } from 'zod'

export const nodePromptSchema = z.object({
  prompt: z.string().min(1, 'Le prompt ne peut pas être vide'),
})

export type NodePromptInput = z.infer<typeof nodePromptSchema>

// Utilisation dans une action
// features/nodes/actions/generate-node.ts
'use server'

import { nodePromptSchema } from '../schemas/node.schema'

export async function generateNode(formData: FormData) {
  const result = nodePromptSchema.safeParse({
    prompt: formData.get('prompt'),
  })
  
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }
  
  // Continue avec result.data...
}
```

---

## 6. Exemples d'Implémentation

### 6.1 Créer une Nouvelle Feature

Étape par étape :

1. **Créer la structure**
```bash
mkdir -p apps/web/src/features/my-feature/{components,hooks,services,types}
```

2. **Créer un composant**
```typescript
// features/my-feature/components/MyComponent.tsx
'use client'

export const MyComponent = () => {
  return <div>Hello from MyComponent</div>
}
```

3. **Créer un hook**
```typescript
// features/my-feature/hooks/useMyFeature.ts
'use client'

import { useState, useCallback } from 'react'

export function useMyFeature() {
  const [state, setState] = useState(null)
  
  const doSomething = useCallback(() => {
    // Logic here
  }, [])
  
  return { state, doSomething }
}
```

4. **Créer un service**
```typescript
// features/my-feature/services/my-service.ts
export async function fetchMyData() {
  const response = await fetch('/api/my-data')
  return response.json()
}
```

5. **Créer l'index**
```typescript
// features/my-feature/index.ts
export * from './components'
export * from './hooks'
export * from './services'
export * from './types'
```

6. **Utiliser la feature**
```typescript
// Dans une page ou autre composant
import { MyComponent } from '@/features/my-feature'
import { useMyFeature } from '@/features/my-feature'

export default function Page() {
  const { state, doSomething } = useMyFeature()
  
  return <MyComponent />
}
```

### 6.2 Tester une Feature

```typescript
// features/my-feature/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello from MyComponent')).toBeInTheDocument()
  })
})
```

---

## 📚 Documentation Connexe

- [ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) - Architecture globale
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Design system détaillé
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - Standards de code
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guide de migration

---

**Documentation créée pour le projet NonLinear - Features Structure v1.0**
**Dernière mise à jour : 2026-01-03**
