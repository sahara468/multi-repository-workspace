## MODIFIED Requirements

### Requirement: Service list command
The system SHALL provide a `mrw service list` command that displays all registered services with their repo URL, branch, and optional path.

#### Scenario: List all services
- **WHEN** workspace has services `user-api` (repo: `platform.git`, path: `services/user-api`), `order-api` (repo: `platform.git`, path: `services/order-api`), and `auth-api` (repo: `auth-service.git`)
- **THEN** `mrw service list` SHALL display all three services with their repo, branch, and path (when set)

#### Scenario: List services with no workspace
- **WHEN** no `workspace.yaml` exists in the current directory
- **THEN** `mrw service list` SHALL print an error message and exit

### Requirement: Service remove with repo-aware warning
The `mrw service remove` command SHALL warn if the removed service's repo is still referenced by other services. If no other services reference the repo, it SHALL warn that the cloned repo directory is orphaned.

#### Scenario: Remove service with shared repo
- **WHEN** service `user-api` is removed and `order-api` still references the same repo
- **THEN** the warning SHALL indicate that the repo is still in use by `order-api`

#### Scenario: Remove service with orphaned repo
- **WHEN** service `auth-api` is removed and no other service references `auth-service.git`
- **THEN** the warning SHALL indicate that the cloned repo at `.mrw/state/repos/auth-service/` is now orphaned

### Requirement: Service path field support
The `mrw service add` command SHALL accept an optional `--path` argument for specifying the service's subdirectory within the repo. The `mrw service update` command SHALL accept `--path` to update or clear the path.

#### Scenario: Add service with path
- **WHEN** user runs `mrw service add user-api --repo https://github.com/org/platform.git --branch main --path services/user-api`
- **THEN** the service SHALL be saved with `path: "services/user-api"`

#### Scenario: Update service path
- **WHEN** user runs `mrw service update user-api --path services/v2/user-api`
- **THEN** the service's path SHALL be updated to `services/v2/user-api`

#### Scenario: Clear service path
- **WHEN** user runs `mrw service update user-api --path ""`
- **THEN** the service's path field SHALL be removed from the config
