## Context

MRW's `mrw sync` command clones repositories with full git history. For large repositories, this is slow and wastes disk space. The `workspace.yaml` service config (`ServiceConfig`) currently has no depth-related field. There is also no command to reset a repository to its initial state — users must manually `git checkout` and `git reset --hard`.

Current clone call (sync.ts:57):
```ts
await simpleGit().clone(service.repo, serviceDir, ['--branch', service.branch]);
```

## Goals / Non-Goals

**Goals:**
- Allow shallow clones via `--depth` CLI flag on `mrw sync`
- Allow per-service `cloneDepth` default in `workspace.yaml`
- Add `mrw reset` command to revert services to default branch and clean state
- Reset command supports `--force` to skip confirmation prompt and `--service <name>` to target a single service

**Non-Goals:**
- Unshallowing existing shallow clones (user can `git fetch --unshallow` manually)
- Partial clone support (`--filter=blob:none`) — can be added later
- Reset preserving stashed changes — reset discards everything by design

## Decisions

### 1. Clone depth precedence: CLI flag > service config > no depth

**Decision:** `--depth` CLI flag overrides everything. If not set, fall back to `cloneDepth` in `ServiceConfig`. If neither is set, clone full history (current behavior).

**Rationale:** CLI flag gives one-time override power. Per-service config handles cases where some repos need full history (e.g., for bisect) while others don't.

**Alternative considered:** Global workspace-level `cloneDepth` — rejected because different services often need different depths.

### 2. `cloneDepth` field on `ServiceConfig` (optional, number)

**Decision:** Add `cloneDepth?: number` to `ServiceConfig` interface. Validated as positive integer if present.

**Rationale:** Keeps depth configuration co-located with the repo definition. Optional field maintains backward compatibility.

### 3. `mrw reset` implementation: checkout + clean + reset

**Decision:** `mrw reset` performs three git operations in sequence:
1. `git checkout <default-branch>` — switch to the configured branch
2. `git clean -fd` — remove untracked files and directories
3. `git reset --hard origin/<default-branch>` — reset to remote HEAD

**Rationale:** This matches the state after a fresh `mrw init` + `mrw sync`. `git clean -fd` removes build artifacts and untracked files. `git reset --hard origin/<branch>` ensures we match the remote, not just local.

**Alternative considered:** Delete and re-clone — rejected because it's slower and may fail if network is unavailable.

### 4. Reset confirmation prompt by default

**Decision:** Reset prompts for confirmation unless `--force` is passed.

**Rationale:** Reset is destructive (discards all local changes). A confirmation prompt prevents accidental data loss. `--force` enables scripting use.

### 5. Reset operates on all services by default, `--service` for single

**Decision:** Same pattern as `mrw sync` and `mrw checkout`.

**Rationale:** Consistency with existing commands.

## Risks / Trade-offs

- **Shallow clone limitations** → Shallow clones have restricted git operations (e.g., `git blame`, `git log` beyond depth). Document this in CLI help text.
- **Reset is destructive** → Confirmation prompt + `--force` flag mitigates accidental use. Help text must clearly state that uncommitted changes and untracked files are discarded.
- **`git clean -fd` removes untracked files** → This includes build output, IDE configs, and any local files. This is intentional (match init state) but must be communicated clearly.
