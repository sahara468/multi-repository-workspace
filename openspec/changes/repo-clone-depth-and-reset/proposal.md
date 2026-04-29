## Why

When cloning repositories with `mrw sync`, the tool performs full-depth clones that download the entire git history. For large or long-lived repositories, this results in slow clone times and excessive disk usage. Additionally, there is no way to revert a workspace back to its initial state — switching branches or pulling changes leaves repositories in an altered state with no clean reset path.

## What Changes

- Add `--depth` option to `mrw sync` to allow shallow clones with a configurable commit depth
- Add `cloneDepth` field to service configuration in `workspace.yaml` as a per-service default
- Add `mrw reset` command that reverts all (or specified) services to their default branch and pristine state (matching the initial `mrw init` + `mrw sync` result)
- Reset will discard local changes, switch to the configured default branch, and reset to the remote HEAD

## Capabilities

### New Capabilities
- `shallow-clone`: Support for configuring and applying clone depth during `mrw sync`, with CLI flag and per-service config
- `repo-reset`: Command to revert services to default branch and initial state, discarding local changes

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- `src/commands/sync.ts` — add `--depth` CLI option and apply depth to clone operations
- `src/lib/workspace.ts` — add `cloneDepth` to `ServiceConfig` type
- New file `src/commands/reset.ts` — reset command implementation
- `src/cli.ts` — register new `reset` subcommand
- `workspace.yaml` schema — new optional `cloneDepth` field per service
