## ADDED Requirements

### Requirement: Reset command restores services to initial state
The `mrw reset` command SHALL revert all services to their configured default branch and a clean working tree matching the state after a fresh `mrw init` + `mrw sync`.

#### Scenario: Reset all services
- **WHEN** user runs `mrw reset` and confirms the prompt
- **THEN** each service is checked out to its configured branch, untracked files are removed, and the working tree is reset to match `origin/<branch>`

#### Scenario: Reset a single service
- **WHEN** user runs `mrw reset --service api-gateway` and confirms the prompt
- **THEN** only the specified service is reset; other services are left unchanged

#### Scenario: Service not found
- **WHEN** user runs `mrw reset --service nonexistent`
- **THEN** the command SHALL exit with an error: `Service "nonexistent" not found in workspace.yaml`

### Requirement: Reset confirmation prompt
The `mrw reset` command SHALL prompt the user for confirmation before executing destructive operations, listing the services that will be reset. The prompt MUST warn that uncommitted changes and untracked files will be discarded.

#### Scenario: User confirms reset
- **WHEN** user runs `mrw reset` and selects "Yes" at the confirmation prompt
- **THEN** the reset proceeds on all targeted services

#### Scenario: User declines reset
- **WHEN** user runs `mrw reset` and selects "No" at the confirmation prompt
- **THEN** the command exits without making any changes

### Requirement: Reset with --force flag
The `mrw reset` command SHALL accept a `--force` flag that skips the confirmation prompt.

#### Scenario: Force reset without prompt
- **WHEN** user runs `mrw reset --force`
- **THEN** the reset proceeds immediately without prompting for confirmation

### Requirement: Reset handles missing repositories gracefully
If a service's local repository directory does not exist, `mrw reset` SHALL report it as skipped rather than failing.

#### Scenario: Service directory missing
- **WHEN** user runs `mrw reset` and a service's repository directory does not exist
- **THEN** that service is reported as "skipped (not cloned)" and other services are still processed

### Requirement: Reset summary output
After completing, `mrw reset` SHALL display a summary table showing each service's result: `reset`, `skipped`, or `failed`, along with the branch reset to.

#### Scenario: Mixed results summary
- **WHEN** reset completes with some services reset, one skipped, and one failed
- **THEN** the summary lists each service with its status and branch, using the same icon/color pattern as `mrw sync`
