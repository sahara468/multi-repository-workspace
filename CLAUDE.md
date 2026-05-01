# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRW (Multi-Repository Workspace) is a TypeScript/Node.js CLI tool (`mrw` command) that manages multiple microservice repositories as a unified business workspace. It is built on ESM-only architecture (`"type": "module"` in package.json).

**Key design:** Repos, not services, are the unit of cloning. Multiple services can share a single git repository (monorepo). The `mrw sync` command clones each unique repo once under `.mrw/state/repos/<repo-name>/` (derived from the git URL), and services reference their repo via the `repo` field in `workspace.yaml`. An optional `path` field on a service specifies its subdirectory within a monorepo.

## Development Commands

```bash
# Development (run CLI directly without build)
npm run dev -- <args>          # e.g., npm run dev -- --help

# Build (esbuild -> dist/cli.js)
npm run build

# Type checking (no emit)
npm run lint

# Run built CLI
node dist/cli.js <args>

# Run a single test file (vitest)
npx vitest run src/__tests__/path/to/test.test.ts

# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Type check + tests (CI gate)
npm run lint && npx vitest run
```

## Architecture

```
src/
├── cli.ts              # Entry point: registers all commander subcommands
├── commands/           # One file per CLI command
│   ├── init.ts         #   mrw init
│   ├── sync.ts         #   mrw sync — repo-centric clone/pull
│   ├── status.ts       #   mrw status — repo and service status
│   ├── branch.ts       #   mrw branch create
│   ├── checkout.ts     #   mrw checkout
│   ├── service.ts      #   mrw service add/remove/update/import/list
│   ├── repo.ts         #   mrw repo list/status
│   └── reset.ts        #   mrw reset
└── lib/
    └── workspace.ts    # WorkspaceConfig, RepoIndex, service/repo resolution
```

**Pattern:** Commands in `src/commands/` own their CLI registration and I/O (chalk, ora, inquirer). Business logic and data types live in `src/lib/`. Commands import from `lib/` — never the reverse.

**Build:** esbuild bundles `src/cli.ts` → `dist/cli.js` (ESM format, shebang injected). All npm dependencies are externalized (not bundled).

## Core Library: `src/lib/workspace.ts`

Key types and functions:

- `ServiceConfig` — `{ repo, branch, language?, description?, path? }`. The `path` field is optional and specifies the service subdirectory within a monorepo.
- `WorkspaceConfig` — `{ version, workspace: { name, description?, domain? }, services: Record<string, ServiceConfig> }`
- `deriveRepoName(repoUrl)` — extracts a directory name from a git URL (strips `.git`, trailing slashes, takes last path segment). Used to determine `.mrw/state/repos/<name>/`.
- `getRepoIndex(config)` — groups services by `repo` URL, returns a `RepoIndex` (Map of repo-dir-name → `{ url, branch, services[] }`). Handles name collisions by appending numeric suffixes.
- `getServiceRepoDir(serviceName, config, cwd)` — resolves a service name to its repo directory path.

All commands that interact with cloned repos must use `getRepoIndex()` or `getServiceRepoDir()` rather than constructing paths from service names directly.

## TypeScript Strictness & No-JS Rules

This is a **TypeScript-only project**. The following rules are enforced:

1. **No `.js` or `.mjs` source files** in `src/`. All source must be `.ts`. The tsconfig `include` is `["src/**/*"]` which only covers `.ts` files — `.js` files will not be compiled and will cause runtime failures.

2. **ESM import paths must include `.js` extension** — TypeScript ESM with `moduleResolution: "bundler"` requires explicit `.js` extensions in import paths even though the source is `.ts`. Example: `import { foo } from './lib/foo.js'`.

3. **`strict: true` is enabled** — no implicit `any`, no implicit returns, strict null checks. All function parameters and return types must be explicitly typed unless inferrable from context.

4. **Prefer `node:` prefix** for Node.js built-in imports: `import fs from 'node:fs'`, not `import fs from 'fs'`.

5. **No `require()` or `module.exports`** — ESM-only. Use `import`/`export`.

6. **Type-only imports** — use `import type { ... }` for type-only imports to keep bundle clean.

7. **No `as any` casts** — if type narrowing is needed, use type guards or discriminated unions instead.

## Testing Standards

- **Framework:** Vitest (co-located test files: `src/__tests__/` directory)
- **Coverage gate:** 80% line coverage minimum. Run `npx vitest run --coverage` to check.
- **Test file naming:** `<module>.test.ts` — must match the source file it tests.
- **Test structure:** Use `describe`/`it` blocks. Group by command or module.
- **What to test:**
  - `lib/` functions: unit tests with mocked fs/git dependencies
  - `commands/`: integration tests that verify CLI output and exit codes
  - Edge cases: missing workspace.yaml, invalid YAML, uncommitted changes detection, repo name collisions, branch conflicts in shared repos
- **Mocking:** Use `vi.mock()` for external deps (`simple-git`, `inquirer`). For `fs`, mock at the module level or use temp directories via `os.tmpdir()`.
- **Repo directory naming in tests:** Test repos under `.mrw/state/repos/` use repo-derived names (e.g., `order` for `https://example.com/order.git`), not service names.

## Dependency Management

- **Adding dependencies:** Prefer ESM-native packages. Before adding a dep, verify it supports `"type": "module"` (check `package.json` exports). Packages without ESM support require dynamic `import()` or a CJS shim — flag these in PR review.
- **Lock file:** `package-lock.json` is committed. Never run `npm install` with `--no-package-lock`.
- **Version pinning:** Use caret ranges (`^x.y.z`) for minor updates. Pin exact versions only for packages with known breaking semver behavior.
- **Dev vs prod:** CLI frameworks (commander), git libs (simple-git), and UI libs (chalk, ora, inquirer) are production deps. Type definitions, test frameworks, and build tools are dev deps.
- **Dep audit:** Run `npm audit` before every release. Address critical/high vulnerabilities immediately.

## Code Quality Gates

Before committing, ensure:
1. `npm run lint` passes (eslint + tsc --noEmit)
2. `npx vitest run` passes
3. No `console.log` left in production code (use `chalk` + `console.log` in commands only, never in `lib/`)

## OpenSpec Integration

The `openspec/` directory contains change artifacts (proposals, specs, design, tasks). When implementing changes from OpenSpec, update task checkboxes in `openspec/changes/<name>/tasks.md` as tasks complete.

## Docs

Project documentation lives in `docs/`:
- `docs/architecture-design.md` — architecture and design documentation
- `docs/product-spec.md` — product specification
- `docs/multi-repository-workspace-platform.md` — platform overview
