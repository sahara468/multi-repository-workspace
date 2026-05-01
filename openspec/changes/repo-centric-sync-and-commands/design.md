## Context

MRW currently treats services and repositories as 1:1 — each service entry in `workspace.yaml` maps to exactly one directory under `.mrw/state/repos/<service-name>/`. This breaks down when a monorepo hosts multiple microservices: the same git URL is cloned once per service, causing wasted disk I/O and potential state divergence between copies.

The current `ServiceConfig` has no concept of repo identity or service path within a repo. Commands (`sync`, `branch`, `checkout`, `reset`, `status`) all resolve a service to a directory by using the service name directly.

## Goals / Non-Goals

**Goals:**
- Clone each unique git repository exactly once under `.mrw/state/repos/<repo-name>/`
- Allow multiple services to share a single cloned repo directory
- Add `mrw repo` command for repo-level management (list, status)
- Add `mrw service list` subcommand
- Support an optional `path` field in `ServiceConfig` for services that live in a subdirectory of a monorepo
- Update all existing commands to resolve service → repo directory correctly

**Non-Goals:**
- Partial clone / sparse checkout support (future consideration)
- Workspace migration tooling from old directory layout to new (users can `mrw sync` fresh)
- Supporting different branches for services that share the same repo (services sharing a repo MUST use the same branch)

## Decisions

### 1. Repo name derived from git URL

Derive the repo directory name from the last segment of the git URL, stripping `.git` suffix.

Example: `https://github.com/org/platform-services.git` → `platform-services`

**Rationale**: Simple, deterministic, and matches common conventions. No additional config needed.

**Alternative considered**: Require explicit `name` field on repo config — rejected because it adds configuration burden and creates naming conflicts.

### 2. Repo index built from service configs at runtime

Instead of introducing a separate `repos` section in `workspace.yaml`, build the repo index at runtime by grouping services by their `repo` URL. A computed `getRepoIndex()` function in `lib/workspace.ts` will return a map of repo-name → `{ url, branch, services[] }`.

**Rationale**: Avoids data duplication and sync issues between `services` and `repos` sections. The workspace.yaml remains the single source of truth.

**Alternative considered**: Add explicit `repos` top-level section to workspace.yaml — rejected because it duplicates the repo URL/branch info already present in service entries, creating consistency risk.

### 3. Optional `path` field on ServiceConfig

Add `path?: string` to `ServiceConfig`. When set, it indicates the service lives at that subdirectory within the repo. Commands that need the service directory will use `path.join(reposDir, repoName, service.path)`.

**Rationale**: Minimal schema change. Only needed for monorepo scenarios; services in their own repo simply omit `path`.

### 4. Repo directory naming collision handling

If two different git URLs produce the same repo name (e.g., `git@gitlab.com:team/app.git` and `git@github.com:org/app.git`), append a numeric suffix: `app`, `app-2`, `app-3`, etc. The mapping is deterministic based on insertion order of services in `workspace.yaml`.

**Rationale**: Collisions are rare. A simple suffix approach avoids complex hashing while staying predictable.

### 5. `mrw repo` command with list and status subcommands

- `mrw repo list` — display all unique repos with their services
- `mrw repo status` — show clone state and branch for each repo

**Rationale**: Provides visibility into the repo layer that was previously hidden. Essential for understanding which services share a repo.

## Risks / Trade-offs

- **[Breaking change to directory layout]** → Existing `.mrw/state/repos/` directories with service-name layout will be stale. Users must delete and re-sync. Document this clearly in release notes.
- **[Services sharing a repo must share a branch]** → If a user tries to configure two services from the same repo with different branches, the system should warn/reject. This is a constraint of the shared-clone model.
- **[Repo name collisions]** → Rare but possible. The suffix approach is deterministic but not human-friendly. Acceptable tradeoff given rarity.
- **[All commands need service→repo resolution]** → Centralizing this in `lib/workspace.ts` via `getRepoIndex()` and `getServiceRepoDir()` avoids scattering the logic across commands.
