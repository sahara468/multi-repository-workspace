## Context

MRW's `mrw sync` command clones repositories with full git history. For large repositories, this is slow and wastes disk space. The `workspace.yaml` service config (`ServiceConfig`) currently has no depth-related field. There is also no command to reset a repository to its initial state — users must manually `git checkout` and `git reset --hard`.

Current clone call (sync.ts:57):
```ts
await simpleGit().clone(service.repo, serviceDir, ['--branch', service.branch]);
```

## Goals / Non-Goals

**Goals:**
- Allow shallow clones via `--depth` CLI flag on `mrw sync`
- Add `mrw reset` command to revert services to default branch and clean state
- Reset command supports `--force` to skip confirmation prompt and `--service <name>` to target a single service

**Non-Goals:**
- Unshallowing existing shallow clones (user can `git fetch --unshallow` manually)
- Partial clone support (`--filter=blob:none`) — can be added later
- Reset preserving stashed changes — reset discards everything by design

## Decisions

### 1. Clone depth via CLI flag only

**Decision:** `--depth` CLI flag is the sole mechanism for shallow clone depth. No per-service config field.

**Rationale:** Simplicity — one way to set depth, no precedence rules. Users who need different depths for different services can run `mrw sync <service> --depth N` individually.

**Alternative considered:** Per-service `cloneDepth` in `workspace.yaml` — rejected as over-engineering; depth is a transient operational choice, not a persistent service property.

### 2. `mrw reset` implementation: checkout + clean + reset

**Decision:** `mrw reset` performs three git operations in sequence:
1. `git checkout <default-branch>` — switch to the configured branch
2. `git clean -fd` — remove untracked files and directories
3. `git reset --hard origin/<default-branch>` — reset to remote HEAD

**Rationale:** This matches the state after a fresh `mrw init` + `mrw sync`. `git clean -fd` removes build artifacts and untracked files. `git reset --hard origin/<branch>` ensures we match the remote, not just local.

**Alternative considered:** Delete and re-clone — rejected because it's slower and may fail if network is unavailable.

### 3. Reset confirmation prompt by default

**Decision:** Reset prompts for confirmation unless `--force` is passed.

**Rationale:** Reset is destructive (discards all local changes). A confirmation prompt prevents accidental data loss. `--force` enables scripting use.

### 4. Reset operates on all services by default, `--service` for single

**Decision:** Same pattern as `mrw sync` and `mrw checkout`.

**Rationale:** Consistency with existing commands.

## Risks / Trade-offs

- **Shallow clone limitations** → Shallow clones have restricted git operations (e.g., `git blame`, `git log` beyond depth). Document this in CLI help text.
- **Reset is destructive** → Confirmation prompt + `--force` flag mitigates accidental use. Help text must clearly state that uncommitted changes and untracked files are discarded.
- **`git clean -fd` removes untracked files** → This includes build output, IDE configs, and any local files. This is intentional (match init state) but must be communicated clearly.
