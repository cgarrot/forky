# Architecture

This document describes the monorepo structure, runtime flows, and the
responsibility boundaries between apps and shared packages.

## Monorepo overview

The codebase is split into thin apps and package-first domain logic.

- `apps/web`: Next.js shell (App Router) that wires routes to screens
- `apps/api`: thin NestJS bootstrap that wires the core backend package
- `packages/api`: NestJS modules (auth, projects, nodes, edges, llm, etc.)
- `packages/db`: Prisma schema, migrations, and seeds
- `packages/app-ui`: app screens and feature composition
- `packages/ui-kit`: design system (atoms/molecules/organisms/templates)
- `packages/state`: client state + API access (Zustand)
- `packages/client-api`: generated OpenAPI client
- `packages/shared-core`: shared types, validation, graph utilities
- `packages/shared-ui`: UI-only utilities (e.g. `cn`)
- `packages/config`: env and LLM configuration

## Core data flow

```
Browser
  -> apps/web (routes)
    -> packages/app-ui (screens/features)
      -> packages/state (domain state + API calls)
        -> packages/client-api (OpenAPI client)
          -> apps/api (Nest bootstrap)
            -> packages/api (modules/controllers/services)
              -> packages/db (Prisma)
```

## Runtime components

### API
- NestJS modules in `packages/api/src/modules`
- Global filters/guards are registered in `packages/api`
- `apps/api/src/main.ts` provides bootstrap and Swagger

### Collaboration (realtime)
- Socket.io gateway in `packages/api/src/modules/collaboration`
- Client hooks in `packages/app-ui/src/features/collaboration`

### LLM streaming
- LLM client configuration in `packages/config`
- Generation endpoints in `packages/api/src/modules/llm`
- Streaming UI in `packages/app-ui/src/features/nodes`

## Build system

- pnpm workspaces with Turborepo
- `pnpm dev` runs all apps
- `pnpm web:dev` and `pnpm api:dev` are app entrypoints

## Module system

Frontend packages are ESM. Backend packages (`@forky/api`, `@forky/config`)
remain CommonJS today for NestJS/Node compatibility. This boundary is
intentional and will be revisited if/when the backend migrates to full ESM.
