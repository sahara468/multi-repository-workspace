## 1. Core Library Changes

- [x] 1.1 Add `ArchConfig` type (`{ repo: string; branch: string }`) and optional `arch` field to `WorkspaceConfig` in `src/lib/workspace.ts`
- [x] 1.2 Add `isDesignDriven(config)` helper that returns `true` when `config.arch` is set
- [x] 1.3 Add `archRepoDir(config, cwd)` function that returns the arch repo directory path at workspace root using `deriveRepoName`
- [x] 1.4 Add `getArchRepoEntry(config)` function that returns a `RepoEntry`-like object for the arch repo (for use in sync/status/branch/checkout)
- [x] 1.5 Update `getServiceRepoDir()` to return path under `repos/` instead of `.mrw/state/repos/`
- [x] 1.6 Add `getReposDir(cwd)` helper returning `<cwd>/repos/`

## 2. Init Command — Repos Directory

- [x] 2.1 Update `initInteractive` to create `repos/` instead of `.mrw/state/repos/`
- [x] 2.2 Update `initFromTemplate` to create `repos/` instead of `.mrw/state/repos/`
- [x] 2.3 Update `.gitignore` generation: add `.mrw/` instead of `.mrw/state/`, do NOT add `repos/`

## 3. Init Command — Design-Driven Mode

- [x] 3.1 Add `--from-arch <repo-url>` option to `init` command
- [x] 3.2 Add `--arch-branch <branch>` option (default: `main`)
- [x] 3.3 Implement `initFromArch(cwd, repoUrl, branch)` function: clone arch repo, validate convention, import services, create workspace (no service repo sync)
- [x] 3.4 Clone arch repo to `<cwd>/<deriveRepoName(repoUrl)>/` using `simple-git`
- [x] 3.5 Validate arch repo: require `services.yaml`, warn if `specs/` or `arch/` missing
- [x] 3.6 Import services from `<arch-repo>/services.yaml` into `workspace.yaml` config (NOT clone service repos)
- [x] 3.7 Set `arch` field in `WorkspaceConfig` with repo URL and branch
- [x] 3.8 Clean up cloned arch repo on validation failure (missing `services.yaml`)
- [x] 3.9 Print message telling user to run `mrw sync` to clone service repos

## 4. Sync Command Updates

- [x] 4.1 Update `sync` to clone/pull repos into `repos/` instead of `.mrw/state/repos/`
- [x] 4.2 Add arch repo pull logic: if `config.arch` exists, pull the arch repo at root first (before service repos), using `getArchRepoEntry`
- [x] 4.3 Handle uncommitted changes in arch repo (skip + warn, same as service repos)
- [x] 4.4 Include arch repo in sync summary output with `[arch]` label

## 5. Other Command Updates

- [x] 5.1 Update `mrw status` to resolve repo paths from `repos/`
- [x] 5.2 Update `mrw status` to display arch repo info when `config.arch` is present
- [x] 5.3 Update `mrw repo list` to include arch repo with `[arch]` label when `config.arch` is present
- [x] 5.4 Update `mrw repo status` to include arch repo when `config.arch` is present
- [x] 5.5 Update `mrw service remove` orphan warning to reference `repos/` path
- [x] 5.6 Audit `mrw branch` and `mrw checkout` commands for `.mrw/state/repos/` references and update
- [x] 5.7 Update `mrw branch create` to include arch repo when `config.arch` is present
- [x] 5.8 Update `mrw checkout` to include arch repo when `config.arch` is present

## 5b. Service Command Restrictions (Design-Driven Mode)

- [x] 5b.1 Block `mrw service add` in design-driven workspaces: display error suggesting `mrw service import`
- [x] 5b.2 Block `mrw service remove` in design-driven workspaces: display error suggesting `mrw service import`
- [x] 5b.3 Update `mrw service import` default file path: in design-driven mode, default to arch repo's `services.yaml`
- [x] 5b.4 Ensure `mrw service list` and `mrw service update` work normally in design-driven workspaces

## 6. Tests

- [x] 6.1 Update existing `workspace.test.ts` for `getServiceRepoDir` returning `repos/` path
- [x] 6.2 Add tests for `ArchConfig` type, `isDesignDriven`, `archRepoDir`, and `getArchRepoEntry` functions
- [x] 6.3 Add tests for `initFromArch`: successful init, missing services.yaml, missing specs/arch warnings
- [x] 6.4 Add tests for `mrw init --from-arch` CLI integration
- [x] 6.5 Update `sync.test.ts` for `repos/` directory path
- [x] 6.6 Add tests for sync pulling arch repo and including it in summary
- [x] 6.7 Update `status.test.ts` and `repo.test.ts` for `repos/` paths and arch repo display
- [x] 6.8 Add test for `.gitignore` using `.mrw/` (not `.mrw/state/`)
- [x] 6.9 Add tests for `mrw service add` blocked in design-driven workspace
- [x] 6.10 Add tests for `mrw service remove` blocked in design-driven workspace
- [x] 6.11 Add tests for `mrw service import` defaulting to arch repo's `services.yaml` in design-driven mode
- [x] 6.12 Add tests for `mrw branch create` and `mrw checkout` including arch repo
- [x] 6.13 Add tests for `mrw repo list` and `mrw repo status` including arch repo with `[arch]` label
- [x] 6.14 Add test for `mrw init --from-arch` NOT syncing service repos

## 7. Documentation

- [x] 7.1 Update `CLAUDE.md` architecture section to reflect `repos/` directory and arch mode
- [x] 7.2 Update `docs/architecture-design.md` with design-driven workspace mode and arch repo convention
