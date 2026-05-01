## ADDED Requirements

### Requirement: Repo list command
The system SHALL provide a `mrw repo list` command that displays all unique git repositories in the workspace, grouped by repo URL. Each entry SHALL show the repo directory name, git URL, branch, and the list of services that reference it.

#### Scenario: List repos with shared monorepo
- **WHEN** workspace has services `user-api` and `order-api` both referencing `https://github.com/org/platform.git`
- **AND** service `auth-api` referencing `https://github.com/org/auth-service.git`
- **THEN** `mrw repo list` SHALL display two repos: `platform` (with services `user-api`, `order-api`) and `auth-service` (with service `auth-api`)

#### Scenario: List repos when no repos are cloned
- **WHEN** workspace has services defined but none are cloned
- **THEN** `mrw repo list` SHALL still display the repo entries with a "not cloned" indicator

#### Scenario: List repos with no workspace
- **WHEN** no `workspace.yaml` exists in the current directory
- **THEN** `mrw repo list` SHALL print an error message and exit

### Requirement: Repo status command
The system SHALL provide a `mrw repo status` command that shows the clone state, current branch, and clean/dirty status for each unique repository.

#### Scenario: Show status for cloned repos
- **WHEN** repos are cloned and one has uncommitted changes
- **THEN** `mrw repo status` SHALL display each repo's current branch and indicate which repos have uncommitted changes

#### Scenario: Show status for uncloned repos
- **WHEN** a repo is defined in workspace.yaml but not yet cloned
- **THEN** `mrw repo status` SHALL display that repo with a "not cloned" indicator

### Requirement: Repo index computation
The system SHALL provide a `getRepoIndex()` function in `lib/workspace.ts` that computes a mapping from repo directory name to `{ url, branch, services: string[] }` by grouping services by their `repo` URL.

#### Scenario: Group services by repo URL
- **WHEN** services `svc-a` and `svc-b` both have `repo: "https://github.com/org/mono.git"`
- **THEN** `getRepoIndex()` SHALL return a single entry keyed by `mono` containing both services

#### Scenario: Handle repo name collisions
- **WHEN** two different repo URLs produce the same directory name (e.g., both end in `app.git`)
- **THEN** `getRepoIndex()` SHALL append a numeric suffix (`app`, `app-2`) to differentiate them

### Requirement: Derive repo name from URL
The system SHALL derive the repo directory name from the last segment of the git URL, stripping any `.git` suffix.

#### Scenario: HTTPS URL with .git suffix
- **WHEN** repo URL is `https://github.com/org/platform-services.git`
- **THEN** the derived repo name SHALL be `platform-services`

#### Scenario: SSH URL without .git suffix
- **WHEN** repo URL is `git@github.com:org/my-repo`
- **THEN** the derived repo name SHALL be `my-repo`

#### Scenario: URL with trailing slash
- **WHEN** repo URL is `https://github.com/org/my-repo/`
- **THEN** the derived repo name SHALL be `my-repo`
