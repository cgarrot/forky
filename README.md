# forky 🚀

> Plateforme d'exploration non-linéaire des idées propulsée par l'IA

forky est une application moderne de brainstorming qui permet de créer des graphes de nœuds connectés avec génération LLM en temps réel. Construite avec une architecture hybride (Atomic Design + Feature-Based) pour une scalabilité maximale.

## 🎨 Caractéristiques

- ✨ **Canvas infini** avec React Flow - Déplacez-vous librement dans votre espace d'idées
- 🧠 **Nœuds LLM** - Génération de réponses intelligentes avec streaming
- 🔗 **Connexions dynamiques** - Créez des branches et des relations entre idées
- 🎯 **Mode focus** - Sélectionnez et surlignez des zones spécifiques
- 💾 **Système de projets** - Sauvegardez et gérez plusieurs projets
- ⚡ **Quick Actions** - Créez des macros pour les tâches récurrentes
- 🎛️ **System prompt configurable** - Personnalisez le comportement de l'IA par projet

## 🏗️ Architecture

forky utilise une architecture **monorepo hybride** combinant :

- **Atomic Design** via `packages/ui` - Design system cohérent et réutilisable
- **Feature-Based Architecture** via `apps/web/src/features` - Logique métier organisée par fonctionnalité

### Structure du projet

```
forky/
├── apps/
│   ├── web/                    # Frontend Next.js 15
│   │   └── src/
│   │       ├── app/             # Next.js App Router
│   │       └── features/        # Features (canvas, nodes, sidebar, projects)
│   └── api/                    # Backend NestJS (structure préparée)
│
├── packages/
│   ├── ui/                     # Design System (Atomic Design)
│   │   ├── atoms/              # Button, Input, Modal, Badge, etc.
│   │   ├── molecules/           # NodeHeader, FormField, etc.
│   │   ├── organisms/          # Sidebar, CanvasControls, etc.
│   │   └── templates/          # AppLayout, ProjectLayout, etc.
│   ├── shared/                  # Code partagé
│   │   ├── types/              # Types TypeScript
│   │   ├── constants/          # Constantes d'application
│   │   ├── utils/              # Utilitaires généraux
│   │   ├── graph/              # Algorithmes de graphe (cascade, buildContext)
│   │   └── validation/         # Schémas Zod
│   ├── config/                  # Configuration partagée
│   │   ├── env.ts              # Variables d'environnement
│   │   └── llm.ts              # Configuration LLM
│   └── contracts/              # Contrats partagés (DTOs, events, interfaces)
│
├── pnpm-workspace.yaml         # Workspace pnpm
├── turbo.json                 # Configuration Turborepo
├── tsconfig.base.json         # TypeScript base config
└── docs/                     # Documentation technique
```

## 🛠️ Stack Technique

### Frontend (`apps/web`)
- **Framework**: Next.js 15.0.0
- **React**: 19.0.0
- **TypeScript**: 5.0.0 (strict mode)
- **Styling**: Tailwind CSS 3.4.0
- **State Management**: Zustand 5.0.0 + Immer 10.0.0
- **Graph Rendering**: @xyflow/react 12.0.0
- **Animations**: Framer Motion 11.0.0
- **Icons**: Lucide React 0.400.0
- **Markdown**: React Markdown 9.0.0

### Backend (`apps/api` - futur)
- **Framework**: NestJS 11+
- **TypeScript**: Strict mode
- **Auth**: JWT
- **Validation**: class-validator, class-transformer

### Build Tools
- **Package Manager**: pnpm 8.0.0+
- **Monorepo**: Turborepo 2.0.0+
- **TypeScript**: 5.0.0+

## 🚀 Démarrage Rapide

### Prérequis

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Installer les dépendances
pnpm install

# Lancer tous les apps en développement
pnpm dev

# Lancer uniquement le frontend
pnpm web:dev

# Lancer uniquement le backend (quand implémenté)
pnpm api:dev
```

### Scripts disponibles

| Commande | Description |
|-----------|-------------|
| `pnpm dev` | Lancer tous les apps en mode dev |
| `pnpm build` | Construire tous les apps |
| `pnpm lint` | Linter tous les apps |
| `pnpm clean` | Nettoyer node_modules et builds |
| `pnpm web:dev` | Lancer uniquement le frontend (localhost:3000) |
| `pnpm web:build` | Construire uniquement le frontend |
| `pnpm api:dev` | Lancer uniquement l'API (localhost:3001) |
| `pnpm api:build` | Construire uniquement l'API |

## 📚 Documentation

- [Architecture Hybride](./docs/ARCHITECTURE_HYBRID.md) - Vue d'ensemble de l'architecture
- [Frontend Architecture](./docs/FRONTEND_ARCHITECTURE.md) - Architecture technique du frontend
- [Design System](./docs/DESIGN_SYSTEM.md) - Documentation du design system
- [Feature Structure](./docs/FEATURE_STRUCTURE.md) - Structure des features
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) - Plan d'implémentation détaillé

## 🎯 Roadmap

### v0.1.0 - Phase actuelle
- ✅ Structure monorepo avec pnpm workspace
- ✅ Next.js 15 avec App Router
- ✅ Structure feature-based pour canvas, nodes, sidebar, projects
- ✅ Design system Atomic Design (à implémenter)
- 🚧 Nœuds avec génération LLM
- 🚧 Canvas infini avec React Flow
- 🚧 Système de projets avec sauvegarde

### v0.2.0 - Prochainement
- Design System complet (atomes, molecules, organismes)
- Intégration complète de React Flow
- Quick Actions et System Prompt
- Export de projets

### v0.3.0 - Futur
- Backend NestJS complet
- Multi-user en temps réel
- Contenu multimodal (images, vidéos)
- Interactions vocales

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez consulter [CONTRIBUTING.md](./CONTRIBUTING.md) pour plus de détails.

## 📄 Licence

MIT © forky Team

---

**forky v0.1.0** - Créé avec ❤️ par l'équipe forky
