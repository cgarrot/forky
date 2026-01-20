# forky API app

Thin NestJS bootstrap for the core package `@forky/api`. This app configures
global pipes/filters and exposes Swagger for client generation.

## Development

```bash
pnpm api:dev
```

## Swagger

```bash
pnpm --filter @forky/api-app swagger:generate
```

## Database

```bash
pnpm --filter @forky/api-app db:migrate:dev
pnpm --filter @forky/api-app db:seed
```

## Structure

- `src/main.ts` is the bootstrap entrypoint.
- Domain logic lives in `packages/api`.
