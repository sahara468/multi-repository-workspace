## ADDED Requirements

### Requirement: Directory argument creates and initializes workspace
The `mrw init` command SHALL accept an optional `[directory]` positional argument. When provided, the command SHALL create the directory (with `recursive: true`) if it does not exist, then initialize the workspace inside that directory instead of the current working directory.

#### Scenario: Init in a new directory
- **WHEN** user runs `mrw init my-workspace --name my-project`
- **THEN** the directory `my-workspace/` is created under the current working directory, `workspace.yaml` is written inside `my-workspace/`, and `repos/` directory is created inside `my-workspace/`

#### Scenario: Init in an existing empty directory
- **WHEN** user runs `mrw init existing-dir --name my-project` and `existing-dir/` exists but contains no `workspace.yaml`
- **THEN** the workspace is initialized inside `existing-dir/` without error

#### Scenario: Init in a directory that already has a workspace
- **WHEN** user runs `mrw init my-dir` and `my-dir/workspace.yaml` already exists
- **THEN** the command SHALL display an error message indicating the workspace already exists and exit without modifying files

### Requirement: Directory argument resolves to absolute path
The directory argument SHALL be resolved to an absolute path using `path.resolve`. Relative paths SHALL be resolved relative to the current working directory.

#### Scenario: Relative directory path
- **WHEN** user runs `mrw init ./projects/my-workspace --name test`
- **THEN** the directory is resolved as `<cwd>/projects/my-workspace` and workspace files are created there

#### Scenario: Absolute directory path
- **WHEN** user runs `mrw init /tmp/my-workspace --name test`
- **THEN** the workspace is initialized at `/tmp/my-workspace/`

### Requirement: Directory argument works with --from-arch
The `[directory]` argument SHALL be compatible with `--from-arch` mode.

#### Scenario: Directory argument with --from-arch
- **WHEN** user runs `mrw init my-arch-workspace --from-arch https://example.com/arch.git --arch-branch main`
- **THEN** the directory `my-arch-workspace/` is created, the arch repo is cloned inside it, and `workspace.yaml` is written inside it

### Requirement: No directory argument uses current directory
When no `[directory]` argument is provided, `mrw init` SHALL operate in the current working directory.

#### Scenario: Init without directory argument
- **WHEN** user runs `mrw init --name my-project` in `/home/user/empty-dir/`
- **THEN** `workspace.yaml` and `repos/` are created in `/home/user/empty-dir/`
