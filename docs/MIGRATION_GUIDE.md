# Guide de Migration vers Architecture Hybride

> **Plan d'action détaillé pour migrer l'application NonLinear vers l'architecture hybride**

---

## 📋 Table des Matières

1. [Pré-requis](#1-pré-requis)
2. [Vue d'Ensemble de la Migration](#2-vue-densemble-de-la-migration)
3. [Phase 1 : Préparation (Semaine 1)](#3-phase-1--préparation-semaine-1)
4. [Phase 2 : Setup Monorepo (Semaine 2)](#4-phase-2--setup-monorepo-semaine-2)
5. [Phase 3 : Design System (Semaines 3-4)](#5-phase-3--design-system-semaines-3-4)
6. [Phase 4 : Migration Features (Semaines 5-8)](#6-phase-4--migration-features-semaines-5-8)
7. [Phase 5 : Nettoyage & Validation (Semaines 9-10)](#7-phase-5--nettoyage--validation-semaines-9-10)
8. [Annexe : Checklist](#8-annexe--checklist)

---

## 1. Pré-requis

### Outils Nécessaires

```bash
# Installer pnpm globalement (si pas déjà fait)
npm install -g pnpm

# Vérifier la version
pnpm --version  # >= 8.0.0

# Installer Turborepo (optionnel mais recommandé)
pnpm add -Dw turbo
```

### Backup Avant Migration

```bash
# Créer une branche de migration
git checkout -b feature/hybrid-architecture-migration

# Committer tout le travail en cours
git add .
git commit -m "Pre-migration commit"

# Optionnel : Créer un tag de sauvegarde
git tag pre-migration-v1.0
```

### Connaître l'Architecture Actuelle

L'architecture actuelle :

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── components/                    # ❌ Structure mixte
│   ├── canvas/
│   ├── sidebar/
│   └── ui/
├── lib/                          # ❌ Logique mélangée
│   ├── llm/
│   ├── graph/
│   ├── store/
│   └── utils/
├── hooks/                        # ❌ Hooks dispersés
└── types/
```

---

## 2. Vue d'Ensemble de la Migration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIGRATION PHASES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1         Phase 2         Phase 3         Phase 4   │
│  Préparation      Setup           Design           Features   │
│                  Monorepo         System           Migration   │
│                                                                 │
│  Sem 1           Sem 2           Sem 3-4         Sem 5-8   │
│                                                                 │
│  ● Backup         ● pnpm          ● Atomes          ● canvas  │
│  ● Git           ● workspace      ● Molecules       ● nodes    │
│                  ● packages       ● Storybook      ● sidebar  │
│                                  ● Documentation  ● projects  │
│                                                                 │
│  Phase 5                                                        │
│  Validation                                                     │
│                                                                 │
│  Sem 9-10                                                      │
│                                                                 │
│  ● Tests          ● Cleanup         ● Optimisation                │
│  ● Lint          ● Documentation  ● Deployment                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1 : Préparation (Semaine 1)

### 3.1 Inventaire du Code Existant

#### Étape 1 : Analyser les Composants UI Actuels

```bash
# Lister tous les composants React
find src/components -name "*.tsx" -o -name "*.ts"

# Analyser les dépendances
cat src/components/canvas/Canvas.tsx | grep "import"
```

**Action :** Créer un document d'inventaire

Créer `docs/migration/component-inventory.md` :

```markdown
# Inventaire des Composants

## Atomes Existants
- Button.tsx (src/components/ui/Button.tsx)
- Input.tsx (src/components/ui/Input.tsx)
- Modal.tsx (src/components/ui/Modal.tsx)
- Toast.tsx (src/components/ui/Toast.tsx)
- Badge.tsx (src/components/ui/Badge.tsx)

## Molecules Possibles
- FormField (à créer à partir de Input + Label)
- NodeHeader (à extraire de CustomNode)
- QuickActionButton (à créer)

## Organismes
- Sidebar (src/components/sidebar/Sidebar.tsx)
- CanvasControls (à extraire de Canvas.tsx)
```

#### Étape 2 : Analyser la Logique Métier

```bash
# Identifier les domaines métier
find src/lib -type d

# Identifier les hooks
find src/hooks -name "*.ts"
```

**Action :** Créer la carte des features

Créer `docs/migration/feature-map.md` :

```markdown
# Carte des Features

## 1. Canvas
- Composants : Canvas.tsx, CanvasControls.tsx
- Logique : lib/graph/*
- Hooks : useKeyboardShortcuts.ts
- API : Aucune (pour l'instant)

## 2. Nodes
- Composants : CustomNode.tsx, NodePrompt.tsx, NodeResponse.tsx
- Logique : lib/graph/cascade.ts, lib/llm/*
- Hooks : useGeneration.ts, useAutoSave.ts

## 3. Sidebar
- Composants : Sidebar.tsx, NewNodeButton.tsx, ProjectList.tsx
- Logique : lib/utils/projects.ts
- Hooks : useAutoSave.ts

## 4. Projects
- Composants : SystemPromptEditor.tsx, QuickActionsList.tsx
- Logique : lib/utils/projects.ts
- Persistence : LocalStorage
```

### 3.2 Créer le Plan de Migration

```bash
# Créer le plan détaillé
mkdir -p docs/migration
touch docs/migration/plan.md
```

**Contenu du plan :**

```markdown
# Plan de Migration

## Ordre de Migration Prioritaire

1. packages/ui (Design System)
2. packages/shared (Types, utils, graph)
3. packages/config (Configuration)
4. src/features/canvas
5. src/features/nodes
6. src/features/sidebar
7. src/features/projects

## Risques et Mitigations

### Risque : Cycles de dépendances
- **Mitigation :** Utiliser `packages/shared` pour les types communs
- **Vérification :** Turbo détectera les cycles

### Risque : Rupture des imports
- **Mitigation :** Configurer path aliases progressivement
- **Vérification :** TypeScript compiler erreurs

### Risque : Tests cassés
- **Mitigation :** Mettre à jour les imports dans les tests
- **Vérification :** Exécuter `pnpm test` après chaque migration
```

### 3.3 Configurer Git pour la Migration

```bash
# Créer un .gitignore temporaire pour les fichiers de migration
echo "docs/migration/" >> .gitignore

# Créer une branche de migration par feature
git checkout -b feature/migration-setup
```

---

## 4. Phase 2 : Setup Monorepo (Semaine 2)

### 4.1 Créer la Structure de Dossiers

```bash
# Créer la structure monorepo
mkdir -p apps/web apps/api
mkdir -p packages/ui packages/shared packages/config
mkdir -p apps/web/src
mkdir -p docs/architecture
```

### 4.2 Configurer pnpm-workspace.yaml

```bash
# Créer le fichier workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF
```

### 4.3 Migrer package.json Root

```bash
# Renommer l'ancien package.json
mv package.json package.json.old

# Créer le nouveau root package.json
cat > package.json << 'EOF'
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
EOF
```

### 4.4 Migrer le Code dans apps/web

```bash
# Déplacer le code existant
mv src/* apps/web/src/
mv public apps/web/
mv next.config.ts apps/web/
mv tsconfig.json apps/web/
mv .env.local apps/web/
```

### 4.5 Créer package.json apps/web

```bash
cat > apps/web/package.json << 'EOF'
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
EOF
```

### 4.6 Créer tsconfig.base.json

```bash
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
EOF
```

### 4.7 Créer turbo.json (optionnel)

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
EOF
```

### 4.8 Installer les Dépendances

```bash
# Installer toutes les dépendances du workspace
pnpm install

# Vérifier que les workspaces sont bien reconnus
pnpm list --depth=0
```

### 4.9 Tester le Setup

```bash
# Lancer le dev server
pnpm web:dev

# Ouvrir http://localhost:3000
# Vérifier que l'app fonctionne toujours
```

---

## 5. Phase 3 : Design System (Semaines 3-4)

### 5.1 Créer packages/ui

```bash
# Initialiser le package UI
mkdir -p packages/ui/src/{atoms,molecules,organisms,templates}
cd packages/ui

cat > package.json << 'EOF'
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
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@storybook/react": "^8.0.0",
    "@storybook/react-vite": "^8.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0"
  }
}
EOF
```

### 5.2 Migrer les Atomes

#### Étape 1 : Migrer Button

```bash
# Créer le dossier Button
mkdir -p packages/ui/src/atoms/Button

# Copier le fichier existant
cp apps/web/src/components/ui/Button.tsx packages/ui/src/atoms/Button/Button.tsx

# Créer l'index
cat > packages/ui/src/atoms/Button/index.ts << 'EOF'
export { Button } from './Button'
export type { ButtonProps } from './Button'
EOF

# Créer le story Storybook
cat > packages/ui/src/atoms/Button/Button.stories.tsx << 'EOF'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
}

export const WithIcon: Story = {
  args: {
    children: 'Add',
    icon: <span>➕</span>,
  },
}
EOF
```

#### Étape 2 : Migrer Input

```bash
mkdir -p packages/ui/src/atoms/Input
cp apps/web/src/components/ui/Input.tsx packages/ui/src/atoms/Input/Input.tsx

cat > packages/ui/src/atoms/Input/index.ts << 'EOF'
export { Input } from './Input'
export type { InputProps } from './Input'
EOF

cat > packages/ui/src/atoms/Input/Input.stories.tsx << 'EOF'
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta = {
  title: 'Atoms/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    placeholder: 'Entrez votre texte...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Nom',
    placeholder: 'Entrez votre nom...',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Désactivé',
    disabled: true,
  },
}
EOF
```

#### Étape 3 : Migrer Modal

```bash
mkdir -p packages/ui/src/atoms/Modal
cp apps/web/src/components/ui/Modal.tsx packages/ui/src/atoms/Modal/Modal.tsx

cat > packages/ui/src/atoms/Modal/index.ts << 'EOF'
export { Modal } from './Modal'
export type { ModalProps } from './Modal'
EOF

cat > packages/ui/src/atoms/Modal/Modal.stories.tsx << 'EOF'
import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from './Modal'

const meta = {
  title: 'Atoms/Modal',
  component: Modal,
  tags: ['autodocs'],
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: <p>Contenu de la modale</p>,
  },
}

export const WithoutHeader: Story = {
  args: {
    isOpen: true,
    children: <p>Modal sans titre</p>,
  },
}

export const WithActions: Story = {
  args: {
    isOpen: true,
    title: 'Confirmer',
    children: <p>Êtes-vous sûr ?</p>,
    footer: (
      <div className="flex gap-2 justify-end">
        <button className="px-4 py-2 rounded bg-gray-200">Annuler</button>
        <button className="px-4 py-2 rounded bg-blue-600 text-white">Confirmer</button>
      </div>
    ),
  },
}
EOF
```

### 5.3 Créer les Molecules

#### Créer NodeHeader

```bash
mkdir -p packages/ui/src/molecules/NodeHeader

cat > packages/ui/src/molecules/NodeHeader/NodeHeader.tsx << 'EOF'
import { Button } from '@nonlinear/ui/atoms'
import { MoreVertical, Trash2, Edit3 } from 'lucide-react'

export interface NodeHeaderProps {
  title?: string
  status?: 'idle' | 'loading' | 'error' | 'stale'
  onEdit?: () => void
  onDelete?: () => void
}

export const NodeHeader = ({ title, status, onEdit, onDelete }: NodeHeaderProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'loading':
        return <span className="text-blue-600 text-sm">⏳ Génération...</span>
      case 'error':
        return <span className="text-red-600 text-sm">❌ Erreur</span>
      case 'stale':
        return <span className="text-orange-600 text-sm">🔄 Obsolète</span>
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {title && <span className="font-medium text-gray-900">{title}</span>}
      </div>
      
      <div className="flex items-center gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            icon={<Edit3 className="h-4 w-4" />}
          />
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            icon={<Trash2 className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  )
}
EOF

cat > packages/ui/src/molecules/NodeHeader/index.ts << 'EOF'
export { NodeHeader } from './NodeHeader'
export type { NodeHeaderProps } from './NodeHeader'
EOF
```

#### Créer QuickActionButton

```bash
mkdir -p packages/ui/src/molecules/QuickActionButton

cat > packages/ui/src/molecules/QuickActionButton/QuickActionButton.tsx << 'EOF'
import { Button } from '@nonlinear/ui/atoms'

export interface QuickActionButtonProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  color?: string
}

export const QuickActionButton = ({ label, onClick, icon, color = 'blue' }: QuickActionButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`w-full justify-start text-left border-l-4 ${color === 'blue' && 'border-blue-600'} ${color === 'green' && 'border-green-600'} ${color === 'orange' && 'border-orange-600'}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  )
}
EOF

cat > packages/ui/src/molecules/QuickActionButton/index.ts << 'EOF'
export { QuickActionButton } from './QuickActionButton'
export type { QuickActionButtonProps } from './QuickActionButton'
EOF
```

### 5.4 Créer les Organismes

#### Créer Sidebar (squelette)

```bash
mkdir -p packages/ui/src/organisms/Sidebar

cat > packages/ui/src/organisms/Sidebar/Sidebar.tsx << 'EOF'
'use client'

import { ReactNode } from 'react'

export interface SidebarProps {
  children: ReactNode
  isOpen?: boolean
  onClose?: () => void
  width?: number
}

export const Sidebar = ({ children, isOpen = true, onClose, width = 240 }: SidebarProps) => {
  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ width }}
    >
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </aside>
  )
}
EOF

cat > packages/ui/src/organisms/Sidebar/index.ts << 'EOF'
export { Sidebar } from './Sidebar'
export type { SidebarProps } from './Sidebar'
EOF
```

### 5.5 Créer les Templates

#### Créer AppLayout

```bash
mkdir -p packages/ui/src/templates/AppLayout

cat > packages/ui/src/templates/AppLayout/AppLayout.tsx << 'EOF'
'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@nonlinear/ui/organisms'

export interface AppLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

export const AppLayout = ({ children, sidebar }: AppLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {sidebar && <Sidebar>{sidebar}</Sidebar>}
      <main className="flex-1 h-full">
        {children}
      </main>
    </div>
  )
}
EOF

cat > packages/ui/src/templates/AppLayout/index.ts << 'EOF'
export { AppLayout } from './AppLayout'
export type { AppLayoutProps } from './AppLayout'
EOF
```

### 5.6 Créer les Index Files

```bash
# Créer l'index principal de packages/ui
cat > packages/ui/src/index.ts << 'EOF'
// Atoms
export * from './atoms'

// Molecules
export * from './molecules'

// Organisms
export * from './organisms'

// Templates
export * from './templates'
EOF

# Créer les index dans chaque dossier
for dir in atoms molecules organisms templates; do
  cat > packages/ui/src/$dir/index.ts << 'EOF'
export * from './*'
EOF
done
```

### 5.7 Configurer Storybook

```bash
cat > packages/ui/.storybook/main.ts << 'EOF'
import type { StorybookConfig } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import { Themes } from '@storybook/addon-themes'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    withThemeByDataAttribute,
    Themes,
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
}

export default config
EOF

cat > packages/ui/.storybook/preview.ts << 'EOF'
import type { Preview } from '@storybook/react'
import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
}

export default preview
EOF
```

### 5.8 Configurer Vite pour le Build

```bash
cat > packages/ui/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nonlinear/ui': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'nonlinear-ui',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
})
EOF
```

### 5.9 Tester le Package UI

```bash
cd packages/ui

# Installer les dépendances
pnpm install

# Lancer Storybook
pnpm dev

# Dans un autre terminal, build le package
pnpm build

# Vérifier la sortie
ls -la dist/
```

### 5.10 Mettre à jour apps/web pour utiliser @nonlinear/ui

```bash
cd ../..

# Ajouter la dépendance dans apps/web
cd apps/web
pnpm add @nonlinear/ui

# Mettre à jour les imports dans un premier composant
# apps/web/src/components/canvas/CustomNode.tsx
# Remplacer :
#   import { Button } from '@/components/ui/Button'
# Par :
#   import { Button } from '@nonlinear/ui'
```

---

## 6. Phase 4 : Migration Features (Semaines 5-8)

### 6.1 Créer packages/shared

```bash
mkdir -p packages/shared/src/{types,constants,utils,graph,validation}

cat > packages/shared/package.json << 'EOF'
{
  "name": "@nonlinear/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
    },
    "./graph": {
      "types": "./dist/graph/index.d.ts",
      "import": "./dist/graph/index.js"
    },
    "./validation": {
      "types": "./dist/validation/index.d.ts",
      "import": "./dist/validation/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
EOF
```

### 6.2 Migrer les Types

```bash
# Migrer Node type
cat > packages/shared/src/types/node.types.ts << 'EOF'
export type NodeStatus = 'idle' | 'loading' | 'error' | 'stale'

export interface Node {
  id: string
  prompt: string
  response?: string
  summary?: string
  status: NodeStatus
  position: { x: number; y: number }
  parentIds: string[]
  createdAt: number
  updatedAt: number
  metadata?: {
    model?: string
    tokens?: number
    [key: string]: any
  }
}

export interface NodeMap {
  [id: string]: Node
}
EOF

# Migrer Edge type
cat > packages/shared/src/types/edge.types.ts << 'EOF'
export interface Edge {
  id: string
  source: string
  target: string
  createdAt: number
}

export interface EdgeMap {
  [id: string]: Edge
}
EOF

# Migrer Project type
cat > packages/shared/src/types/project.types.ts << 'EOF'
export interface Project {
  id: string
  name: string
  nodes: Record<string, any>
  edges: Record<string, any>
  systemPrompt: string
  quickActions: QuickAction[]
  viewport: Viewport
  createdAt: number
  updatedAt: number
}

export interface QuickAction {
  id: string
  label: string
  instruction: string
  order: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}
EOF

# Créer l'index types
cat > packages/shared/src/types/index.ts << 'EOF'
export * from './node.types'
export * from './edge.types'
export * from './project.types'
EOF
```

### 6.3 Migrer les Graph Algorithms

```bash
# Copier les algorithmes de graphe
cp apps/web/src/lib/graph/* packages/shared/src/graph/

# Créer l'index graph
cat > packages/shared/src/graph/index.ts << 'EOF'
export * from './cascade'
export * from './index'
EOF
```

### 6.4 Migrer les Utils

```bash
# Copier les utilitaires
cp apps/web/src/lib/utils/* packages/shared/src/utils/

# Créer l'index utils
cat > packages/shared/src/utils/index.ts << 'EOF'
export * from './cn'
export * from './positioning'
export * from './projects'
EOF
```

### 6.5 Migrer la Feature `canvas`

```bash
# Créer la structure de feature
mkdir -p apps/web/src/features/canvas/{components,hooks,services,types,utils}

# Migrer Canvas.tsx
cp apps/web/src/components/canvas/Canvas.tsx apps/web/src/features/canvas/components/

# Créer les hooks de canvas
cat > apps/web/src/features/canvas/hooks/useCanvasState.ts << 'EOF'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CanvasState {
  nodes: Record<string, any>
  edges: Record<string, any>
  selectedNodeIds: Set<string>
  viewport: { x: number; y: number; zoom: number }
  
  // Actions
  addNode: (node: any) => void
  updateNode: (id: string, updates: Partial<any>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: any) => void
  deleteEdge: (id: string) => void
  setViewport: (viewport: any) => void
}

export const useCanvasState = create<CanvasState>()(
  immer((set) => ({
    nodes: {},
    edges: {},
    selectedNodeIds: new Set(),
    viewport: { x: 0, y: 0, zoom: 1 },
    
    addNode: (node) => set((state) => {
      state.nodes[node.id] = node
    }),
    
    updateNode: (id, updates) => set((state) => {
      Object.assign(state.nodes[id], updates)
    }),
    
    deleteNode: (id) => set((state) => {
      delete state.nodes[id]
    }),
    
    addEdge: (edge) => set((state) => {
      state.edges[edge.id] = edge
    }),
    
    deleteEdge: (id) => set((state) => {
      delete state.edges[id]
    }),
    
    setViewport: (viewport) => set({ viewport }),
  }))
)
EOF

# Créer l'index de la feature
cat > apps/web/src/features/canvas/index.ts << 'EOF'
export * from './components'
export * from './hooks'
export * from './services'
export * from './types'
export * from './utils'
EOF
```

### 6.6 Migrer la Feature `nodes`

```bash
mkdir -p apps/web/src/features/nodes/{components,hooks,services,types}

# Migrer les composants de nœuds
cp apps/web/src/components/canvas/CustomNode.tsx apps/web/src/features/nodes/components/
cp apps/web/src/components/canvas/NodePrompt.tsx apps/web/src/features/nodes/components/
cp apps/web/src/components/canvas/NodeResponse.tsx apps/web/src/features/nodes/components/

# Migrer useGeneration hook
cp apps/web/src/hooks/useGeneration.ts apps/web/src/features/nodes/hooks/

# Créer le service LLM
cat > apps/web/src/features/nodes/services/llm-service.ts << 'EOF'
import { streamText } from 'ai'
import { buildContext } from '@nonlinear/shared/graph'

export async function generateLLMResponse(
  nodeId: string,
  nodes: Record<string, any>,
  edges: Record<string, any>,
  onChunk: (chunk: string) => void,
  onComplete: (response: string) => void,
  onError: (error: Error) => void
) {
  try {
    const context = buildContext(nodeId, nodes, edges)
    
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
EOF

# Mettre à jour CustomNode pour utiliser @nonlinear/ui
# Remplacer les imports locaux par @nonlinear/ui
# apps/web/src/features/nodes/components/CustomNode.tsx
EOF
```

### 6.7 Migrer la Feature `sidebar`

```bash
mkdir -p apps/web/src/features/sidebar/{components,hooks,services}

# Migrer les composants sidebar
cp apps/web/src/components/sidebar/*.tsx apps/web/src/features/sidebar/components/

# Migrer useAutoSave hook
cp apps/web/src/hooks/useAutoSave.ts apps/web/src/features/sidebar/hooks/

# Migrer le service projects
cp apps/web/src/lib/utils/projects.ts apps/web/src/features/sidebar/services/

# Mettre à jour les imports pour utiliser @nonlinear/ui
EOF
```

### 6.8 Migrer la Feature `projects`

```bash
mkdir -p apps/web/src/features/projects/{components,hooks,services}

# Migrer SystemPromptEditor
cp apps/web/src/components/sidebar/SystemPromptEditor.tsx apps/web/src/features/projects/components/

# Migrer QuickActionsList
cp apps/web/src/components/sidebar/QuickActionsList.tsx apps/web/src/features/projects/components/

# Migrer ProjectList
cp apps/web/src/components/sidebar/ProjectList.tsx apps/web/src/features/projects/components/
EOF
```

---

## 7. Phase 5 : Nettoyage & Validation (Semaines 9-10)

### 7.1 Nettoyer l'Ancienne Structure

```bash
# Supprimer les anciens dossiers vides
rm -rf apps/web/src/components
rm -rf apps/web/src/lib
rm -rf apps/web/src/hooks

# Vérifier qu'il ne reste pas de fichiers orphelins
find apps/web/src -name "*.ts" -o -name "*.tsx"
```

### 7.2 Configurer les Path Aliases

```bash
# Mettre à jour apps/web/tsconfig.json
cat > apps/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"],
      "@nonlinear/ui": ["../../packages/ui/src"],
      "@nonlinear/shared": ["../../packages/shared/src"],
      "@nonlinear/config": ["../../packages/config/src"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
```

### 7.3 Mettre à jour le Layout Principal

```bash
# Mettre à jour apps/web/src/app/layout.tsx
cat > apps/web/src/app/layout.tsx << 'EOF'
import { AppLayout } from '@nonlinear/ui'
import { Sidebar } from '@nonlinear/ui/organisms'
import { SidebarContent } from '@/features/sidebar/components/Sidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout sidebar={<Sidebar />}>
      {children}
    </AppLayout>
  )
}
EOF
```

### 7.4 Mettre à jour la Page Principale

```bash
# Mettre à jour apps/web/src/app/page.tsx
# Remplacer les imports locaux par les features
# Par exemple :
#   import { Canvas } from '@/components/canvas/Canvas'
# Devient :
#   import { Canvas } from '@/features/canvas'
EOF
```

### 7.5 Exécuter Tous les Tests

```bash
# Installer les dépendances
pnpm install

# Build tous les packages
pnpm build

# Exécuter les tests
pnpm test

# Linter
pnpm lint

# Type check
pnpm type-check
```

### 7.6 Vérifier le Fonctionnement

```bash
# Lancer le dev server
pnpm dev

# Tests manuels :
# 1. Créer un nœud → OK ?
# 2. Connecter des nœuds → OK ?
# 3. Générer une réponse → OK ?
# 4. Sauvegarder un projet → OK ?
# 5. Charger un projet → OK ?
# 6. Mode focus → OK ?
# 7. Cascade update → OK ?
```

### 7.7 Performance Check

```bash
# Installer lighthouse (si pas déjà fait)
pnpm add -Dw lighthouse

# Analyser l'app
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report

# Vérifier les scores :
# - Performance > 90
# - Accessibility > 90
# - Best Practices > 90
# - SEO > 90
```

---

## 8. Annexe : Checklist

### ✅ Phase 1 : Préparation
- [ ] Backup de code (git tag)
- [ ] Inventaire des composants UI
- [ ] Carte des features
- [ ] Plan de migration documenté
- [ ] Branche git créée

### ✅ Phase 2 : Setup Monorepo
- [ ] Structure de dossiers créée
- [ ] pnpm-workspace.yaml configuré
- [ ] Root package.json créé
- [ ] apps/web package.json créé
- [ ] tsconfig.base.json créé
- [ ] turbo.json créé (optionnel)
- [ ] Dépendances installées
- [ ] Dev server fonctionne

### ✅ Phase 3 : Design System
- [ ] packages/ui initialisé
- [ ] Atomes migrés (Button, Input, Modal, Badge, etc.)
- [ ] Molecules créées (NodeHeader, QuickActionButton, etc.)
- [ ] Organismes créés (Sidebar, ToastContainer, etc.)
- [ ] Templates créés (AppLayout, ProjectLayout)
- [ ] Storybook configuré
- [ ] Stories créées pour chaque composant
- [ ] Package UI construit
- [ ] Tests UI passent

### ✅ Phase 4 : Migration Features
- [ ] packages/shared initialisé
- [ ] Types migrés
- [ ] Graph algorithms migrés
- [ ] Utils migrés
- [ ] Feature canvas migrée
- [ ] Feature nodes migrée
- [ ] Feature sidebar migrée
- [ ] Feature projects migrée
- [ ] Imports mis à jour (@nonlinear/ui)
- [ ] Ancienne structure supprimée

### ✅ Phase 5 : Validation
- [ ] Path aliases configurés
- [ ] Layout mis à jour
- [ ] Page principale mise à jour
- [ ] Tous les tests passent
- [ ] Lint clean
- [ ] Type check OK
- [ ] Tests manuels OK
- [ ] Performance OK
- [ ] Documentation mise à jour

### 🎯 Final Checks
- [ ] L'app fonctionne sans erreurs
- [ ] Pas de warnings dans la console
- [ ] Design cohérent partout
- [ ] Prêt pour futures features (multi-user, multimodal)
- [ ] README mis à jour
- [ ] Git commit avec message clair
- [ ] Merge dans main (après review)

---

## 🚨 Dépannage

### Problème : Imports cassés après migration

**Solution :**
```bash
# Vérifier les path aliases
cat apps/web/tsconfig.json | grep "paths"

# Nettoyer le cache TypeScript
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# Recharger le serveur de développement
pnpm dev
```

### Problème : Cycle de dépendances

**Solution :**
```bash
# Analyser les dépendances
pnpm why @nonlinear/ui

# Retirer la dépendance circulaire
# Par exemple : packages/ui ne doit pas dépendre de @nonlinear/web
```

### Problème : Build échoue

**Solution :**
```bash
# Build en mode verbose
pnpm build --reporter=verbose

# Vérifier les erreurs TypeScript
cd packages/ui && pnpm exec tsc --noEmit
```

### Problème : Tests échouent

**Solution :**
```bash
# Exécuter les tests en mode watch
pnpm test --watch

# Débugger avec console.log
# Ne pas commiter les logs de debug !
```

---

**Guide de migration créé pour le projet NonLinear - Architecture Hybride**
**Dernière mise à jour : 2026-01-03**
