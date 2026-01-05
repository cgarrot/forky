# Frontend Architecture NonLinear

> **Architecture technique détaillée du frontend Next.js 15 pour NonLinear**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Architecture Technique](#2-architecture-technique)
3. [Server Components vs Client Components](#3-server-components-vs-client-components)
4. [Data Fetching Strategy](#4-data-fetching-strategy)
5. [State Management](#5-state-management)
6. [Routing & Navigation](#6-routing--navigation)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Best Practices](#8-best-practices)

---

## 1. Introduction

Le frontend NonLinear utilise **Next.js 15** avec l'**App Router**, une approche hybride combinant :
- React Server Components pour les pages et layouts
- React Client Components pour les interactions et état
- Atomic Design System via `@nonlinear/ui`
- Feature-Based Architecture via `src/features/`

### Stack Technique

- **Framework** : Next.js 15.0.0
- **React** : 19.0.0 (React Compiler activé)
- **TypeScript** : 5.0.0 (mode strict)
- **Styling** : Tailwind CSS 3.4.0
- **State Global** : Zustand 5.0.0 + Immer
- **Graph Rendering** : @xyflow/react 12.0.0
- **Animations** : Framer Motion 11.0.0
- **Icons** : Lucide React 0.400.0
- **Markdown** : React Markdown 9.0.0

---

## 2. Architecture Technique

### 2.1 Structure des Fichiers Frontend

```
apps/web/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx           # Root layout (Server Component)
│   │   ├── page.tsx             # Homepage (Server Component)
│   │   ├── (app)/               # Route group principale
│   │   │   ├── layout.tsx       # App layout (Server Component)
│   │   │   └── page.tsx       # Canvas page (Client Component)
│   │   │   └── loading.tsx     # Loading skeleton
│   │   └── api/                # Route Handlers (si besoin)
│   │   │       └── generate/route.ts
│   │   │       └── projects/route.ts
│   │   │
│   │   ├── features/             # Feature-Based Architecture
│   │   │   ├── canvas/
│   │   │   ├── nodes/
│   │   │   ├── sidebar/
│   │   │   ├── projects/
│   │   │   └── collaboration/
│   │   │
│   │   ├── components/           # Composants app-specific
│   │   │   ├── lib/                # Utilitaires frontend
│   │   │   │   ├── store/          # Zustand stores
│   │   │   │   ├── api/            # API clients
│   │   │   │   └── utils/          # Helpers généraux
│   │   │   ├── hooks/             # Hooks partagés
│   │   │   ├── config/           # Configuration frontend
│   │   │   └── styles/           # Styles globaux
│   │
│   └── public/                   # Assets statiques
│
├── next.config.ts                 # Configuration Next.js
└── tsconfig.json                 # Configuration TypeScript
```

### 2.2 Rôles des Couches

| Couche | Rôle | Tech |
|---------|-------|-------|
| **App Router** | Routage, layouts, pages | Next.js App Router |
| **Features** | Logique métier | React components + hooks + services |
| **Components UI** | Composants spécifiques | React components |
| **Store** | État global | Zustand + Immer |
| **API Client** | Appels backend | Fetch wrappers |
| **Config** | Configuration frontend | Environment vars |
| **Styles** | Styling partagé | Tailwind classes |

---

## 3. Server Components vs Client Components

### 3.1 Principes Fondamentaux

| Composant | Type | Usage | Raison |
|------------|-------|-------|
| `app/layout.tsx` | Server | Layout racine, pas d'état, pas d'interactions utilisateur |
| `app/page.tsx` | Server | Page statique ou avec data fetching serveur |
| `app/(app)/page.tsx` | Client | Canvas interactif avec React Flow |
| `features/canvas/components/Canvas.tsx` | Client | Interactions canvas, drag & drop |
| `features/nodes/components/CustomNode.tsx` | Client | Génération LLM avec streaming |

### 3.2 Server Components

```typescript
// apps/web/src/app/layout.tsx
// ❌ PAS 'use client'
import { AppLayout } from '@nonlinear/ui/templates'
import { ToastContainer } from '@nonlinear/ui/organisms'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Data fetching serveur possible
  const projects = await listProjects()
  
  return (
    <AppLayout>
      {children}
      <ToastContainer />
    </AppLayout>
  )
}
```

**Avantages Server Components :**
- ✅ Data fetching côté serveur (plus rapide)
- ✅ Accès direct aux ressources (base de données)
- ✅ Pas d'hydratation nécessaire
- ✅ Meilleur SEO (pré-rendering)

**Usage :**
- Pages et layouts
- Composants sans interactions utilisateur
- Data fetching initial

### 3.3 Client Components

```typescript
// apps/web/src/features/canvas/components/Canvas.tsx
'use client'  // ✅ OBLIGATOIRE pour interactions

import { useCallback, useState } from 'react'
import { useCanvasState } from '@/features/canvas/hooks/useCanvasState'

export const Canvas = () => {
  const [viewport, setViewport] = useCanvasState((s) => s.viewport)
  const [selectedNodes, setSelectedNodes] = useCanvasState((s) => s.selectedNodes)
  
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodes(new Set([nodeId]))
  }, [setSelectedNodes])

  return (
    <div>
      {/* React Flow avec interactions */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
```

**Avantages Client Components :**
- ✅ Interactions utilisateur (click, drag, etc.)
- ✅ État local (useState, useEffect)
- ✅ Hooks personnalisés
- ✅ Streaming en temps réel

**Usage :**
- Canvas interactif
- Formulaires
- Composants avec state
- Streaming responses

### 3.4 Hybride : Server + Client Pattern

```typescript
// apps/web/src/app/(app)/page.tsx
// Server Component pour data fetching
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  // Data fetching serveur
  const initialData = await fetchDashboardData()
  
  // Passer les données au client
  return <DashboardClient initialData={initialData} />
}

// Client Component pour interactions
'use client'

export const DashboardClient = ({ initialData }: { initialData: Data }) => {
  const [data, setData] = useState(initialData)
  const [isEditing, setIsEditing] = useState(false)
  
  // Interactions utilisateur
  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])
  
  return (
    <div>
      <button onClick={handleEdit}>Edit</button>
      {isEditing && <EditForm data={data} />}
    </div>
  )
}
```

**Avantages :**
- ✅ Data fetching optimisé côté serveur
- ✅ Interactions côté client
- ✅ Meilleur UX (pas de loading states pour le data initial)

---

## 4. Data Fetching Strategy

### 4.1 Approche Recommandée

| Scenario | Strategy | Pourquoi ? |
|-----------|-----------|-----------|
| **Initial Page Load** | Server Component (fetch dans Server Component) | Plus rapide, SEO, cache |
| **User Interactions** | Client Component (fetch depuis Client Component) | Interactif, streaming |
| **Background Updates** | API Routes + polling ou WebSockets | Temps réel, collaboratif |
| **Form Submission** | Server Actions (mutations) | Sécurité, validation serveur |
| **Data Cache** | Next.js Data Cache + revalidate | Performance, coherence |

### 4.2 Server Actions (Recommandé pour Mutations)

```typescript
// apps/web/src/app/actions/nodes/generate-node.ts
'use server'  // ✅ OBLIGATOIRE pour Server Actions

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { generateLLMResponse } from '@nonlinear/shared/llm'

// Validation avec Zod
const generateNodeSchema = z.object({
  nodeId: z.string().min(1),
  prompt: z.string().min(1).max(10000),
  model: z.enum(['glm-4.7', 'gpt-4o', 'claude-3.5']),
  temperature: z.number().min(0).max(2).default(0.7),
})

export async function generateNode(formData: FormData) {
  const result = generateNodeSchema.safeParse({
    nodeId: formData.get('nodeId'),
    prompt: formData.get('prompt'),
    model: formData.get('model'),
    temperature: Number(formData.get('temperature')),
  })

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { nodeId, prompt, model, temperature } = result.data

  try {
    // Génération LLM (avec streaming)
    const response = await generateLLMResponse({
      nodeId,
      prompt,
      model,
      temperature,
      onChunk: (chunk) => {
        // Update en temps réel (via server-side events)
      },
      onFinish: (fullResponse) => {
        // Sauvegarder dans la base
        await saveNodeResponse(nodeId, fullResponse)
        
        // Revalidate le cache
        revalidatePath('/dashboard')
      },
      onError: (error) => {
        console.error('Generation failed:', error)
      },
    })

    return { success: true, response }
  } catch (error) {
    return { error: (error as Error).message }
  }
}
```

**Avantages Server Actions :**
- ✅ Validation côté serveur (Zod)
- ✅ Pas d'exposition de clés API au client
- ✅ Sécurité CSRF intégrée
- ✅ Revalidation de cache automatique
- ✅ Support pour progressive enhancement

**Utilisation dans Client Component :**
```typescript
'use client'

import { generateNode } from '@/app/actions/nodes/generate-node'

export const NodeGenerationForm = () => {
  return (
    <form action={generateNode}>
      <input name="nodeId" value="node-1" hidden />
      <textarea name="prompt" placeholder="Votre prompt..." required />
      <select name="model">
        <option value="glm-4.7">GLM-4.7</option>
        <option value="gpt-4o">GPT-4o</option>
      </select>
      <button type="submit">Générer</button>
    </form>
  )
}
```

### 4.3 API Routes (Pour les Endpoints Publics)

```typescript
// apps/web/src/app/api/generate/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Validation
  if (!searchParams.query || typeof searchParams.query !== 'string') {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  // Appel LLM
  try {
    const response = await fetchLLMSearch(searchParams.query)
    
    // Cache control
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

**Usage des API Routes :**
- ✅ Endpoints publics (webhooks)
- ✅ WebSockets (upgrade HTTP → WS)
- ✅ External integrations (GitHub, etc.)
- ✅ Streaming responses (si server actions pas adapté)

### 4.4 Next.js Data Cache

```typescript
// Utilisation du Data Cache Next.js

// 1. Cache automatique (par défaut)
const data = await fetch('https://api.example.com/data')
// Cache pour les requêtes GET suivantes avec mêmes params

// 2. Revalidation manuelle
import { revalidatePath, revalidateTag } from 'next/cache'

// Revalider un chemin spécifique
await saveNodeData(nodeId, data)
revalidatePath('/canvas')

// Revalider par tag
revalidateTag(`nodes-${nodeId}`)

// 3. Opter du cache
import { unstable_noStore } from 'next/cache'

const data = await unstable_noStore(
  fetch('https://api.example.com/data', {
    cache: 'no-store',
  }),
)

// 4. Revalidation on-demand (optionnel)
revalidateTag('nodes', 'https://api.example.com/webhook')
```

---

## 5. State Management

### 5.1 Stratégie Globale

| Type de Donnée | Solution | Raison |
|----------------|----------|--------|
| **État Global Canvas** | Zustand Store | Nœuds, edges, viewport partagés partout |
| **État Local Composant** | useState | État spécifique à un composant |
| **État Sync Backend** | React Query ou polling | Synchronisation temps réel (futur) |
| **État Navigation** | Next.js Router | Routage et params URL |

### 5.2 Zustand Store Configuration

```typescript
// apps/web/src/lib/store/index.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CanvasStore {
  // État
  nodes: Map<string, Node>
  edges: Map<string, Edge>
  selectedNodeIds: Set<string>
  viewport: { x: number; y: number; zoom: number }
  
  // Actions
  addNode: (node: Node) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  setViewport: (viewport: any) => void
  setSelectedNodes: (ids: Set<string>) => void
  clearSelection: () => void
}

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    // État initial
    nodes: new Map(),
    edges: new Map(),
    selectedNodeIds: new Set(),
    viewport: { x: 0, y: 0, zoom: 1 },
    
    // Actions (immer simplifie les mutations complexes)
    addNode: (node) => set((state) => {
      state.nodes.set(node.id, node)
    }),
    
    updateNode: (id, updates) => set((state) => {
      if (state.nodes.has(id)) {
        Object.assign(state.nodes.get(id), updates)
      }
    }),
    
    deleteNode: (id) => set((state) => {
      state.nodes.delete(id)
      // Nettoyer les edges associés
      Object.values(state.edges).forEach(edge => {
        if (edge.source === id || edge.target === id) {
          state.edges.delete(edge.id)
        }
      })
    }),
    
    addEdge: (edge) => set((state) => {
      state.edges.set(edge.id, edge)
    }),
    
    deleteEdge: (id) => set((state) => {
      state.edges.delete(id)
    }),
    
    setViewport: (viewport) => set({ viewport }),
    
    setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
    
    clearSelection: () => set({ selectedNodeIds: new Set() }),
  }))
)

// Sélecteurs optimisés (évite les re-renders inutiles)
export const useNodes = () => useCanvasStore((s) => s.nodes)
export const useEdges = () => useCanvasStore((s) => s.edges)
export const useSelectedNodes = () => useCanvasStore((s) => s.selectedNodeIds)
export const useViewport = () => useCanvasStore((s) => s.viewport)
```

### 5.3 Utilisation du Store dans les Features

```typescript
// apps/web/src/features/nodes/components/CustomNode.tsx
'use client'

import { useCanvasStore } from '@/lib/store'

export const CustomNode = ({ id }: { id: string }) => {
  // ❌ MAUVAIS : Sélectionner tout le store (cause des re-renders)
  // const store = useCanvasStore()
  
  // ✅ BON : Sélectionner seulement ce qu'on utilise
  const { nodes, updateNode, deleteNode } = useCanvasStore()
  const node = nodes.get(id)
  
  return (
    <div>
      <h2>{node.prompt}</h2>
      <button onClick={() => updateNode(id, { prompt: 'Updated' })}>Update</button>
      <button onClick={() => deleteNode(id)}>Delete</button>
    </div>
  )
}
```

### 5.4 Persist Middleware (LocalStorage)

```typescript
// apps/web/src/lib/store/index.ts (avec persistance)
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CanvasStore {
  nodes: Map<string, Node>
  edges: Map<string, Edge>
  selectedNodeIds: Set<string>
  viewport: { x: number; y: number; zoom: number }
}

export const useCanvasStore = create<CanvasStore>()(
  immer(
    persist(
      (set) => ({
        nodes: new Map(),
        edges: new Map(),
        selectedNodeIds: new Set(),
        viewport: { x: 0, y: 0, zoom: 1 },
        
        addNode: (node) => set((state) => {
          state.nodes.set(node.id, node)
        }),
        
        // ... autres actions
      }),
      {
        name: 'nonlinear-canvas-storage', // Clé localStorage
        storage: createJSONStorage(() => localStorage),
        // Ne persister que les parties nécessaires
        partialize: (state) => ({
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          // Ne PAS persister selectedNodeIds (état UI temporaire)
        }),
      },
    ),
  ),
)
```

**Avantages de la Persistation :**
- ✅ Restauration automatique après refresh
- ✅ Sauvegarde transparente
- ✅ Optimisation (ne persister que le nécessaire)
- ✅ Hydratation côté serveur (si migration backend)

---

## 6. Routing & Navigation

### 6.1 Structure de Routing

```
apps/web/src/app/
├── layout.tsx                  # Root layout (Server Component)
├── page.tsx                    # Homepage (Server Component)
│
├── (app)/                      # Route group (n'affecte pas l'URL)
│   ├── layout.tsx              # App layout (Server Component)
│   ├── page.tsx                # Canvas page (Client Component)
│   ├── loading.tsx            # Loading skeleton
│   └── error.tsx              # Error boundary
│
├── (auth)/                     # Route group pour authentification (futur)
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
│
├── (dashboard)/                  # Route group pour dashboard (futur)
│   ├── projects/
│   │   ├── [id]/
│   │   │   └── page.tsx    # Page projet
│   │   └── page.tsx          # Liste projets
│   └── page.tsx                # Dashboard home
│
└── api/                        # Route Handlers
    ├── generate/
    │   └── route.ts
    └── webhooks/
        └── route.ts
```

### 6.2 Route Groups

```typescript
// apps/web/src/app/(app)/layout.tsx
import { AppLayout } from '@nonlinear/ui/templates'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout>
      <main className="flex-1 h-full">
        {children}
      </main>
    </AppLayout>
  )
}

// apps/web/src/app/page.tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect vers le canvas
  redirect('/app')
}
```

**Avantages des Route Groups :**
- ✅ Organisation logique (layouts partagés)
- ✅ Pas d'impact sur l'URL
- ✅ Layouts imbriqués possibles
- ✅ Code splitting automatique

### 6.3 Dynamic Routes

```typescript
// apps/web/src/app/(dashboard)/projects/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validation
  if (!/^[a-f0-9]{32}$/.test(id)) {
    notFound()
  }
  
  // Data fetching serveur
  const project = await fetchProject(id)
  
  if (!project) {
    notFound()
  }
  
  return <ProjectView project={project} />
}
```

### 6.4 Navigation Client

```typescript
// apps/web/src/features/sidebar/components/ProjectList.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const ProjectList = ({ projects }: { projects: Project[] }) => {
  const pathname = usePathname()
  
  return (
    <div>
      {projects.map(project => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className={`
            block p-3 rounded
            ${pathname === `/projects/${project.id}`
              ? 'bg-blue-50 border-blue-500'
              : 'hover:bg-gray-50'
            }
          `}
        >
          {project.name}
        </Link>
      ))}
    </div>
  )
}
```

---

## 7. Performance Optimizations

### 7.1 React Compiler (Activé par Défaut dans Next.js 15)

Le React Compiler optimise automatiquement :
- ✅ Memoization des composants (pas besoin de `React.memo`)
- ✅ Optimisation des callbacks (`useCallback` automatique)
- ✅ Élimination des re-renders inutiles

**Activation :**
```typescript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  // ✅ Activé par défaut dans Next.js 15.0.0
  experimental: {
    reactCompiler: true,
  },
}

export default nextConfig
```

### 7.2 Code Splitting

```typescript
// Lazy loading des composants lourds
'use client'

import dynamic from 'next/dynamic'

// ❌ MAUVAIS : Import statique
// import { HeavyComponent } from './HeavyComponent'

// ✅ BON : Lazy loading
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // Optionnel : désactiver SSR
})

export const Page = () => {
  return <HeavyComponent />
}
```

### 7.3 Images & Assets

```typescript
// apps/web/src/components/ImageWithPlaceholder.tsx
'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

export const ImageWithPlaceholder = (props: Omit<ImageProps, 'src'> & { src: string }) => {
  const [isLoading, setIsLoading] = useState(true)
  
  return (
    <div>
      <Image
        {...props}
        src={props.src}
        onLoad={() => setIsLoading(false)}
        placeholder="blur"  // Flou progressif pendant le chargement
        className={isLoading ? 'blur-sm' : 'blur-0'}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
```

### 7.4 Virtualization

React Flow gère automatiquement la virtualisation des nœuds. Pour les listes personnalisées :

```typescript
// apps/web/src/features/projects/components/ProjectList.tsx
'use client'

import { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export const ProjectList = ({ projects }: { projects: Project[] }) => {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const rowVirtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Hauteur estimée d'une ligne
    overscan: 5, // Nombre de lignes à rendre en plus
  })
  
  const virtualRows = rowVirtualizer.getVirtualItems()
  
  return (
    <div
      ref={parentRef}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        overflow: 'auto',
      }}
    >
      {virtualRows.map(virtualRow => (
        <div
          key={virtualRow.key}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
          }}
        >
          <ProjectCard project={projects[virtualRow.index]} />
        </div>
      ))}
    </div>
  )
}
```

### 7.5 Bundle Optimization

```javascript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  // Code splitting automatique par routes
  splitChunks: false, // Laisser Next.js optimiser
  
  // Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  experimental: {
    // React Compiler
    reactCompiler: true,
    
    // Optimisation des bundles
    optimizePackageImports: [
      'lucide-react',
      '@nonlinear/ui',
      '@nonlinear/shared',
    ],
  },
}

export default nextConfig
```

---

## 8. Best Practices

### 8.1 Error Handling

```typescript
// apps/web/src/components/ErrorBoundary.tsx
'use client'

import { Component, ErrorBoundary, ReactNode } from 'react'

class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // Envoyer à un service de monitoring (ex: Sentry)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

const ErrorFallback = ({ error }: { error: Error | null }) => (
  <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
    <h2 className="text-lg font-semibold text-red-900 mb-4">
      Quelque chose s'est mal passé
    </h2>
    {error && (
      <p className="text-sm text-red-700">
        Erreur : {error.message}
      </p>
    )}
    <button
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
    >
      Recharger la page
    </button>
  </div>
)

// apps/web/src/app/error.tsx (Error page Next.js)
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Une erreur est survenue
        </h1>
        <p className="text-gray-600 mb-6">
          {error.message || 'Une erreur inattendue est survenue.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
```

### 8.2 Loading States

```typescript
// apps/web/src/app/(app)/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="mt-4 text-gray-600">
          Chargement en cours...
        </p>
      </div>
    </div>
  )
}
```

### 8.3 Accessibilité

```typescript
// Utiliser des attributs ARIA corrects
<button
  aria-label="Générer la réponse"
  aria-disabled={isGenerating}
  aria-describedby="generation-help"
>
  Générer
</button>

<div id="generation-help" role="note">
  Cette action génère une réponse LLM pour le nœud sélectionné.
</div>

// Navigation clavier
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Sélectionner
</button>

// Focus visible
<div className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
  ...
</div>
```

### 8.4 SEO (Pour les Pages Publiques)

```typescript
// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NonLinear - Interface LLM Node-Based',
  description: 'Explorez vos idées de manière non-linéaire avec des nœuds connectés et des branches multiples.',
  keywords: ['brainstorming', 'LLM', 'IA', 'nœuds', 'graphes'],
  authors: [{ name: 'NonLinear Team' }],
  openGraph: {
    title: 'NonLinear',
    description: 'Interface LLM Node-Based',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NonLinear',
    description: 'Interface LLM Node-Based',
  },
}
```

---

## 📚 Références

- [Next.js Documentation](https://nextjs.org/docs/app)
- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [State Management](https://nextjs.org/docs/app/building-your-application/caching)
- [Zustand Documentation](https://docs.pmnd.rs/)
- [React Flow Documentation](https://reactflow.dev/learn)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

**Frontend Architecture créée pour NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
