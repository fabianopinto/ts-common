<p align="center">
  <img src="./docs/assets/ts-common.png" alt="ts-common" width="220" />
</p>

# ts-common

A TypeScript monorepo of reusable packages:

- @fabianopinto/errors — AppError with cause and context
- @fabianopinto/config — dotenv + zod config loader
- @fabianopinto/logger — Pino-based logger with clean interface
- @fabianopinto/utils — string, date, and object helpers

## Getting started

```bash
pnpm -w install
pnpm -r build
```

## Packages

- `packages/errors`
- `packages/config`
- `packages/logger`
- `packages/utils`

## Development

- Build all: `pnpm -r build`
- Watch a package: `pnpm --filter <pkg> run dev`
- Test all: `pnpm -r test`

## Versioning & Releases (Changesets)

```bash
pnpm changeset         # create a changeset
pnpm changeset version # apply versions and changelogs
pnpm -r build          # build packages
pnpm changeset publish # publish changed packages to npm
```

## License

ISC © Fabiano Pinto
