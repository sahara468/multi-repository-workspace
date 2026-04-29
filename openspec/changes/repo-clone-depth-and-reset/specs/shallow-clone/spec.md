## ADDED Requirements

### Requirement: Clone depth via CLI flag
The `mrw sync` command SHALL accept an optional `--depth <n>` flag that applies shallow clone depth when cloning repositories. The value MUST be a positive integer.

#### Scenario: Clone with --depth flag
- **WHEN** user runs `mrw sync --depth 1`
- **THEN** all newly cloned repositories are cloned with `--depth 1`, downloading only the latest commit

#### Scenario: Invalid depth value
- **WHEN** user runs `mrw sync --depth 0` or `mrw sync --depth -1`
- **THEN** the command SHALL exit with an error message indicating depth must be a positive integer

#### Scenario: --depth with existing repositories
- **WHEN** user runs `mrw sync --depth 5` and a repository already exists locally
- **THEN** the existing repository is updated via `git pull` as normal (depth only affects clone operations)

### Requirement: Per-service clone depth configuration
The `ServiceConfig` type SHALL include an optional `cloneDepth` field of type `number`. When present and no `--depth` CLI flag is provided, the service's `cloneDepth` value SHALL be used as the shallow clone depth.

#### Scenario: Service with cloneDepth configured
- **WHEN** `workspace.yaml` defines a service with `cloneDepth: 10` and user runs `mrw sync` without `--depth`
- **THEN** that service is cloned with `--depth 10`

#### Scenario: CLI flag overrides service config
- **WHEN** `workspace.yaml` defines a service with `cloneDepth: 10` and user runs `mrw sync --depth 1`
- **THEN** that service is cloned with `--depth 1` (CLI flag takes precedence)

#### Scenario: No depth configured anywhere
- **WHEN** a service has no `cloneDepth` and user runs `mrw sync` without `--depth`
- **THEN** the repository is cloned with full history (current default behavior)

### Requirement: cloneDepth field validation
When `cloneDepth` is present in a service configuration, it MUST be a positive integer. If validation fails, the `loadWorkspace` function SHALL throw a descriptive error.

#### Scenario: Invalid cloneDepth value
- **WHEN** `workspace.yaml` contains a service with `cloneDepth: -5`
- **THEN** `loadWorkspace` throws an error: `Service "<name>" has invalid cloneDepth: must be a positive integer`
