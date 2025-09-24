<p align="center">
  <img src="./docs/assets/ts-common.png" alt="ts-common" width="220" />
</p>

# ts-common

[![CI](https://github.com/fabianopinto/ts-common/actions/workflows/ci.yml/badge.svg)](https://github.com/fabianopinto/ts-common/actions/workflows/ci.yml)

A TypeScript monorepo of reusable packages:

- [@t68/config](./packages/config/README.md) — High-performance configuration with intelligent SSM/S3 resolution and advanced caching
- [@t68/utils](./packages/utils/README.md) — string, date, and object helpers
- [@t68/logger](./packages/logger/README.md) — Pino-based logger with clean interface
- [@t68/errors](./packages/errors/README.md) — AppError with cause and context

## Architecture

```mermaid
graph TD
  config["@t68/config"]
  utils["@t68/utils"]
  logger["@t68/logger"]
  errors["@t68/errors"]

  %% Internal package dependencies (direction: dependent --> dependency)
  logger --> errors
  utils --> logger
  utils --> errors
  config --> logger
  config --> utils
  config --> errors
```

## Tech stack

- Node 22+, pnpm workspace
- TypeScript strict mode; ESM-first build with CJS compatibility
- tsup per package (bundler mode) emitting ESM, CJS, and d.ts
- Changesets for per-package SemVer and changelogs
- GitHub Actions for CI (PRs) and Releases

## Getting started

```bash
pnpm install
pnpm build
```

## Packages

- `packages/config`
- `packages/utils`
- `packages/logger`
- `packages/errors`

## Development

- Build all: `pnpm build`
- Watch a package: `pnpm --filter <pkg> dev`
- Test all: `pnpm test`

### Example usage

```ts
import { Configuration } from "@t68/config";
import { logger } from "@t68/logger";

// Initialize configuration (from object or using ConfigurationFactory to load JSON files)
Configuration.initialize({
  service: { name: "users", port: 3000 },
  logging: { level: "info" },
});

// Retrieve values (external refs like ssm:/, ssm-secure:/, or s3:// are resolved automatically)
const cfg = Configuration.getInstance();
const port = await cfg.getValue<number>("service.port");

// Use the shared logger
logger.setLevel((await cfg.getValue<string>("logging.level")) ?? "info");
logger.info("Service starting", { port });

// ... start your app
logger.info("Service started");
```

## Versioning & Releases (Changesets)

```bash
pnpm changeset         # create a changeset
pnpm changeset version # apply versions and changelogs
pnpm build             # build packages
pnpm changeset publish # publish changed packages to npm
```

## CI & Release automation

- CI: `.github/workflows/ci.yml` runs install, build, and tests on PRs/pushes
- Release: `.github/workflows/release.yml` versions + publishes changed packages via Changesets

## License

ISC © Fabiano Pinto
