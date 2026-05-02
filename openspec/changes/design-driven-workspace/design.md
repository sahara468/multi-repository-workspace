## Context

MRW currently initializes workspaces via `mrw init` (interactive or template-based), producing a `workspace.yaml` and `.mrw/state/repos/` for cloned repos. Two fundamental changes are needed:

1. **Repos directory**: Cloned repos move from hidden `.mrw/state/repos/` to a visible `repos/` directory at the workspace root. This makes the workspace structure transparent — users can see and navigate repos directly.

2. **Design-driven init**: A new `mrw init --from-arch <repo-url>` mode clones a service architecture design repo to the workspace root and auto-imports its `services.yaml`. The design repo follows a convention (`services.yaml`, `specs/`, `arch/`) that enables systematic design work.

Current workspace structure:
```
.mrw/state/repos/<repo-name>/
workspace.yaml
```

Target workspace structure (design-driven mode):
```
.mrw/
xxx-service-arch/
  services.yaml
  specs/
    capabilities/
    entries/
  arch/
repos/
  service1-xxx/
  service2-xxx/
workspace.yaml
```

Target workspace structure (plain mode, without --from-arch):
```
.mrw/
repos/
  service1-xxx/
workspace.yaml
```

## Goals / Non-Goals

**Goals:**
- Move cloned repos to `repos/` at the workspace root
- Support `mrw init --from-arch <repo-url>` for design-driven initialization
- `--from-arch` clones the arch repo and imports its `services.yaml` — service repos are NOT synced during init (user runs `mrw sync` separately)
- Clone the arch repo to workspace root with its directory name derived from the repo URL
- Define the arch repo convention (`services.yaml`, `specs/`, `arch/`) — validated but not rigidly enforced
- Keep `.mrw/` for internal state; add optional `arch` field to `workspace.yaml`
- The arch repo is a first-class repo for all repo-management commands (`sync`, `status`, `branch`, `checkout`, `repo list`, `repo status`)

**Non-Goals:**
- Full arch repo validation or linting (only basic structure checks)
- Managing specs/arch content — MRW treats these as opaque directories owned by the design repo
- Backward compatibility with `.mrw/state/repos/` layout — product is MVP, breaking changes are acceptable
- Spec rendering, documentation generation, or design tooling

## Decisions

### D1: Repo directory at `repos/` (not `.mrw/state/repos/`)

**Decision**: Cloned service repos live in `repos/` at the workspace root.

**Rationale**: `.mrw/state/repos/` is gitignored and hidden, making it hard to discover what's cloned. A visible `repos/` directory makes the workspace self-describing. Users can browse, grep, and IDE-navigate service code directly.

**Alternative considered**: Keep repos in `.mrw/state/repos/` and symlink to `repos/`. Rejected — adds complexity without benefit; symlinks break on Windows.

### D2: `.mrw/` stores internal state only

**Decision**: `.mrw/` is gitignored and contains only `workspace.yaml` (moved from root) and any future internal state.

Wait — actually, `workspace.yaml` should stay at the workspace root. It's the primary config file users edit. `.mrw/` is only for derived/operational state.

**Revised**: `workspace.yaml` stays at root. `.mrw/` is gitignored and currently empty (reserved for future state like lock files, cache). The `repos/` directory replaces `.mrw/state/repos/`.

**Alternative**: Move `workspace.yaml` into `.mrw/`. Rejected — it's a user-facing config file, not internal state.

### D3: Arch repo cloned to workspace root

**Decision**: The design repo is cloned directly into the workspace root, using the directory name derived from its URL (via `deriveRepoName`).

**Rationale**: The arch repo is a first-class part of the workspace, not a hidden implementation detail. Users edit its specs, review its arch docs, and commit to it directly.

**Alternative**: Clone into a dedicated directory like `design/` or `arch-repo/`. Rejected — the repo name is more meaningful than a generic directory; multiple arch repos would need disambiguation later.

### D4: `arch` field in `workspace.yaml`

**Decision**: Add an optional `arch` field to `WorkspaceConfig`:

```yaml
arch:
  repo: https://github.com/org/xxx-service-arch.git
  branch: main
```

**Rationale**: Commands like `mrw sync` and `mrw status` need to know about the arch repo for display and pull operations. Storing it in `workspace.yaml` keeps all config in one place.

**Alternative**: Store in `.mrw/config.yaml`. Rejected — splits config between two files with no clear benefit.

### D5: Arch repo convention — validated softly

**Decision**: When `--from-arch` is used, MRW checks for `services.yaml` in the arch repo (required) and logs warnings if `specs/` or `arch/` are missing, but does not fail.

**Rationale**: The convention should guide, not block. Teams may start with just `services.yaml` and add specs/arch later. Hard validation creates friction without value at this stage.

### D6: `repos/` is NOT gitignored by default

**Decision**: MRW no longer adds `repos/` to `.gitignore`. The `.mrw/` directory is gitignored instead.

**Rationale**: Whether repos are tracked in git is a team decision. Some teams use git submodules or subtrees; others prefer `.gitignore`. MRW should not impose this choice. The previous behavior of gitignoring `.mrw/state/` was because it was an internal cache directory — `repos/` is a user-facing workspace component.

### D7: `mrw sync` updates repos in `repos/`

**Decision**: `sync` clones/pulls into `repos/` (not `.mrw/state/repos/`). If the arch repo is present, `mrw sync` also pulls it. The arch repo is pulled first (since it's the source of truth for services), then service repos are synced.

**Rationale**: Consistency — all repos are in `repos/`. The arch repo is a special case that's cloned at root, so sync handles it separately (pull only, not clone). Pulling arch first ensures `services.yaml` is up-to-date before service repos are synced.

### D7b: `mrw init --from-arch` does NOT sync service repos

**Decision**: `mrw init --from-arch` only clones the arch repo and imports its `services.yaml` into `workspace.yaml`. It does NOT run `mrw sync` to clone service repos. The user runs `mrw sync` separately.

**Rationale**: Init and sync are separate concerns. Init sets up the workspace structure and config; sync materializes the repos. Keeping them separate gives users control over when and what to sync, and avoids long init times when there are many service repos.

### D8: Arch repo is a first-class repo for all commands

**Decision**: The arch repo is treated as a regular repo by `mrw sync`, `mrw status`, `mrw branch`, `mrw checkout`, `mrw repo list`, and `mrw repo status`. It appears in repo listings and can be branched/checked out like any service repo.

**Rationale**: The arch repo is version-controlled and teams need to manage its branches (e.g., create a feature branch for design changes). Treating it as a hidden/special case would force users to manage it manually via raw git commands, breaking the unified workspace experience.

**Implementation**: `getArchRepoEntry(config, cwd)` returns a `RepoEntry`-like object for the arch repo. Commands that iterate over repos include it alongside service repos. The arch repo's directory is at `<cwd>/<repoName>/` (workspace root), not under `repos/`. It is displayed with an `[arch]` label to distinguish it from service repos.

### D9: Design-driven workspaces restrict service add/remove

**Decision**: In a design-driven workspace (one with `config.arch`), `mrw service add` and `mrw service remove` are blocked with an error message directing users to `mrw service import`. Only `mrw service import`, `mrw service list`, and `mrw service update` are allowed.

**Rationale**: In design-driven mode, the source of truth for services is the arch repo's `services.yaml`. Allowing ad-hoc add/remove would create divergence between the workspace config and the arch repo, undermining the design-driven workflow. `service import` re-reads the arch repo's `services.yaml` and applies any additions/removals defined there.

**Alternative**: Allow add/remove but sync them back to the arch repo. Rejected — this creates a bidirectional sync problem and complicates the arch repo's role as the authoritative source.

### D10: `mrw service import` defaults to arch repo's services.yaml

**Decision**: In design-driven workspaces, `mrw service import` (without `--file`) defaults to the arch repo's `services.yaml` path. With `--file`, it reads from the specified path.

**Rationale**: The most common import action in design-driven mode is re-syncing from the arch repo. Making this the default reduces friction.

## Risks / Trade-offs

- **[Arch repo name collision]** If the arch repo URL derives to the same name as a service repo → `deriveRepoName` already handles collisions with numeric suffixes. The arch repo is at root level (not in `repos/`), so collisions with service repo directories don't occur.

- **[Empty `.mrw/` directory]** After moving repos out, `.mrw/` may be mostly empty → Reserve for future use (lock files, metadata cache). It still serves as a marker that this is an MRW workspace.

- **[Convention extensibility]** The arch repo convention (`specs/`, `arch/`) may need to grow over time → The soft-validation approach (warn, don't fail) keeps the door open. New directories don't require code changes.

- **[Service management restriction]** Blocking add/remove in design-driven mode may feel limiting for teams that want to experiment → The restriction preserves the arch repo as source of truth. Teams can still use `service update` for non-structural changes (language, description, path). To add/remove services, they update the arch repo's `services.yaml` and run `mrw service import`.

- **[Arch repo in branch/checkout]** Including the arch repo in `mrw branch create` and `mrw checkout` means branch operations affect the design repo alongside service repos → This is intentional — design changes should be branched together with the services they affect.
