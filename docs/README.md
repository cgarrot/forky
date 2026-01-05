# Architecture NonLinear

> **Guide d'architecture et documentation du projet NonLinear**

---

## 📚 Documentation Complète

Cette architecture combine **Atomic Design** (pour le design system) et **Feature-Based Architecture** (pour la logique métier), optimisée pour supporter vos ambitions futures : multi-user, multimodal, voice interactions, nodes spécialisés, project mode et agents IA.

### 📋 Structure des Documents

| Document | Description | Pour Qui ? |
|-----------|-------------|--------------|
| [ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) | Vue d'ensemble, principes, avantages | 🎯 Tout le monde |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | Plan de migration étape par étape | 👨‍💻 Développeurs |
| [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) | Structure détaillée des features | 👨‍💻 Développeurs |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Design system atomique | 👨‍🎨 Designers |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Standards de code et bonnes pratiques | 👨‍💻 Développeurs |

---

## 🏗️ Architecture Hybride

Pourquoi l'architecture hybride ? Elle combine le meilleur des deux mondes :

### ✅ Design System (Atomic)
- Composants UI primitifs (atomes) → Button, Input, Badge, Modal
- Composants composés simples (molecules) → NodeHeader, FormField, QuickActionButton
- Sections UI complexes (organismes) → Sidebar, CanvasControls, ToastContainer
- Layouts complets (templates) → AppLayout, ProjectLayout

### ✅ Feature-Based (Logique Métier)
- Chaque fonctionnalité est un module autonome
- `src/features/[feature]/` → Contient composants, hooks, services, types
- API publique claire via `index.ts`
- Facile à ajouter/supprimer des features

### 📦 Packages Partagés
- `packages/ui/` → Design system (atomes → organismes)
- `packages/shared/` → Types, utils, algorithmes partagés
- `packages/config/` → Configuration centrale (env, LLM config)

### 📁 Monorepo Structure
- `apps/web/` → Frontend Next.js
- `apps/api/` → Backend (futur, Node.js/Express)
- `packages/` → Packages partagés
- `pnpm-workspace.yaml` → Configuration workspace

---

## 🚀 Pour Commencer

### 1. Comprendre l'Architecture

Lire d'abord [ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) pour comprendre :
- Vision globale
- Pourquoi l'hybride ?
- Structure détaillée
- Principes fondamentaux
- Avantages

### 2. Migrer le Code Existant

Suivre [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) :
- Phase 1 : Préparation (inventaire, plan)
- Phase 2 : Setup monorepo
- Phase 3 : Design system (créer atomes, molecules, organismes)
- Phase 4 : Migration features (canvas, nodes, sidebar, projects)
- Phase 5 : Nettoyage & validation

### 3. Implémenter de Nouvelles Features

Utiliser [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) comme référence :
- Structure standard d'une feature
- Liste des features avec leurs responsabilités
- Conventions de nommage
- Exemples d'implémentation

### 4. Suivre les Standards

Référer à [CODING_STANDARDS.md](./CODING_STANDARDS.md) pour :
- TypeScript strict
- React best practices
- Architecture patterns
- File structure
- Naming conventions
- Testing
- Git workflow
- Documentation
- Security

### 5. Utiliser le Design System

Consulter [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) pour :
- Atomes disponibles (Button, Input, Badge, etc.)
- Molecules (NodeHeader, FormField, QuickActionButton)
- Organismes (Sidebar, CanvasControls, ToastContainer)
- Templates (AppLayout, ProjectLayout)
- Tokens de design (couleurs, espacements, typographie)
- Storybook setup

---

## 📊 Vue d'Ensemble de la Nouvelle Structure

```
next-gen-chat/
├── docs/
│   ├── architecture/
│   │   ├── README.md              # 📚 Ce document
│   │   ├── ARCHITECTURE_HYBRID.md  # Vue d'ensemble
│   │   ├── MIGRATION_GUIDE.md       # Guide migration
│   │   ├── FEATURE_STRUCTURE.md    # Structure features
│   │   ├── DESIGN_SYSTEM.md         # Design system
│   │   └── CODING_STANDARDS.md      # Standards de code
│   ├── FUNCTIONAL_SPECIFICATION.md  # Spécification fonctionnelle
│   ├── ARCHITECTURE.md              # Architecture actuelle
│   ├── IDEAS.md                     # Idées d'amélioration
│   └── QUICK_REFERENCE.md           # Référence rapide
│
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   └── src/
│   │       ├── features/                 # 🎯 Features modules
│   │       │   ├── canvas/
│   │       │   ├── nodes/
│   │       │   ├── sidebar/
│   │       │   ├── projects/
│   │       │   ├── collaboration/     # Multi-user (futur)
│   │       │   ├── multimodal/        # Multimodal (futur)
│   │       │   ├── voice/            # Voice (futur)
│   │       │   ├── node-types/       # Nœuds spécialisés (futur)
│   │       │   ├── project-mode/      # Mode projet (futur)
│   │       │   └── agents/           # Agents IA (futur)
│   │       ├── app/                      # Next.js App Router
│   │       ├── components/               # Composants app-specific
│   │       ├── lib/                      # Store, API, utils
│   │       ├── hooks/                    # Hooks partagés
│   │       └── config/                  # Configuration
│   │
│   └── api/                          # Backend (futur)
│
├── packages/                          # 🎨 Shared Packages
│   ├── ui/                            # Design System (Atomic)
│   │   └── src/
│   │       ├── atoms/                    # Button, Input, Badge, Modal...
│   │       ├── molecules/                 # NodeHeader, FormField, QuickActionButton...
│   │       ├── organisms/                  # Sidebar, CanvasControls, ToastContainer...
│   │       ├── templates/                  # AppLayout, ProjectLayout...
│   │       └── styles/                    # Variables CSS
│   │
│   ├── shared/                         # Code partagé
│   │   └── src/
│   │       ├── types/                    # Node, Edge, Project...
│   │       ├── constants/                # Constants globales
│   │       ├── utils/                    # Utilitaires généraux
│   │       ├── graph/                    # Algorithmes de graphe
│   │       └── validation/                # Zod schemas
│   │
│   └── config/                         # Configuration partagée
│       └── src/
│           ├── env.ts                    # Variables d'environnement validées
│           └── llm.ts                    # Configuration LLM
│
├── pnpm-workspace.yaml               # 📦 Workspace configuration
├── package.json (root)             # Scripts monorepo
├── turbo.json (optionnel)         # Turborepo configuration
└── tsconfig.base.json               # TypeScript configuration de base
```

---

## 🎯 Avantages de cette Architecture

### Pour le Présent (MVP)
- ✅ Code organisé et maintenable
- ✅ Réutilisabilité maximale des composants UI
- ✅ Testabilité à tous les niveaux
- ✅ Types strict partout

### Pour le Futur (Ambitions)
- ✅ **Multi-user** : Feature `collaboration/` prête à être ajoutée
- ✅ **Multimodal** : Feature `multimodal/` avec upload images/vidéos
- ✅ **Voice** : Feature `voice/` pour voice-to-text et TTS
- ✅ **Nodes spécialisés** : Feature `node-types/` pour Plan, Flashcard, Présentation...
- ✅ **Project mode** : Feature `project-mode/` pour progression et agents
- ✅ **Agents IA** : Feature `agents/` pour orchestration autonome
- ✅ **Backend séparé** : Préparé pour dégager le backend dans une app dédiée
- ✅ **Monorepo** : Facile de gérer frontend et backend ensemble

---

## 📚 Chemins d'Apprentissage

### Nouveaux Développeurs
1. Lire [ARCHITECTURE_HYBRID.md](./ARCHITECTURE_HYBRID.md) ← **Commencer ici**
2. Suivre [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) ← **Guide pratique**
3. Référer à [CODING_STANDARDS.md](./CODING_STANDARDS.md) ← **Convention**
4. Explorer [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) ← **Composants disponibles**

### Designers
1. Lire [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) ← **Composants existants**
2. Consulter [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) ← **Quels composants nécessaires**
3. Suivre [CODING_STANDARDS.md](./CODING_STANDARDS.md) ← **Standards de design**

### Architectes/Leads
1. Lire tous les documents d'architecture
2. Comprendre les principes et patterns
3. Identifier les améliorations possibles

---

## 🔄 Workflow de Développement

### Créer une Nouvelle Feature

```bash
# 1. Créer la structure
mkdir -p apps/web/src/features/my-feature/{components,hooks,services,types}

# 2. Créer les fichiers
touch apps/web/src/features/my-feature/components/MyComponent.tsx
touch apps/web/src/features/my-feature/hooks/useMyFeature.ts
touch apps/web/src/features/my-feature/index.ts

# 3. Importer depuis les features
# Dans un composant/page :
import { MyComponent } from '@/features/my-feature'
```

### Ajouter un Nouveau Composant UI

```bash
# 1. Créer dans packages/ui/src/atoms/
mkdir packages/ui/src/atoms/MyComponent
touch packages/ui/src/atoms/MyComponent/MyComponent.tsx
touch packages/ui/src/atoms/MyComponent/index.ts
touch packages/ui/src/atoms/MyComponent/MyComponent.stories.tsx

# 2. Exporter depuis packages/ui/src/index.ts
# Ajouter : export * from './atoms/MyComponent'

# 3. Utiliser dans les features
import { MyComponent } from '@nonlinear/ui'
```

### Migrer du Code Existant

```bash
# 1. Identifier où va le code
# Vérifier : src/components/ ou src/lib/

# 2. Créer la feature correspondante
mkdir -p apps/web/src/features/appropriate-feature

# 3. Déplacer/créer les fichiers
# Copier dans features/[name]/components/
# Copier les hooks dans features/[name]/hooks/

# 4. Mettre à jour les imports
# Remplacer : import { Button } from '@/components/ui/Button'
# Par : import { Button } from '@nonlinear/ui'
```

---

## 🔧 Commandes Utiles

```bash
# Installation des dépendances
pnpm install

# Développement (tous les packages)
pnpm dev

# Développement (uniquement web)
pnpm web:dev

# Développement (uniquement ui package)
pnpm ui:dev

# Build (tous les packages)
pnpm build

# Build (uniquement web)
pnpm web:build

# Tests (tous les packages)
pnpm test

# Linter (tous les packages)
pnpm lint

# Type check
pnpm type-check

# Nettoyer build et node_modules
pnpm clean
```

---

## ❓ Questions Fréquentes

### Q : Dois-je utiliser des components locaux ou @nonlinear/ui ?

**R :** Toujours utiliser `@nonlinear/ui` pour les composants UI généraux (Button, Input, Modal, etc.). Créer des composants locaux seulement s'ils sont spécifiques à une feature et non réutilisables.

### Q : Quand créer une nouvelle feature vs un composant dans packages/ui ?

**R :** 
- Créer dans `packages/ui/` si : Composant UI réutilisable (Button, Input, Modal, FormField, etc.)
- Créer dans `src/features/[name]/` si : Logique métier avec composants spécifiques

### Q : Comment structurer une nouvelle feature complexe ?

**R :** Voir [FEATURE_STRUCTURE.md](./FEATURE_STRUCTURE.md) pour la structure standard et les exemples d'implémentation.

### Q : Dois-je utiliser Server Actions ou API Routes ?

**R :** 
- **Server Actions** : Pour les mutations internes (création nœud, update, delete)
- **API Routes** : Pour les endpoints publics, webhooks, streaming externe

### Q : Comment tester mes changements ?

**R :**
```bash
# Tests unitaires
pnpm test

# E2E tests (si configuré)
pnpm test:e2e

# Linting
pnpm lint

# Type check
pnpm type-check
```

### Q : Où mettre la configuration LLM ?

**R :** Dans `packages/config/src/llm.ts` pour les modèles, endpoints, etc. Variables d'environnement dans `packages/config/src/env.ts` (validées avec Zod).

### Q : Comment gérer l'état global ?

**R :** Utiliser Zustand dans `apps/web/src/lib/store/` pour l'état global du graphe (nodes, edges, viewport). État local d'une feature via `useState`.

### Q : Puis-je utiliser les anciens composants pendant la migration ?

**R :** Oui, c'est recommandé. Migrer progressivement :
1. Créer `packages/ui` et les atomes de base
2. Migrer une feature à la fois
3. Mettre à jour les imports progressivement
4. Ne pas supprimer l'ancien code tant que tout fonctionne

---

## 📞 Support & Ressources

### Documentation Officielle
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://docs.pmnd.rs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [pnpm Documentation](https://pnpm.io/workspaces/)
- [Turbo Documentation](https://turbo.build/repo/docs)

### Communauté
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Reactiflux Discord](https://discord.gg/reactiflux)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

### Outils Recommandés
- **VS Code** : Extensions ESLint, Prettier, Tailwind CSS IntelliSense
- **Storybook** : Pour la documentation et tests visuels des composants UI
- **Vitest** : Pour les tests unitaires rapides
- **Playwright** : Pour les tests E2E

---

## 🎉 Résumé

Cette architecture hybride est conçue pour :

✅ **Être maintenable** : Code organisé, clair et testé
✅ **Être scalable** : Facile d'ajouter de nouvelles features
✅ **Être future-proof** : Prête pour multi-user, multimodal, voice, agents
✅ **Être performante** : Optimisée avec React.memo, useMemo, useCallback
✅ **Être sécurisée** : Validation d'inputs, XSS prevention, API keys sécurisées
✅ **Être accessible** : WCAG AA minimum, navigation clavier, ARIA labels
✅ **Être collaborative** : Monorepo avec workspace pnpm pour frontend/backend

---

**Documentation d'architecture créée pour NonLinear v1.0**
**Dernière mise à jour : 2026-01-03**
