## ADDED Requirements

### Requirement: Workspace initialization
The system SHALL provide `mrw init` command to create a new Workspace with a `workspace.yaml` definition file in the current directory.

#### Scenario: Initialize a new workspace interactively
- **WHEN** user runs `mrw init` in an empty directory
- **THEN** the system SHALL prompt for workspace name, description, and domain
- **THEN** the system SHALL create `workspace.yaml` with the provided information
- **THEN** the system SHALL create `.mrw/` directory structure (state/repos/, state/index/, changes/)
- **THEN** the system SHALL create `specs/` directory
- **THEN** the system SHALL create `.gitignore` with `.mrw/state/` entry

#### Scenario: Initialize from a template
- **WHEN** user runs `mrw init --from-template <template-name>`
- **THEN** the system SHALL create workspace.yaml pre-populated with template service definitions

### Requirement: Service registration
The system SHALL allow registering microservice repositories in workspace.yaml with the following fields: name, repo URL, default branch, language, description.

#### Scenario: Add a service to workspace
- **WHEN** user runs `mrw init` and provides service information during initialization
- **THEN** the system SHALL add the service entry to the `services` section of workspace.yaml

#### Scenario: Service definition validation
- **WHEN** workspace.yaml contains a service entry
- **THEN** the system SHALL require `name`, `repo`, and `branch` fields as mandatory
- **THEN** `language` and `description` fields SHALL be optional

### Requirement: Repository synchronization
The system SHALL provide `mrw sync` command to clone and update all registered service repositories.

#### Scenario: Sync all repositories
- **WHEN** user runs `mrw sync`
- **THEN** the system SHALL clone each registered service repository to `.mrw/state/repos/<service-name>/` if not already cloned
- **THEN** the system SHALL pull the latest changes for already-cloned repositories
- **THEN** the system SHALL display sync status for each service (success/failure/current branch)

#### Scenario: Sync a single repository
- **WHEN** user runs `mrw sync <service-name>`
- **THEN** the system SHALL only sync the specified service repository

#### Scenario: Sync with existing local changes
- **WHEN** user runs `mrw sync` and a repository has uncommitted changes
- **THEN** the system SHALL skip pulling for that repository and display a warning

### Requirement: Workspace status
The system SHALL provide `mrw status` command to display the current state of the workspace.

#### Scenario: View workspace status
- **WHEN** user runs `mrw status`
- **THEN** the system SHALL display workspace name and description
- **THEN** the system SHALL list all registered services with their current branch, sync status, and whether there are uncommitted changes
- **THEN** the system SHALL indicate if any service repository is not yet cloned

### Requirement: Workspace directory structure
The system SHALL enforce a standard directory structure for Workspaces.

#### Scenario: Standard directory layout
- **WHEN** a workspace is initialized
- **THEN** the following structure SHALL exist:
  - `workspace.yaml` — workspace definition (tracked in Git)
  - `specs/` — workspace-level specifications (tracked in Git)
  - `.mrw/` — MRW working directory
  - `.mrw/state/repos/` — cloned service repositories (NOT tracked in Git)
  - `.mrw/state/index/` — index caches (NOT tracked in Git)
  - `.mrw/changes/` — cross-service OpenSpec changes (tracked in Git)

### Requirement: workspace.yaml format
The system SHALL use YAML format for workspace definition with a defined schema.

#### Scenario: workspace.yaml schema
- **WHEN** the system reads workspace.yaml
- **THEN** it SHALL recognize the following top-level fields: `version`, `workspace` (name, description, domain), `services` (map of service definitions)
- **THEN** each service entry SHALL contain: `repo` (git URL), `branch` (default branch name), and optionally `language`, `description`
