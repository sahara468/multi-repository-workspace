## ADDED Requirements

### Requirement: Service repos cloned to repos/ directory
The system SHALL clone and pull service repositories into `repos/` at the workspace root, not `.mrw/state/repos/`.

#### Scenario: Sync clones repos into repos/
- **WHEN** user runs `mrw sync` in a workspace
- **THEN** service repositories SHALL be cloned into `<cwd>/repos/<repo-name>/`

#### Scenario: Sync pulls existing repos in repos/
- **WHEN** user runs `mrw sync` and a repo already exists in `repos/<repo-name>/`
- **THEN** the system SHALL pull changes into that directory

### Requirement: All commands use repos/ for repo paths
All MRW commands that reference repository directories SHALL resolve paths relative to `repos/` at the workspace root.

#### Scenario: mrw status resolves repo paths from repos/
- **WHEN** user runs `mrw status`
- **THEN** the system SHALL check repository status under `repos/<repo-name>/` (not `.mrw/state/repos/`)

#### Scenario: mrw repo list shows repos/ paths
- **WHEN** user runs `mrw repo list`
- **THEN** the system SHALL report repository paths relative to `repos/`

#### Scenario: getServiceRepoDir returns repos/ path
- **WHEN** `getServiceRepoDir()` is called
- **THEN** it SHALL return a path under `<cwd>/repos/<repo-name>/`

### Requirement: Init creates repos/ directory
The system SHALL create the `repos/` directory during workspace initialization.

#### Scenario: Plain init creates repos/
- **WHEN** user runs `mrw init` without `--from-arch`
- **THEN** the system SHALL create `repos/` directory at the workspace root

#### Scenario: Design-driven init creates repos/
- **WHEN** user runs `mrw init --from-arch <url>`
- **THEN** the system SHALL create `repos/` directory at the workspace root

### Requirement: Gitignore uses .mrw/ not .mrw/state/
The system SHALL add `.mrw/` to `.gitignore` during initialization. The `repos/` directory SHALL NOT be gitignored.

#### Scenario: Init creates correct gitignore
- **WHEN** user runs `mrw init` (with or without `--from-arch`)
- **THEN** the system SHALL add `.mrw/` to `.gitignore` and SHALL NOT add `repos/` to `.gitignore`
