## ADDED Requirements

### Requirement: Spec directory structure
The system SHALL manage Workspace-level specifications under the `specs/` directory.

#### Scenario: Standard spec directory layout
- **WHEN** a workspace is initialized
- **THEN** the `specs/` directory SHALL exist with subdirectories: `capabilities/`, `entries/`, `constraints/`
- **THEN** each subdirectory SHALL contain Markdown files for its respective spec type

### Requirement: List workspace specs
The system SHALL provide `mrw spec list` command to list all Workspace-level specifications.

#### Scenario: List all specs
- **WHEN** user runs `mrw spec list`
- **THEN** the system SHALL display all spec files under `specs/` organized by type (capabilities, entries, constraints)
- **THEN** each entry SHALL show the spec name and the services it involves (if declared in frontmatter)

### Requirement: Show spec content
The system SHALL provide `mrw spec show <name>` command to display a specific specification.

#### Scenario: Show a capability spec
- **WHEN** user runs `mrw spec show <name>`
- **THEN** the system SHALL find and display the spec file matching the name from the appropriate subdirectory
- **THEN** the system SHALL search across capabilities/, entries/, and constraints/ directories

### Requirement: Create workspace spec
The system SHALL provide `mrw spec create <name>` command to create a new specification file.

#### Scenario: Create a capability spec
- **WHEN** user runs `mrw spec create <name> --type capability`
- **THEN** the system SHALL create a new Markdown file at `specs/capabilities/<name>.md`
- **THEN** the file SHALL contain YAML frontmatter with `name` and `involves` (list of service names) fields

#### Scenario: Create an entry point spec
- **WHEN** user runs `mrw spec create <name> --type entry`
- **THEN** the system SHALL create a new Markdown file at `specs/entries/<name>.md`

#### Scenario: Create a constraint spec
- **WHEN** user runs `mrw spec create <name> --type constraint`
- **THEN** the system SHALL create a new Markdown file at `specs/constraints/<name>.md`

### Requirement: Spec-service association
Specs SHALL be able to declare which services they involve through YAML frontmatter.

#### Scenario: Spec with service association
- **WHEN** a spec file contains `involves: [order-service, payment-service]` in its frontmatter
- **THEN** the system SHALL recognize the association and display it in `mrw spec list`
- **THEN** the system SHALL support filtering specs by service name

### Requirement: Topology description
The system SHALL support service topology description as a Markdown file at `specs/topology.md`.

#### Scenario: Topology as text description
- **WHEN** a workspace contains `specs/topology.md`
- **THEN** the system SHALL treat it as the authoritative description of service relationships
- **THEN** the content SHALL be free-form Markdown text describing service interactions, dependencies, and communication patterns
