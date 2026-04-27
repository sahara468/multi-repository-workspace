## ADDED Requirements

### Requirement: Cross-service change proposal
The system SHALL provide `mrw change propose <name>` command to create a cross-service change proposal.

#### Scenario: Create a cross-service change
- **WHEN** user runs `mrw change propose <name>`
- **THEN** the system SHALL create a directory at `.mrw/changes/<name>/`
- **THEN** the system SHALL create `proposal.md` with a template that includes: overview, affected services table, cross-service impact section
- **THEN** the proposal template SHALL reference services registered in workspace.yaml

### Requirement: List active changes
The system SHALL provide `mrw change list` command to list all active cross-service changes.

#### Scenario: List all changes
- **WHEN** user runs `mrw change list`
- **THEN** the system SHALL display all directories under `.mrw/changes/` with their name and brief description from proposal.md

### Requirement: Cross-service design
The system SHALL provide `mrw change design <name>` command to manage cross-service design documents.

#### Scenario: Create cross-service design
- **WHEN** user runs `mrw change design <name>` and no design.md exists yet
- **THEN** the system SHALL create `design.md` at `.mrw/changes/<name>/` with a template covering: cross-service interaction design, per-service design scope, interface contracts

### Requirement: Per-service task decomposition
The system SHALL provide `mrw change tasks <name>` command to manage tasks decomposed by service.

#### Scenario: Create per-service tasks
- **WHEN** user runs `mrw change tasks <name>` and no tasks.md exists yet
- **THEN** the system SHALL create `tasks.md` at `.mrw/changes/<name>/` with a template organized by service
- **THEN** the template SHALL contain a section per affected service with its specific implementation tasks
- **THEN** the template SHALL include a cross-service coordination section for tasks requiring synchronized changes

### Requirement: Change-proposal service association
Cross-service change proposals SHALL declare which services they affect.

#### Scenario: Proposal with affected services
- **WHEN** a change proposal is created
- **THEN** the proposal template SHALL include a table with columns: service name, impact type, priority
- **THEN** the service names SHALL be validated against services registered in workspace.yaml

### Requirement: OpenSpec compatibility
The cross-service change directory structure SHALL be compatible with OpenSpec conventions.

#### Scenario: Change directory structure
- **WHEN** a cross-service change is created
- **THEN** the directory SHALL contain: `proposal.md`, `design.md`, `specs/` subdirectory, `tasks.md`
- **THEN** this structure SHALL be consistent with OpenSpec's change schema, extended with cross-service dimensions

#### Scenario: Per-service spec files within a change
- **WHEN** a cross-service change affects multiple services
- **THEN** the `specs/` subdirectory SHALL contain per-service impact spec files (e.g., `order-service-impact.md`, `payment-service-impact.md`)
