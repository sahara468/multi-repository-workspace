## ADDED Requirements

### Requirement: Initialize workspace from arch repo URL
The system SHALL support `mrw init --from-arch <repo-url>` to initialize a workspace by cloning a service architecture design repo.

#### Scenario: Design-driven initialization with valid arch repo
- **WHEN** user runs `mrw init --from-arch https://github.com/org/order-service-arch.git` in an empty directory
- **THEN** the system SHALL clone the arch repo to `<cwd>/order-service-arch/`, create `workspace.yaml` with an `arch` field containing `{ repo, branch }`, and import services from `<cwd>/order-service-arch/services.yaml` into the workspace config
- **AND** the system SHALL NOT clone service repos during init (user runs `mrw sync` separately)

#### Scenario: Design-driven init with custom branch
- **WHEN** user runs `mrw init --from-arch <repo-url> --arch-branch develop`
- **THEN** the system SHALL clone the arch repo using the specified branch

#### Scenario: Workspace already exists
- **WHEN** user runs `mrw init --from-arch <repo-url>` in a directory that already has `workspace.yaml`
- **THEN** the system SHALL display an error and exit without modifying anything

#### Scenario: Arch repo clone failure
- **WHEN** the arch repo URL is unreachable or does not exist
- **THEN** the system SHALL display an error message and exit without creating any files

### Requirement: Arch repo directory name derived from URL
The system SHALL use `deriveRepoName(repoUrl)` to determine the directory name for the cloned arch repo at the workspace root.

#### Scenario: Standard HTTPS URL
- **WHEN** arch repo URL is `https://github.com/org/order-service-arch.git`
- **THEN** the arch repo SHALL be cloned to `<cwd>/order-service-arch/`

#### Scenario: SSH URL
- **WHEN** arch repo URL is `git@github.com:org/order-service-arch.git`
- **THEN** the arch repo SHALL be cloned to `<cwd>/order-service-arch/`

### Requirement: Arch repo convention validation
The system SHALL validate that the arch repo contains `services.yaml` at its root. The system SHALL warn if `specs/` or `arch/` directories are missing but SHALL NOT fail.

#### Scenario: Arch repo with full convention structure
- **WHEN** the cloned arch repo contains `services.yaml`, `specs/capabilities/`, `specs/entries/`, and `arch/`
- **THEN** the system SHALL proceed without warnings

#### Scenario: Arch repo missing services.yaml
- **WHEN** the cloned arch repo does not contain `services.yaml`
- **THEN** the system SHALL display an error indicating that `services.yaml` is required and remove the cloned arch repo

#### Scenario: Arch repo missing specs or arch directories
- **WHEN** the cloned arch repo contains `services.yaml` but is missing `specs/` or `arch/` directories
- **THEN** the system SHALL display a warning about the missing directories and continue initialization

### Requirement: Workspace config arch field
The system SHALL store arch repo information in `workspace.yaml` under an optional `arch` field with `repo` and `branch` properties.

#### Scenario: Design-driven init sets arch field
- **WHEN** workspace is initialized with `--from-arch`
- **THEN** `workspace.yaml` SHALL contain `arch: { repo: "<url>", branch: "<branch>" }`

#### Scenario: Plain init does not set arch field
- **WHEN** workspace is initialized without `--from-arch`
- **THEN** `workspace.yaml` SHALL NOT contain an `arch` field

### Requirement: Sync pulls arch repo
The system SHALL pull the arch repo during `mrw sync` if the `arch` field exists in `workspace.yaml`.

#### Scenario: Sync with arch repo present
- **WHEN** user runs `mrw sync` and `workspace.yaml` has an `arch` field
- **THEN** the system SHALL pull the arch repo (in addition to cloning/pulling service repos) and display the result in the sync summary

#### Scenario: Sync with arch repo having uncommitted changes
- **WHEN** user runs `mrw sync` and the arch repo has uncommitted changes
- **THEN** the system SHALL skip pulling the arch repo and display a warning about uncommitted changes

### Requirement: Status shows arch repo information
The system SHALL display arch repo information in `mrw status` output when the `arch` field is present in `workspace.yaml`.

#### Scenario: Status with arch repo
- **WHEN** user runs `mrw status` and the workspace has an `arch` field
- **THEN** the system SHALL display the arch repo name, branch, and sync status alongside other workspace information

### Requirement: Arch repo managed by sync/status/branch/checkout
The arch repo SHALL be treated as a first-class repository by `mrw sync`, `mrw status`, `mrw branch create`, and `mrw checkout`. It SHALL appear in repo listings and be included in branch/checkout operations.

#### Scenario: Sync includes arch repo
- **WHEN** user runs `mrw sync` and the workspace has an `arch` field
- **THEN** the system SHALL pull the arch repo and include it in the sync summary alongside service repos

#### Scenario: Repo list includes arch repo
- **WHEN** user runs `mrw repo list` and the workspace has an `arch` field
- **THEN** the system SHALL list the arch repo with its URL, branch, and a label indicating it is the arch repo

#### Scenario: Branch create includes arch repo
- **WHEN** user runs `mrw branch create <name>` and the workspace has an `arch` field
- **THEN** the system SHALL create the branch in the arch repo in addition to service repos

#### Scenario: Checkout includes arch repo
- **WHEN** user runs `mrw checkout <branch>` and the workspace has an `arch` field
- **THEN** the system SHALL checkout the branch in the arch repo in addition to service repos

#### Scenario: Repo list includes arch repo
- **WHEN** user runs `mrw repo list` and the workspace has an `arch` field
- **THEN** the system SHALL list the arch repo with its URL, branch, and an `[arch]` label

#### Scenario: Repo status includes arch repo
- **WHEN** user runs `mrw repo status` and the workspace has an `arch` field
- **THEN** the system SHALL display the arch repo's branch, clone status, and uncommitted-changes status alongside service repos

### Requirement: Design-driven workspace restricts service add and remove
In a design-driven workspace (one with the `arch` field in `workspace.yaml`), `mrw service add` and `mrw service remove` SHALL be blocked. Services SHALL only be modified via `mrw service import`.

#### Scenario: Service add blocked in design-driven workspace
- **WHEN** user runs `mrw service add <name>` in a design-driven workspace
- **THEN** the system SHALL display an error message indicating that service add is not allowed in design-driven workspaces and suggest using `mrw service import` instead

#### Scenario: Service remove blocked in design-driven workspace
- **WHEN** user runs `mrw service remove <name>` in a design-driven workspace
- **THEN** the system SHALL display an error message indicating that service remove is not allowed in design-driven workspaces and suggest using `mrw service import` instead

#### Scenario: Service add allowed in plain workspace
- **WHEN** user runs `mrw service add <name>` in a workspace without an `arch` field
- **THEN** the system SHALL proceed normally

#### Scenario: Service remove allowed in plain workspace
- **WHEN** user runs `mrw service remove <name>` in a workspace without an `arch` field
- **THEN** the system SHALL proceed normally

### Requirement: Service import defaults to arch repo in design-driven mode
In a design-driven workspace, `mrw service import` without `--file` SHALL default to the arch repo's `services.yaml`. The `--file` option SHALL still override this default.

#### Scenario: Import defaults to arch repo services.yaml
- **WHEN** user runs `mrw service import` without `--file` in a design-driven workspace
- **THEN** the system SHALL import services from the arch repo's `services.yaml`

#### Scenario: Import with explicit file in design-driven workspace
- **WHEN** user runs `mrw service import --file <path>` in a design-driven workspace
- **THEN** the system SHALL import services from the specified file

#### Scenario: Import in plain workspace unchanged
- **WHEN** user runs `mrw service import` without `--file` in a plain workspace
- **THEN** the system SHALL look for `services.yaml` in the workspace root (existing behavior)
