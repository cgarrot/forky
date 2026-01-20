# forky web app

Thin Next.js shell that composes the app UI from shared packages.

## Development

```bash
pnpm web:dev
```

## Packages used

- `@forky/app-ui`: screens and features.
- `@forky/ui`: design system (atoms/molecules/organisms/templates).
- `@forky/state`: Zustand store + API access.

## Notes

Authentication redirects are handled in `src/middleware.ts`.
