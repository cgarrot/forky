# Conventions

Guidelines for package boundaries, file placement, and dependencies.

## Package boundaries

- Apps (`apps/*`) are thin shells only.
- Domain logic lives in packages (`packages/*`).
- `@forky/app-ui` composes features into screens.
- `@forky/ui` contains reusable design system components only.
- `@forky/state` owns client state and API usage.
- `@forky/shared-core` is UI-agnostic and runtime-agnostic.
- `@forky/shared-ui` contains UI-only helpers (no app logic).

## Dependency rules

- Apps can depend on packages.
- Packages must not depend on apps.
- `@forky/ui` must not depend on `@forky/app-ui`.
- `@forky/shared-core` must not depend on UI packages.
- `@forky/config` must not depend on frontend packages.

## Where to add new code

- New API module: `packages/api/src/modules/<domain>`
- New API DTOs/types: `packages/api/src/modules/<domain>/dto`
- New DB fields: `packages/db/prisma/schema.prisma`
- New shared types/validation: `packages/shared-core/src`
- New screen: `packages/app-ui/src/screens/<domain>`
- New UI feature: `packages/app-ui/src/features/<domain>`
- New design system component: `packages/ui-kit/src/<atoms|molecules|organisms|templates>`
- New state slice: `packages/state/src/store/slices`
- New API endpoints (client): regenerate `packages/client-api`

## Naming and exports

- Keep `index.ts` as the public entrypoint for each package folder.
- Prefer explicit named exports over default exports in packages.
- Align filename with component or service name (`ProjectWorkspace.tsx`, `nodes.service.ts`).

## Module system

- Backend packages (`@forky/api`, `@forky/config`) are CommonJS today.
- Frontend and shared UI packages are ESM.
- Do not introduce ESM-only Node features in backend packages unless the
  backend migrates fully to ESM.

## Testing expectations

- API modules should include unit tests for services and guards.
- Critical workflows should have at least one integration/e2e test.
- State utilities should have tests for serialization and reducers.
