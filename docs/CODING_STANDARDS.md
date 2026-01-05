# Standards de Code NonLinear

> **Guide des conventions et bonnes pratiques pour le développement NonLinear**

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [TypeScript Standards](#2-typescript-standards)
3. [React Best Practices](#3-react-best-practices)
4. [Architecture Patterns](#4-architecture-patterns)
5. [File & Folder Structure](#5-file--folder-structure)
6. [Naming Conventions](#6-naming-conventions)
7. [Testing Standards](#7-testing-standards)
8. [Git & Version Control](#8-git--version-control)
9. [Documentation Standards](#9-documentation-standards)
10. [Security Best Practices](#10-security-best-practices)

---

## 1. Introduction

Ce document définit les standards de code à suivre dans tout le projet NonLinear pour assurer :
- ✅ **Cohérence** : Code facile à lire et maintenir
- ✅ **Qualité** : Code robuste et sans bugs
- ✅ **Scalabilité** : Architecture qui supporte la croissance
- ✅ **Maintenabilité** : Facile à modifier et étendre
- ✅ **Collaboration** : Facile pour les développeurs à travailler ensemble

---

## 2. TypeScript Standards

### 2.1 Configuration du Compilateur

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

### 2.2 Types vs Interfaces

```typescript
// ❌ Mauvais - utiliser "any"
const data: any = fetchData()
const nodes: any[] = data.nodes

// ✅ Bon - utiliser des types explicites
interface Node {
  id: string
  prompt: string
  response?: string
}

interface Data {
  nodes: Node[]
}

const data: Data = fetchData()
const nodes: Node[] = data.nodes

// Interface = Shape d'objet, peut être étendue
interface Node {
  id: string
  prompt: string
}

interface CustomNode extends Node {
  customField: string
}

// Type = Union de types
type NodeStatus = 'idle' | 'loading' | 'error' | 'stale'

// Type = Primitive types
type UUID = string
type Timestamp = number
```

### 2.3 Generics

```typescript
// ✅ Bon - utiliser des generics réutilisables
function createMap<K extends string, V>(initial: Record<K, V>): Map<K, V> {
  return new Map(Object.entries(initial))
}

const nodeMap = createMap<string, Node>({ '1': node1 })

// ✅ Bon - contraintes sur les generics
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
}
```

### 2.4 Type Guards

```typescript
// Type guard pour vérifier le type
interface Node {
  type: 'standard' | 'custom'
}

function isCustomNode(node: Node): node is CustomNode {
  return node.type === 'custom'
}

if (isCustomNode(node)) {
  // TypeScript sait que node est CustomNode
  console.log(node.customField)
}
```

### 2.5 Utility Types

```typescript
// Types utilitaires courrants
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type Prettify<T> = {
  [K in keyof T]: T[K] extends string | string[] | undefined ? string : never
}

// Utilisation
type PartialNode = DeepPartial<Node>
```

---

## 3. React Best Practices

### 3.1 Components

```typescript
// ❌ Mauvais - component monolithe
export const BigComponent = () => {
  // 500+ lignes de logique mélée
  return <div>...</div>
}

// ✅ Bon - diviser en composants plus petits
export const Component = () => {
  return (
    <div>
      <Header />
      <Body />
      <Footer />
    </div>
  )
}

// ✅ Bon - utiliser des composants réutilisables
export const ActionButtons = () => {
  return (
    <div className="flex gap-2">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Cancel</Button>
    </div>
  )
}
```

### 3.2 Props et Interfaces

```typescript
// ✅ Bon - interface explicite avec exports
export interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

export const Button = (props: ButtonProps) => {
  const { onClick, disabled, children } = props
  // ...
}

// ✅ Bon - utiliser des props optionnelles avec défauts
export interface ModalProps {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Modal = ({ isOpen, title = '', size = 'md' }: ModalProps) => {
  // ...
}
```

### 3.3 Hooks Custom

```typescript
// ✅ Bon - hook avec nom descriptif
export function useNodeGeneration(nodeId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generate = useCallback(async () => {
    setIsGenerating(true)
    try {
      await generateLLMResponse(nodeId)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsGenerating(false)
    }
  }, [nodeId])

  return { generate, isGenerating, error }
}

// ❌ Mauvais - hook vague
export function useData() {
  // Pas clair ce que fait ce hook
}
```

### 3.4 State Management

```typescript
// ✅ Bon - état local quand possible
export const NodeComponent = ({ id }: { id: string }) => {
  const [isEditing, setIsEditing] = useState(false)
  // ...
}

// ✅ Bon - état global via Zustand pour l'état partagé
// lib/store/node-store.ts
import { create } from 'zustand'

interface NodeStore {
  nodes: Map<string, Node>
  addNode: (node: Node) => void
  updateNode: (id: string, updates: Partial<Node>) => void
}

export const useNodeStore = create<NodeStore>((set) => ({
  nodes: new Map(),
  addNode: (node) => set((state) => {
    const newNodes = new Map(state.nodes)
    newNodes.set(node.id, node)
    return { nodes: newNodes }
  }),
  updateNode: (id, updates) => set((state) => {
    const node = state.nodes.get(id)
    if (!node) return
    const newNodes = new Map(state.nodes)
    newNodes.set(id, { ...node, ...updates })
    return { nodes: newNodes }
  }),
}))
```

### 3.5 Effect Management

```typescript
// ❌ Mauvais - dépendances manquantes
export const Component = () => {
  useEffect(() => {
    // Effect dépend de "data" mais pas listé
    console.log(data)
  }, [])

  // ✅ Bon - toutes les dépendances listées
  useEffect(() => {
    console.log(data)
  }, [data])

  // ✅ Bon - cleanup function
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('tick')
    }, 1000)

    return () => clearInterval(timer)
  }, [])
}
```

### 3.6 Performance

```typescript
// ✅ Bon - utiliser React.memo pour éviter les re-renders
export const ExpensiveComponent = React.memo(({ data }: { data: ComplexData }) => {
  return <div>...</div>
})

// ✅ Bon - utiliser useMemo pour les calculs coûteux
export const Component = ({ nodes }: { nodes: Node[] }) => {
  const sortedNodes = useMemo(() => {
    return nodes.sort((a, b) => a.createdAt - b.createdAt)
  }, [nodes])

  return <div>{sortedNodes.map(node => <Node key={node.id} />)}</div>
}

// ✅ Bon - utiliser useCallback pour les callbacks
export const ParentComponent = () => {
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id)
  }, [])

  return (
    <div>
      {items.map(item => <Button onClick={() => handleClick(item.id)} />)}
    </div>
  )
}
```

### 3.7 Server Components vs Client Components

```typescript
// ✅ Bon - Server Component par défaut (pas 'use client')
// app/page.tsx
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// ✅ Bon - Client Component quand nécessaire (interactions, hooks)
// components/canvas/CustomNode.tsx
'use client'

export const CustomNode = ({ id }: { id: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  // ...
}
```

### 3.8 Error Boundaries

```typescript
// ✅ Bon - utiliser Error Boundaries pour les erreurs React
'use client'

export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorMessage error={this.state.error} />
    }

    return this.props.children
  }
}
```

---

## 4. Architecture Patterns

### 4.1 Container/Presenter Pattern

```typescript
// Container - gère l'état et la logique
export const NodeContainer = () => {
  const { nodes, addNode, updateNode } = useNodeStore()
  const { generate, isGenerating } = useNodeGeneration(nodeId)

  return <NodePresenter
    nodes={nodes}
    onAddNode={addNode}
    onUpdateNode={updateNode}
    onGenerate={generate}
    isGenerating={isGenerating}
  />
}

// Presenter - rend l'UI, stateless
export const NodePresenter = ({ nodes, onAddNode, onUpdateNode, onGenerate, isGenerating }: Props) => {
  return (
    <div>
      {nodes.map(node => (
        <NodeView
          key={node.id}
          data={node}
          onUpdate={(updates) => onUpdateNode(node.id, updates)}
        />
      ))}
    </div>
  )
}
```

### 4.2 Custom Hooks Pattern

```typescript
// Hook personnalisé réutilisable
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debounced
}

// Utilisation
export const SearchComponent = () => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    search(debouncedQuery)
  }, [debouncedQuery])

  return <Input value={query} onChange={setQuery} />
}
```

### 4.3 Compound Components Pattern

```typescript
// Composant composé avec Context
const ModalContext = createContext<ModalContextValue>({})

export const Modal = ({ children, isOpen, onClose }: ModalProps) => {
  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      {children}
    </ModalContext.Provider>
  )
}

Modal.Header = ({ children }: { children: React.ReactNode }) => {
  const { isOpen, onClose } = useContext(ModalContext)
  return <div className="modal-header">{children}</div>
}

Modal.Body = ({ children }: { children: React.ReactNode }) => {
  return <div className="modal-body">{children}</div>
}

Modal.Footer = ({ children }: { children: React.ReactNode }) => {
  return <div className="modal-footer">{children}</div>
}

// Utilisation
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>Close</Button>
  </Modal.Footer>
</Modal>
```

### 4.4 Higher Order Components (HOCs)

```typescript
// HOC avec TypeScript
function withLoading<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  isLoading: boolean
) {
  return (props: P) => {
    if (isLoading) {
      return <Spinner />
    }

    return <WrappedComponent {...props} />
  }
}

// Utilisation
const NodeWithData = withLoading(NodeComponent, isLoading)
```

---

## 5. File & Folder Structure

### 5.1 Conventions de Nommage

```
composants/              # Pluriel, kebab-case
atoms/
molecules/
organisms/

my-component.tsx          # PascalCase, -suffixe
MyComponent.test.tsx      # PascalCase + .test.tsx
useMyHook.ts           # camelCase avec préfixe use
my-service.ts           # kebab-case, -suffixe service
my.types.ts             # camelCase avec suffixe .types
```

### 5.2 Index Files

```typescript
// ✅ Bon - index.ts pour exports publiques
// components/index.ts
export * from './atoms'
export * from './molecules'
export * from './organisms'

// ✅ Bon - re-exports depuis features
// features/nodes/index.ts
export { CustomNode } from './components/CustomNode'
export { useNodeGeneration } from './hooks/useNodeGeneration'
export * from './types'
```

### 5.3 Barrel Exports

```typescript
// ❌ Mauvais - imports profondes
import { Button } from '../../../packages/ui/atoms/Button'

// ✅ Bon - utiliser des barrel exports
import { Button } from '@nonlinear/ui'
```

### 5.4 Asset Organization

```
public/
├── images/              # Images statiques
│   ├── logo.png
│   ├── icons/
│   └── backgrounds/
├── fonts/               # Polices personnalisées
└── docs/                # Documentation statique
```

---

## 6. Naming Conventions

### 6.1 Variables & Functions

```typescript
// ✅ Bon - camelCase
const userName = 'John'
const getUserById = (id: string) => { ... }
const hasPermission = true

// ❌ Mauvais - snake_case
const user_name = 'John'
const get_user_by_id = (id: string) => { ... }
```

### 6.2 Components

```typescript
// ✅ Bon - PascalCase
export const Button = ...
export const Modal = ...
export const NodeHeader = ...

// ❌ Mauvais - camelCase
export const button = ...
export const modal = ...
```

### 6.3 Hooks

```typescript
// ✅ Bon - use + PascalCase
export function useState = ...
export function useEffect = ...
export function useNodeGeneration = ...
export function useDebounce = ...

// ❌ Mauvais - sans préfixe use
export function nodeGeneration = ...
export function debounce = ...
```

### 6.4 Types & Interfaces

```typescript
// ✅ Bon - PascalCase
interface NodeProps { ... }
interface User { ... }
type NodeStatus = 'idle' | 'loading'

// ❌ Mauvais - camelCase
interface nodeProps { ... }
interface user { ... }
type nodeStatus = 'idle' | 'loading'
```

### 6.5 Constants

```typescript
// ✅ Bon - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com'
const MAX_RETRY_ATTEMPTS = 3
const DEFAULT_TIMEOUT = 5000

// ❌ Mauvais - camelCase
const apiBaseUrl = 'https://api.example.com'
const maxRetryAttempts = 3
```

### 6.6 Booleans

```typescript
// ✅ Bon - préfixe is/has/can/should
const isLoading = true
const hasPermission = false
const canEdit = true
const shouldRender = false

// ❌ Mauvais - vague
const loading = true
const permission = false
const editable = true
```

---

## 7. Testing Standards

### 7.1 Structure des Tests

```typescript
// ✅ Bon - organiser par fonctionnalité
// components/canvas/Canvas.test.tsx
describe('Canvas', () => {
  describe('Rendering', () => {
    it('should render canvas', () => { ... })
    it('should render nodes', () => { ... })
  })

  describe('Interactions', () => {
    it('should handle node click', () => { ... })
    it('should handle pan', () => { ... })
  })

  describe('Performance', () => {
    it('should handle 100+ nodes without lag', () => { ... })
  })
})
```

### 7.2 Testing Library Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config/react'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

### 7.3 Test Utilities

```typescript
// src/test/test-utils.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

export const renderWithQueryClient = (
  ui: React.ReactElement,
  queryClient: QueryClient = createTestQueryClient(),
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    const loaders = screen.queryAllByRole('status')
    expect(loaders).toHaveLength(0)
  })
}
```

### 7.4 Coverage Goals

```json
{
  "coverage": {
    "statements": 80,
    "branches": 80,
    "functions": 80,
    "lines": 80
  }
}
```

### 7.5 Integration Tests

```typescript
// e2e/canvas.e2e.ts
import { test, expect } from '@playwright/test'

test('canvas e2e', async ({ page }) => {
  await page.goto('http://localhost:3000')
  
  // Créer un nœud
  await page.click('text=Nouveau Nœud')
  await page.fill('input[placeholder="Prompt..."]', 'Test prompt')
  await page.click('button:has-text("Générer")')

  // Vérifier
  await expect(page.locator('.node').first()).toBeVisible()
  await expect(page.locator('text=Test response')).toBeVisible()
})
```

---

## 8. Git & Version Control

### 8.1 Commit Messages

```bash
# Format Conventional Commits
<type>[optional scope]: <subject>

<body>

<footer>

# Types
feat:     Nouvelle fonctionalité
fix:      Bug fix
docs:      Documentation
style:     Style/formatting
refactor:  Refactoring code
test:      Ajout/modif tests
chore:     Tâche de maintenance
perf:      Amélioration performance

# Exemples
feat(canvas): add minimap support
fix(nodes): resolve stale state not updating
docs(readme): add installation instructions
refactor(sidebar): extract components to ui package
```

### 8.2 Branch Strategy

```bash
# Main branch
main (ou master) - Production ready

# Feature branches
feature/canvas-migration
feature/multi-user-support
feature/voice-interactions

# Fix branches
fix/node-deletion-bug
fix/edge-detection-error

# Release branches
release/v1.0.0
release/v1.1.0

# Hotfix branches
hotfix/critical-security-issue
hotfix/emergency-production-bug
```

### 8.3 .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
build/
*.log

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Testing
coverage/
*.lcov

# Temporary
*.tmp
.cache/
```

---

## 9. Documentation Standards

### 9.1 JSDoc

```typescript
/**
 * Génère une réponse LLM pour un nœud donné
 * 
 * @param nodeId - ID du nœud à générer
 * @param nodes - Map de tous les nœuds disponibles
 * @param edges - Map de tous les liens disponibles
 * @returns Promise<string> - La réponse générée
 * @throws {Error} - Si la génération échoue
 * 
 * @example
 * ```typescript
 * const response = await generateNode('node-1', nodes, edges)
 * console.log(response)
 * ```
 */
export async function generateNode(
  nodeId: string,
  nodes: Map<string, Node>,
  edges: Map<string, Edge>,
): Promise<string> {
  // Implementation
}
```

### 9.2 README Standards

```markdown
# [Nom du Composant/Feature]

## Description

Brève description de ce que fait le composant/feature.

## Installation

```bash
pnpm add @nonlinear/[package-name]
```

## Usage

```typescript
import { ComponentName } from '@nonlinear/ui'

export default function App() {
  return <ComponentName prop="value" />
}
```

## Props

| Prop | Type | Default | Description |
|------|-------|---------|-------------|
| prop1 | string | undefined | Description |
| prop2 | number | 42 | Description |

## Examples

### Basic
```typescript
<ComponentName />
```

### Advanced
```typescript
<ComponentName
  prop1="value"
  prop2={100}
/>
```

## Accessibility

- Clavier : Tab, Enter, Escape
- Lecteur écran : aria-labels corrects
- Contraste : WCAG AA minimum

## Notes

- Notes importantes sur l'utilisation
- Limitations connues
- Problèmes connus
```

### 9.3 Changelog Standards

```markdown
# Changelog

## [1.0.0] - 2026-01-03

### Added
- New feature 1
- New feature 2

### Changed
- Updated feature 1 with new behavior
- Improved performance of feature 2

### Fixed
- Fixed bug in feature 1
- Resolved issue #123

### Removed
- Removed deprecated feature 1
```

---

## 10. Security Best Practices

### 10.1 Input Validation

```typescript
// ✅ Bon - utiliser Zod pour validation
import { z } from 'zod'

const nodePromptSchema = z.object({
  prompt: z.string().min(1, 'Le prompt ne peut pas être vide').max(1000),
  model: z.enum(['glm-4.7', 'gpt-4o', 'claude-3.5']),
  temperature: z.number().min(0).max(2).default(0.7),
})

export async function createNode(formData: FormData) {
  const result = nodePromptSchema.safeParse({
    prompt: formData.get('prompt'),
    model: formData.get('model'),
    temperature: Number(formData.get('temperature')),
  })

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Continue avec result.data...
}
```

### 10.2 XSS Prevention

```typescript
// ✅ Bon - sanitization des inputs utilisateur
import DOMPurify from 'dompurify'

export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: ['class', 'id'],
  })
}

// ✅ Bon - utiliser dangerouslySetInnerHTML avec précaution
export const MarkdownRenderer = ({ content }: { content: string }) => {
  const sanitized = sanitizeUserContent(content)
  
  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
```

### 10.3 API Key Security

```typescript
// ❌ Mauvais - clés API exposées côté client
export const API_KEY = 'sk-...'
const response = await fetch('https://api.openai.com/v1/chat', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
})

// ✅ Bon - utiliser server actions pour les clés API
// app/actions/generate.ts
'use server'

export async function generateLLM() {
  const apiKey = process.env.OPENAI_API_KEY
  
  const response = await fetch('https://api.openai.com/v1/chat', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
  
  return response.json()
}
```

### 10.4 CSRF Protection

```typescript
// ✅ Bon - utiliser Next.js CSRF tokens
// app/api/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const formData = await request.formData()
  
  // Validation du token CSRF
  const csrfToken = formData.get('csrfToken')
  if (!validateCSRFToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  
  // Revalidate les données sensibles
  revalidatePath('/dashboard')
  
  // ...
}
```

### 10.5 Environment Variables

```typescript
// ✅ Bon - validation des variables d'environnement
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)

// ❌ Mauvais - pas de validation
export const API_KEY = process.env.API_KEY
```

### 10.6 Content Security Policy

```typescript
// ✅ Bon - configurer CSP dans next.config
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';",
          },
        ],
      },
    ]
  },
}
```

---

## 📚 Références

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Guide](https://playwright.dev/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Standards de code créés pour le projet NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**