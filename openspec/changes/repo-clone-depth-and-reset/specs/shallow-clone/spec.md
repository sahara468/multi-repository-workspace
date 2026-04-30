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

#### Scenario: No --depth flag
- **WHEN** user runs `mrw sync` without `--depth`
- **THEN** the repository is cloned with full history (current default behavior)

#### Scenario: --depth with specific service
- **WHEN** user runs `mrw sync api-gateway --depth 1`
- **THEN** only the specified service is cloned with `--depth 1`
