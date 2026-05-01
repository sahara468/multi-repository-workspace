## ADDED Requirements

### Requirement: Sync clones by repo, not by service
The `mrw sync` command SHALL clone each unique git repository exactly once under `.mrw/state/repos/<repo-name>/`, where `<repo-name>` is derived from the git URL. Multiple services referencing the same repo SHALL share the same cloned directory.

#### Scenario: Monorepo with multiple services
- **WHEN** services `user-api` and `order-api` both reference `https://github.com/org/platform.git`
- **THEN** `mrw sync` SHALL clone `platform.git` once into `.mrw/state/repos/platform/`
- **AND** the sync summary SHALL list both services as sharing the `platform` repo

#### Scenario: Service with its own repo
- **WHEN** service `auth-api` references `https://github.com/org/auth-service.git`
- **THEN** `mrw sync` SHALL clone into `.mrw/state/repos/auth-service/`

### Requirement: Sync pull for existing repos
When a repo directory already exists, `mrw sync` SHALL pull the latest changes for that repo once, regardless of how many services reference it.

#### Scenario: Pull once for shared repo
- **WHEN** `platform` repo is already cloned and two services reference it
- **THEN** `mrw sync` SHALL perform `git pull` once on `.mrw/state/repos/platform/`
- **AND** both services SHALL be reported as updated in the summary

### Requirement: Sync skips dirty repos
The `mrw sync` command SHALL skip pulling a repo that has uncommitted changes, and report all services referencing that repo as "skipped (dirty)".

#### Scenario: Shared repo with uncommitted changes
- **WHEN** the `platform` repo has uncommitted changes and two services reference it
- **THEN** `mrw sync` SHALL skip pulling and report both services as skipped

### Requirement: Service-to-repo directory resolution
The system SHALL provide a `getServiceRepoDir()` function that, given a service name and workspace config, returns the absolute path to the repo directory containing that service.

#### Scenario: Service in repo root
- **WHEN** service `auth-api` has no `path` field and references `auth-service.git`
- **THEN** `getServiceRepoDir()` SHALL return `.mrw/state/repos/auth-service/`

#### Scenario: Service in subdirectory
- **WHEN** service `user-api` has `path: "services/user-api"` and references `platform.git`
- **THEN** the service directory SHALL be `.mrw/state/repos/platform/services/user-api/`
- **AND** `getServiceRepoDir()` SHALL return `.mrw/state/repos/platform/`

### Requirement: Branch conflict detection for shared repos
The system SHALL reject or warn when two services referencing the same repo are configured with different branches.

#### Scenario: Conflicting branches
- **WHEN** service `svc-a` references `platform.git` with `branch: main` and service `svc-b` references `platform.git` with `branch: develop`
- **THEN** `mrw sync` SHALL print a warning that services `svc-a` and `svc-b` share a repo but specify different branches
- **AND** SHALL use the first service's branch for cloning

### Requirement: Optional path field in ServiceConfig
The `ServiceConfig` interface SHALL support an optional `path` field indicating the subdirectory within the repo where the service source code resides.

#### Scenario: Service with path
- **WHEN** a service entry has `path: "services/user-api"`
- **THEN** commands operating on the service SHALL resolve the service directory as `.mrw/state/repos/<repo-name>/services/user-api/`

#### Scenario: Service without path
- **WHEN** a service entry has no `path` field
- **THEN** the service directory SHALL default to the repo root `.mrw/state/repos/<repo-name>/`
