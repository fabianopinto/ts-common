# Contributing to ts-common

Thanks for your interest in contributing!

## Project setup

- Package manager: pnpm (v10)
- Node: >= 22

```bash
pnpm install
pnpm build
```

## Workspace structure

- Packages live under `packages/`
  - `@fabianopinto/errors`
  - `@fabianopinto/config`
  - `@fabianopinto/logger`
  - `@fabianopinto/utils`

## Development

- Build all: `pnpm build`
- Watch a single package: `pnpm --filter <pkg> dev`
- Test all: `pnpm test`
- Root merged coverage: `pnpm coverage` (outputs to `coverage/` at repo root)
- Lint all: `pnpm lint`
- Format check: `pnpm format:check` — fix with `pnpm format`

Per-package examples:

```bash
pnpm --filter @fabianopinto/utils test
pnpm --filter @fabianopinto/logger build
pnpm --filter ./packages/errors dev
```

### Vitest

- Root config (`vitest.config.ts`) collects tests from all packages.
- `pnpm test` runs tests from each package (works with include globs).
- `pnpm coverage` runs a single root session and produces a merged coverage report in `coverage/`.

## Coding standards

- TypeScript strict mode; ESM-first with CJS compatibility
- Prefer small, pure functions
- Add/extend unit tests when changing behavior
- Keep public API changes documented in package READMEs

## Commit style

- Use clear, descriptive messages focused on what is staged.
- Conventional Commits welcome (e.g., `feat:`, `fix:`, `chore:`) for readability and changelogs.

## Versioning & Releases (Changesets)

This repo uses [Changesets](https://github.com/changesets/changesets).

1. Create a changeset for user-visible changes:

```bash
pnpm changeset
```

2. Select affected packages and bump types (patch/minor/major).

3. Merge to `main`. Our Release workflow will version and publish changed packages.

Local release simulation:

```bash
pnpm changeset version
pnpm build
pnpm changeset publish
```

## CI

- GitHub Actions run install, build, tests (PRs and pushes) and handle Releases via Changesets.
- Install step uses recursive workspace install: `pnpm install`.
- Builds are serialized/topological to ensure type resolution across packages: `pnpm build`.
- CI may also pack tarballs for each package for verification.

### Troubleshooting CI builds

- Type declaration build errors resolving workspace deps:
  - Ensure dependency packages build before dependents (serialized build step above).
  - Our `tsup` uses a safe DTS config:
    ```ts
    dts: { resolve: true, compilerOptions: { composite: false } }
    ```
    to avoid composite file-listing constraints in declaration emit.
- Missing dev dependencies in a package:
  - CI uses `pnpm install` so per-package `node_modules` symlinks are present.

## Pull Requests

- Target branch: `main`
- Ensure CI passes (install, build, test, lint)
- Keep PRs focused and small when possible

## Reporting issues

- Open an issue with steps to reproduce and expected behavior

Thank you for contributing!
