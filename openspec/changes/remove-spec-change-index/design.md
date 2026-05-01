## Context

MRW currently has three commands (spec, change, index) that add non-core functionality. The spec and change commands mirror OpenSpec workflow but are redundant since OpenSpec is a separate tool. The index command manages topology/dependency caches that can be derived from workspace.yaml at runtime. These commands add maintenance overhead without providing unique value.

## Goals / Non-Goals

**Goals:**
- Remove spec, change, and index commands and all supporting code
- Clean up init command to not create orphaned directories
- Update tests to reflect removed functionality
- Keep the codebase compiling and all remaining tests passing

**Non-Goals:**
- Migrating existing `.mrw/changes/` or `.mrw/state/index/` data in user workspaces
- Adding replacement functionality for removed features
- Changing the OpenSpec integration in the `openspec/` directory

## Decisions

1. **Delete files entirely rather than deprecate**: No deprecation period. The commands have limited usage and OpenSpec provides spec/change functionality externally. Removing outright keeps the codebase clean.
   - Alternative considered: Deprecation warnings then removal in next major version. Rejected because these are non-core features with external alternatives.

2. **Remove cache.ts completely**: The `src/lib/cache.ts` module is only consumed by the index command. No other code depends on it, so it can be safely deleted.
   - Alternative considered: Keep cache.ts for potential future use. Rejected to avoid dead code.

3. **Clean up init.ts directory creation**: The init command creates `.mrw/changes/`, `.mrw/state/index/`, and `specs/` directories. Remove these mkdir calls since no remaining code uses them. The `.mrw/` base directory and `.mrw/state/` are still needed for other functionality.

4. **Update tests by removing spec/change/index test blocks**: Rather than rewriting, remove the test sections for deleted commands and update the command registration assertion to exclude them.

## Risks / Trade-offs

- [Users with `.mrw/changes/` data] → Orphaned directories are harmless; no migration needed since OpenSpec manages its own artifact structure separately.
- [Breaking CLI change] → Users scripting `mrw spec`/`mrw change`/`mrw index` will get "unknown command" errors. Acceptable since these are non-core features.
