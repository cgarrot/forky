# forky 🚀

> AI-powered platform for non-linear idea exploration.

forky is a graph-based brainstorming app to build, connect, and enrich ideas using streaming LLM nodes. The project is a monorepo with a Next.js frontend and a NestJS backend, backed by shared packages (app UI, design system, state, shared core/UI utilities, configuration, and database schema).

## ✨ Highlights

- Infinite canvas for idea mapping
- Streaming LLM generation inside nodes
- Projects, sharing, and real-time collaboration (Socket.io)
- Per-project system prompt configuration
- Hybrid architecture: Atomic Design + Feature-Based + Screens, package-first UI/state

## 🧭 Architecture and structure

Monorepo organized around two apps and shared packages:

```
forky/
├── apps/
│   ├── web/                     # Next.js frontend (App Router)
│   └── api/                     # Thin NestJS bootstrap (package-first)
├── packages/
│   ├── api/                     # NestJS backend core + modules
│   ├── db/                      # Prisma schema + migrations + seeds
│   ├── app-ui/                  # App UI (features + screens) -> @forky/app-ui
│   ├── ui-kit/                  # Design system (atoms/molecules/organisms) -> @forky/ui
│   ├── state/                   # Zustand store + domain state
│   ├── client-api/              # Generated API client (typescript-axios)
│   ├── shared-core/             # Types, graph, validation, core utils
│   ├── shared-ui/               # UI-only utilities (e.g. cn)
│   └── config/                  # Env + LLM configuration
└── turbo.json / pnpm-workspace.yaml
```

## 📚 Docs

- `docs/ARCHITECTURE.md`: system overview and runtime flows
- `docs/CONVENTIONS.md`: module boundaries and contribution rules

## 🛠️ Tech stack

**Frontend (`apps/web`)**
- Next.js 16, React 19 (stable), strict TypeScript
- Thin shell consuming `@forky/app-ui` (screens/features) + `@forky/ui` (design system) + `@forky/state`
- Tailwind CSS, Zustand + Immer
- React Flow (`@xyflow/react`) for the canvas
- Direct API access via `@forky/client-api` through the state layer

**Backend (`packages/api` + `apps/api`)**
- NestJS 11, strict TypeScript (package-first core + thin bootstrap)
- Prisma + PostgreSQL
- JWT auth, class-validator / class-transformer
- Socket.io for real-time collaboration

**Build & tooling**
- pnpm workspaces, Turborepo, ESLint, Prettier

## 🚀 Quick start

### Prerequisites
- Node.js >= 20.9
- pnpm >= 8

### Compatibility matrix
- Next.js 16.1.3
- React 19.2.3 / React DOM 19.2.3
- TypeScript 5.9.3

### Install

```bash
pnpm install

# Run the whole monorepo
pnpm dev

# Run frontend only
pnpm web:dev

# Run API only
pnpm api:dev
```

### Database (API)

A Postgres + Redis stack is available via Docker:

```bash
docker compose up -d
```

Then configure `DATABASE_URL` (and `REDIS_URL` if needed) and run:

```bash
pnpm --filter @forky/api-app db:migrate:dev
pnpm --filter @forky/api-app db:seed
```

### Environment variables

The environment schema is centralized in `packages/config/src/env.ts`. Common variables:

- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `COLLABORATION_ENABLED` / `WEBSOCKET_URL`

## 🔌 API client generation

The backend exposes a Swagger spec, and the frontend client is generated from it:

```bash
pnpm --filter @forky/api-app swagger:generate
pnpm --filter @forky/client-api generate
```

## 📜 Useful scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run all apps |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm clean` | Clean builds + node_modules |
| `pnpm web:dev` | Frontend only (localhost:3000) |
| `pnpm api:dev` | API only (localhost:3001) |

## 🧩 Contributing

Contributions are welcome. Follow the conventions described in each package README and keep package boundaries intact.

## 📄 License

MIT © forky Team
