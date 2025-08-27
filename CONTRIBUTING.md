# Contributing to ts-common

Thanks for your interest in contributing!

## Project setup

- Package manager: pnpm (v10)
- Node: >= 18

```bash
pnpm -w install
pnpm -r build
```

## Workspace structure

- Packages live under `packages/`
  - `@fabianopinto/errors`
  - `@fabianopinto/config`
  - `@fabianopinto/logger`
  - `@fabianopinto/utils`

## Development

- Build all: `pnpm -r build`
- Watch a single package: `pnpm --filter <pkg> run dev`
- Test all: `pnpm -r test`

## Coding standards

- TypeScript strict mode
- Prefer small, pure functions
- Add/extend unit tests when changing behavior

## Commit style

- Use clear, descriptive messages
- Conventional Commits are welcome (e.g., `feat:`, `fix:`, `chore:`), but not mandatory

## Versioning & Releases

This repo uses [Changesets](https://github.com/changesets/changesets).

- Create a changeset for user-visible changes:
  ```bash
  pnpm changeset
  ```
- Select affected packages and bump types (patch/minor/major)
- After merging to `main`, CI will version and publish changed packages

## Pull Requests

- Target branch: `main`
- Ensure CI passes (build + test)
- Keep PRs focused and small when possible

## Reporting issues

- Open an issue with steps to reproduce and expected behavior

Thank you for contributing!
