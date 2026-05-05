## Why

`mrw init` has two UX problems:

1. **Multi-step setup**: Users must manually `mkdir my-workspace && cd my-workspace` before running `mrw init`. Most init-style CLIs (`git init`, `cargo new`) accept a directory argument directly.
2. **Mandatory interactive prompts**: The workspace name, description, and domain are always asked interactively, making the command non-scriptable for CI/CD or onboarding automation.

Additionally, `--from-template` is a hardcoded demo feature with no real value — it creates workspaces from two fake templates (`microservice-java`, `microservice-go`) pointing at `github.com/example` URLs. It should be removed entirely.

## What Changes

- Add an optional `[directory]` argument to `mrw init` that creates the directory and initializes the workspace inside it
- Add `--name` and `--description` CLI options to replace interactive prompts
- Remove the `domain` field from init prompts (domain remains in `WorkspaceConfig` type but is not set during init)
- Remove `--from-template` option and `initFromTemplate` function entirely
- When all required fields are provided via CLI options, skip interactive prompts (non-interactive mode)
- When required fields are missing and stdin is a TTY, fall back to interactive prompts
- When stdin is not a TTY (piped/CI), error with a clear message instead of hanging

## Capabilities

### New Capabilities
- `init-directory-arg`: Support an optional directory argument on `mrw init` that auto-creates the target directory and initializes the workspace inside it
- `init-cli-options`: Support `--name`, `--description` CLI options for non-interactive workspace initialization

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Code**: `src/commands/init.ts` — add `[directory]` arg, `--name`/`--description` options, TTY detection; remove `--from-template`, `initFromTemplate`, domain prompt
- **Code**: `src/lib/workspace.ts` — no change (types unchanged)
- **Docs**: `docs/product-spec.md` — remove `--from-template` from command table, remove `domain` from init description
- **Tests**: `src/__tests__/design-driven.test.ts` — update if any test references template
- **Breaking**: `--from-template` removed; domain prompt removed from init
