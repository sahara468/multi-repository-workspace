## Why

MRW currently supports a single workflow: `mrw init` creates an empty workspace, then services are imported one-by-one via `services.yaml`. This works for multi-repo management but lacks a design-first entry point. Teams that already maintain a service architecture design repo (capturing capabilities, entry points, and architecture decisions) must manually wire that repo into the workspace. A design-driven initialization mode would let teams start from their architecture repo, getting both design assets and service repos in one step — enabling systematic design work across the workspace.

Additionally, cloned repos currently live under `.mrw/state/repos/`, which is gitignored and hidden from the workspace root. Moving them to a visible `repos/` directory at the workspace root makes the workspace structure more transparent and easier to navigate.

## What Changes

- Add `mrw init --from-arch <repo-url>` to initialize a workspace from a service architecture design repo
- `--from-arch` clones the arch repo to workspace root and imports its `services.yaml` into workspace config, but does NOT sync (clone) service repos — user runs `mrw sync` separately
- Cloned service repos are placed in `repos/` at the workspace root (instead of `.mrw/state/repos/`)
- `.mrw/` is preserved for internal state
- Define the service-arch repo convention: `services.yaml`, `specs/capabilities/`, `specs/entries/`, `arch/`
- The arch repo is a first-class repo — `mrw sync`, `status`, `branch`, `checkout`, `repo list`, `repo status` all manage it alongside service repos
- In design-driven workspaces, `mrw service add` and `mrw service remove` are blocked; services can only be updated via `mrw service import` (which re-reads from the arch repo's `services.yaml`)
- All commands referencing repo directories are updated to use `repos/`
- No backward compatibility concerns — product is in MVP stage, breaking changes are acceptable

## Capabilities

### New Capabilities
- `design-driven-init`: Initialize workspace from a service architecture design repo, including cloning the arch repo, importing its services.yaml, setting up the design-driven workspace structure, and restricting service management to import-only
- `repos-directory`: Move cloned repos from `.mrw/state/repos/` to `repos/` at the workspace root, with all commands updated accordingly

### Modified Capabilities

## Impact

- **Core library** (`src/lib/workspace.ts`): `getServiceRepoDir` and repo path resolution must use `repos/` directory; new types for arch repo config; `isDesignDriven()` helper to check workspace mode
- **Commands**: `init`, `sync`, `status`, `repo`, `service`, `checkout`, `branch` — all reference repo paths and must be updated; `branch`/`checkout`/`repo` must include arch repo; `service add`/`remove` must check workspace mode
- **Workspace config** (`workspace.yaml`): New optional `arch` field to store the design repo URL and branch for design-driven workspaces
- **No backward compatibility**: MVP stage — all workspaces use the new `repos/` layout; no migration path from `.mrw/state/repos/`
