## ADDED Requirements

### Requirement: CLI options for workspace metadata
The `mrw init` command SHALL accept `--name <string>` and `--description <string>` CLI options to specify workspace metadata without interactive prompts.

#### Scenario: All metadata provided via CLI
- **WHEN** user runs `mrw init --name my-project --description "My project"`
- **THEN** the workspace is created with `workspace.name` set to "my-project" and `workspace.description` set to "My project", without any interactive prompts

#### Scenario: Only name provided via CLI
- **WHEN** user runs `mrw init --name my-project` in an interactive terminal
- **THEN** the workspace name is set to "my-project" and the user is prompted for description only

#### Scenario: Name and directory provided via CLI
- **WHEN** user runs `mrw init my-workspace --name my-project`
- **THEN** the directory `my-workspace/` is created and workspace is initialized with name "my-project" without prompts

### Requirement: Domain is not part of init flow
The `mrw init` command SHALL NOT prompt for or accept a `domain` value. The `domain` field in `WorkspaceConfig` remains optional but is never set during init.

#### Scenario: Init does not prompt for domain
- **WHEN** user runs `mrw init` in an interactive terminal
- **THEN** the command prompts for workspace name and description only (no domain prompt)

### Requirement: --from-template is removed
The `mrw init` command SHALL NOT support `--from-template` option. The `initFromTemplate` function and all template-related code SHALL be removed.

#### Scenario: --from-template rejected
- **WHEN** user runs `mrw init --from-template microservice-java`
- **THEN** the command SHALL display an error indicating `--from-template` is not a valid option

### Requirement: Non-interactive mode when stdin is not a TTY
When `process.stdin.isTTY` is `false` (piped input, CI environment), the command SHALL NOT display interactive prompts. If `--name` is missing, the command SHALL exit with an error.

#### Scenario: Non-interactive without name
- **WHEN** user runs `mrw init` in a non-interactive environment (stdin is not a TTY) without `--name`
- **THEN** the command SHALL display an error like "Workspace name is required in non-interactive mode. Use --name <name>" and exit with a non-zero code

#### Scenario: Non-interactive with name
- **WHEN** user runs `mrw init --name my-project` in a non-interactive environment
- **THEN** the workspace is created with name "my-project" and description left unset, without any prompts

### Requirement: --from-arch derives name from repo URL
When using `--from-arch` mode without `--name`, the workspace name SHALL default to the derived repo name (via `deriveRepoName`), making `--from-arch` fully non-interactive by default.

#### Scenario: --from-arch without --name
- **WHEN** user runs `mrw init --from-arch https://example.com/my-arch.git --arch-branch main`
- **THEN** the workspace name is set to "my-arch" (derived from the repo URL) without prompting

#### Scenario: --from-arch with --name override
- **WHEN** user runs `mrw init --from-arch https://example.com/my-arch.git --name custom-name`
- **THEN** the workspace name is set to "custom-name" (the explicit `--name` takes precedence)

### Requirement: Interactive mode when options are missing
When `process.stdin.isTTY` is `true` and required fields are not provided via CLI options, the command SHALL prompt the user interactively for name and description.

#### Scenario: Interactive mode with no options
- **WHEN** user runs `mrw init` in an interactive terminal
- **THEN** the command SHALL prompt for workspace name and description (no domain prompt)

#### Scenario: Interactive mode with partial options
- **WHEN** user runs `mrw init --name my-project` in an interactive terminal
- **THEN** the name is set from the option and the user is only prompted for description
