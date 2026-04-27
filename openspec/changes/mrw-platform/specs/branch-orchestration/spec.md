## ADDED Requirements

### Requirement: Cross-repo branch creation
The system SHALL provide `mrw branch create <branch-name>` command to create branches across multiple service repositories.

#### Scenario: Create branch for all services
- **WHEN** user runs `mrw branch create <branch-name>`
- **THEN** the system SHALL create the specified branch in all cloned service repositories
- **THEN** the system SHALL display the result for each service (success/failure/already-exists)

#### Scenario: Create branch for specified services
- **WHEN** user runs `mrw branch create <branch-name> --services <s1,s2,...>`
- **THEN** the system SHALL create the branch only in the specified service repositories

#### Scenario: Branch creation with uncommitted changes
- **WHEN** user runs `mrw branch create` and a service repository has uncommitted changes
- **THEN** the system SHALL skip branch creation for that repository and display a warning

### Requirement: Cross-repo branch checkout
The system SHALL provide `mrw checkout <branch-name>` command to switch branches across multiple service repositories.

#### Scenario: Checkout branch for all services
- **WHEN** user runs `mrw checkout <branch-name>`
- **THEN** the system SHALL switch each cloned service repository to the specified branch if it exists
- **THEN** the system SHALL display the result for each service (success/failure/branch-not-found)

#### Scenario: Checkout branch for specified services
- **WHEN** user runs `mrw checkout <branch-name> --services <s1,s2,...>`
- **THEN** the system SHALL switch only the specified service repositories to the target branch

#### Scenario: Checkout with uncommitted changes
- **WHEN** user runs `mrw checkout` and a service repository has uncommitted changes
- **THEN** the system SHALL skip checkout for that repository and display a warning with the service name

### Requirement: Branch status visibility
The system SHALL show branch information as part of the workspace status.

#### Scenario: View branch status across services
- **WHEN** user runs `mrw status`
- **THEN** the system SHALL display the current branch for each cloned service repository
- **THEN** the system SHALL highlight when services are on different branches
