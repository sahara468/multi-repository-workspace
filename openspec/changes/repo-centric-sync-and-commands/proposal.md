## Why

The current `mrw sync` creates one directory per service name under `.mrw/state/repos/`. When a single git repository contains multiple microservices (e.g., a monorepo hosting `user-api`, `order-api`, and `payment-api`), the same repository is cloned multiple times — once per service — wasting disk space and causing confusing divergence. Additionally, there is no `mrw repo` command to manage repositories as first-class entities, making it impossible to inspect or operate on repos independently from services.

## What Changes

- **BREAKING**: `mrw sync` will clone repositories by repo name (derived from the git URL) instead of by service name. A single clone is shared across all services that reference the same repo.
- Add `mrw repo` command with subcommands: `list`, `status` to manage and inspect repositories.
- Enhance `mrw service` command with a `list` subcommand to list all registered services.
- Update `mrw status` to display the repo-centric directory structure (which services share which repo).
- Update `ServiceConfig` to optionally specify a `path` within the repo for monorepo scenarios (subdirectory where the service lives).

## Capabilities

### New Capabilities
- `repo-management`: CLI commands to list and inspect git repositories managed by the workspace
- `repo-centric-sync`: Sync logic that clones each unique repo once and maps services to their containing repo directory

### Modified Capabilities
- `service-management`: Add `service list` subcommand; update `service remove` warning to reflect repo-centric paths; add optional `path` field to ServiceConfig

## Impact

- **Breaking**: Directory layout under `.mrw/state/repos/` changes from service-name-based to repo-name-based. Any scripts or workflows referencing `.mrw/state/repos/<service-name>/` will break.
- `workspace.yaml` schema: New optional `path` field on service entries.
- Affected commands: `sync`, `status`, `service`, `branch`, `checkout`, `reset` — all need to resolve service → repo directory mapping.
- New command: `repo` with `list` and `status` subcommands.
