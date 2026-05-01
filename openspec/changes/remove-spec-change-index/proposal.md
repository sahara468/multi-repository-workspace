## Why

MRW's spec, change, and index commands add complexity that is not core to the tool's purpose of managing multi-repository workspaces. The OpenSpec tooling already handles spec/change workflows externally, and the index cache duplicates information derivable from workspace.yaml. Removing these commands simplifies the codebase and reduces maintenance burden.

## What Changes

- **BREAKING**: Remove `mrw spec` command (subcommands: list, show, create)
- **BREAKING**: Remove `mrw change` command (subcommands: propose, list, design, tasks)
- **BREAKING**: Remove `mrw index` command (subcommands: show, clear)
- Remove `src/commands/spec.ts`
- Remove `src/commands/change.ts`
- Remove `src/commands/index.ts`
- Remove `src/lib/cache.ts` (only used by index command)
- Remove command registrations from `src/cli.ts`
- Remove `.mrw/changes/` and `.mrw/state/index/` directory creation from `src/commands/init.ts`
- Remove `specs/` directory structure creation from `src/commands/init.ts`
- Remove related tests from `src/__tests__/commands.test.ts`

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `workspace-management`: Init command will no longer create spec/change/index directories or cache structures
- `workspace-spec`: Removing this capability entirely (spec command removed)
- `cross-service-change`: Removing this capability entirely (change command removed)

## Impact

- **Code**: 3 command files deleted, 1 lib file deleted, cli.ts and init.ts modified, test file updated
- **API**: Breaking CLI changes — `mrw spec`, `mrw change`, `mrw index` commands no longer exist
- **Dependencies**: No npm dependency changes expected
- **Systems**: Existing `.mrw/changes/` and `.mrw/state/index/` directories in user workspaces will become orphaned (no tool manages them)
