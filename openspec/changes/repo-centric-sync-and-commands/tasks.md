## 1. Core Library — Repo Index & Resolution

- [x] 1.1 Add `path?: string` field to `ServiceConfig` interface in `src/lib/workspace.ts`
- [x] 1.2 Implement `deriveRepoName(repoUrl: string): string` — extract directory name from git URL, strip `.git` suffix and trailing slashes
- [x] 1.3 Implement `getRepoIndex(config: WorkspaceConfig): RepoIndex` — group services by repo URL, return map of repo-name → `{ url, branch, services: string[] }`, handle name collisions with numeric suffix
- [x] 1.4 Implement `getServiceRepoDir(serviceName: string, config: WorkspaceConfig, cwd: string): string` — resolve service name to its repo directory path under `.mrw/state/repos/`
- [x] 1.5 Add unit tests for `deriveRepoName` (HTTPS, SSH, trailing slash, `.git` suffix, collision handling)
- [x] 1.6 Add unit tests for `getRepoIndex` (single repo, shared repo, collision, mixed)
- [x] 1.7 Add unit tests for `getServiceRepoDir` (with and without `path` field)

## 2. Update Existing Commands

- [x] 2.1 Update `mrw sync` to use repo-centric cloning: iterate over `getRepoIndex()` instead of services, clone/pull each unique repo once, report all services per repo in summary
- [x] 2.2 Add branch conflict warning in `mrw sync` when services sharing a repo specify different branches
- [x] 2.3 Update `mrw status` to display repo names and shared-service grouping, use `getServiceRepoDir()` for git operations
- [x] 2.4 Update `mrw branch create` to use `getServiceRepoDir()`, skip duplicate repo operations (don't create branch twice on same repo)
- [x] 2.5 Update `mrw checkout` to use `getServiceRepoDir()`, skip duplicate repo operations
- [x] 2.6 Update `mrw reset` to use `getRepoIndex()` and operate on unique repos, report all affected services per repo
- [x] 2.7 Update `mrw service add` to accept `--path` option and save it to ServiceConfig
- [x] 2.8 Update `mrw service update` to accept `--path` option, allow clearing path with `--path ""`
- [x] 2.9 Update `mrw service remove` to show repo-aware warnings (shared repo vs orphaned repo)

## 3. New Commands

- [x] 3.1 Create `src/commands/repo.ts` with `mrw repo list` subcommand — display all unique repos with their services
- [x] 3.2 Add `mrw repo status` subcommand — show clone state, branch, and clean/dirty status for each repo
- [x] 3.3 Add `mrw service list` subcommand to `src/commands/service.ts` — display all services with repo, branch, and path
- [x] 3.4 Register `repoCommand` in `src/cli.ts`

## 4. Tests

- [x] 4.1 Add integration tests for `mrw sync` with shared repos (monorepo scenario)
- [x] 4.2 Add integration tests for `mrw repo list` and `mrw repo status`
- [x] 4.3 Add integration tests for `mrw service list` and `--path` support
- [x] 4.4 Add integration tests for branch conflict warning in sync
- [x] 4.5 Update existing tests for `sync`, `status`, `branch`, `checkout`, `reset` to use repo-centric directory layout
- [x] 4.6 Run `npm run lint && npx vitest run` to verify all tests pass and types are correct
