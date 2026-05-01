## MODIFIED Requirements

### Requirement: Workspace initialization creates directory structure
The `mrw init` command SHALL create the `.mrw/` directory and `.mrw/state/` directory. The command SHALL NOT create `.mrw/changes/`, `.mrw/state/index/`, or `specs/` directories.

#### Scenario: Init creates core directories only
- **WHEN** user runs `mrw init`
- **THEN** `.mrw/` and `.mrw/state/` directories are created
- **AND** `.mrw/changes/`, `.mrw/state/index/`, and `specs/` directories are NOT created
