# Project Instructions (forky)

## Overview

- Monorepo with thin apps and package-first domain logic.
- Read `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md` for boundaries.

## Where code goes

- API modules: `packages/api/src/modules/<domain>`
- API DTOs/types: `packages/api/src/modules/<domain>/dto`
- DB schema: `packages/db/prisma/schema.prisma`
- Shared types/validation: `packages/shared-core/src`
- App screens/features: `packages/app-ui/src/screens` and `packages/app-ui/src/features`
- Design system components: `packages/ui-kit/src/<atoms|molecules|organisms|templates>`
- State slices: `packages/state/src/store/slices`

## Dependencies and module system

- Apps can depend on packages; packages must not depend on apps.
- `@forky/ui` must not depend on `@forky/app-ui`.
- `@forky/shared-core` must not depend on UI packages.
- `@forky/config` must not depend on frontend packages.
- Backend packages are CommonJS; frontend/shared UI are ESM.

## Workflow expectations

- Keep `apps/web` and `apps/api` as thin shells; move domain logic to packages.
- Prefer named exports; keep `index.ts` as public entrypoints.
- When API contracts change, regenerate Swagger and `@forky/client-api`.
- Add tests for API services/guards and critical flows; update state tests when reducers or serialization change.

## Generated artifacts

- Do not edit `apps/api/docs/swagger.json` or `packages/client-api/src/generated` by hand.
- Regenerate with `pnpm --filter @forky/api-app swagger:generate` and `pnpm --filter @forky/client-api generate`.

## Database changes

- Update schema in `packages/db/prisma/schema.prisma`.
- Run `pnpm --filter @forky/api-app db:migrate:dev` for migrations and `pnpm --filter @forky/api db:generate` for Prisma client updates.
- Seed with `pnpm --filter @forky/api-app db:seed` when needed.

## Environment

- Env schema lives in `packages/config/src/env.ts`.
- Common vars: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `COLLABORATION_ENABLED`, `WEBSOCKET_URL`.

## Useful commands

- `pnpm dev`, `pnpm web:dev`, `pnpm api:dev`
- `pnpm --filter @forky/api-app swagger:generate`
