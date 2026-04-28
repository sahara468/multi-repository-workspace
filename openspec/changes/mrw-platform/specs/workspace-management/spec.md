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

### Requirement: Service registration via file import
The system SHALL allow registering microservice repositories by importing from a YAML file (services.yaml), rather than interactive loop-based entry.

#### Scenario: Import services from file during init
- **WHEN** user runs `mrw init` and a `services.yaml` file exists in the current directory
- **THEN** the system SHALL read the services from the file and add them to the `services` section of workspace.yaml
- **THEN** the system SHALL validate each service entry (mandatory fields: name, repo, branch)
- **THEN** the system SHALL report the number of services imported and any validation errors

#### Scenario: Import services from a specified file
- **WHEN** user runs `mrw service import --file <path>`
- **THEN** the system SHALL read services from the specified YAML file
- **THEN** the system SHALL add new services to workspace.yaml
- **THEN** for services already registered, the system SHALL update their fields with values from the file (merge behavior)
- **THEN** the system SHALL report added, updated, and skipped services

#### Scenario: Service definition validation
- **WHEN** workspace.yaml contains a service entry
- **THEN** the system SHALL require `name`, `repo`, and `branch` fields as mandatory
- **THEN** `language` and `description` fields SHALL be optional

### Requirement: Service CRUD management
The system SHALL provide dedicated commands for adding, removing, and updating service registrations after workspace initialization.

#### Scenario: Add a single service
- **WHEN** user runs `mrw service add <name> --repo <url> --branch <name>`
- **THEN** the system SHALL add the service entry to workspace.yaml
- **THEN** the system SHALL validate mandatory fields (repo, branch)
- **THEN** the system SHALL reject if a service with the same name already exists

#### Scenario: Remove a service
- **WHEN** user runs `mrw service remove <name>`
- **THEN** the system SHALL remove the service entry from workspace.yaml
- **THEN** the system SHALL NOT delete the cloned repository under `.mrw/state/repos/<name>/`
- **THEN** the system SHALL display a warning that the cloned repo still exists locally

#### Scenario: Update a service
- **WHEN** user runs `mrw service update <name> [--repo <url>] [--branch <name>] [--language <lang>] [--description <desc>]`
- **THEN** the system SHALL update only the specified fields for the service in workspace.yaml
- **THEN** the system SHALL reject if the service name does not exist in workspace.yaml

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
