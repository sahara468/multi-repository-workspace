## Context

`mrw init` currently has two modes: plain (`mrw init` with interactive prompts) and design-driven (`mrw init --from-arch`). There's also a `--from-template` mode that uses hardcoded demo data — this adds code complexity with no practical value.

The init flow forces users to:
1. `mkdir my-workspace && cd my-workspace`
2. `mrw init`
3. Answer 3 interactive prompts (name, description, domain)

This is awkward compared to standard CLI conventions and makes the command impossible to script.

## Goals / Non-Goals

**Goals:**
- `mrw init <dir>` creates the directory and inits inside it
- `--name` and `--description` CLI options replace interactive prompts
- Remove `--from-template` (hardcoded demo, no real value)
- Remove `domain` from init flow (rarely used, adds noise)
- Fully scriptable when options are provided

**Non-Goals:**
- Changing the `workspace.yaml` schema or `WorkspaceConfig` type
- Adding config file support (e.g., `.mrwrc`)
- Changing other commands (sync, service, etc.)

## Decisions

### 1. Directory argument as optional positional parameter

Use Commander's `[directory]` optional argument. When provided:
- Resolve to absolute path via `path.resolve`
- Create the directory with `fs.mkdirSync(dir, { recursive: true })`
- Use that directory as `cwd` for the rest of init
- Error if the directory already contains a `workspace.yaml`

**Alternative**: `--dir` flag. Rejected — positional arg is the convention for init commands (`git init <dir>`, `cargo new <dir>`).

### 2. CLI options: --name and --description only

Add `--name <string>` and `--description <string>` as Commander options:
- `--name` is required in non-interactive mode; in interactive mode, prompt if missing
- `--description` is optional; in interactive mode, prompt if not provided via CLI
- No `--domain` option — domain is rarely needed during init and can be added to `workspace.yaml` manually later

### 3. Remove --from-template

Delete `--from-template` option and `initFromTemplate` function. The two hardcoded templates (`microservice-java`, `microservice-go`) point at `github.com/example` URLs — they're demo stubs, not real functionality. Users can achieve the same result with `mrw init` + `mrw service add`.

### 4. Remove domain from init prompts

The `domain` field in `WorkspaceConfig` is rarely set during init. Remove the domain prompt entirely. The field remains in the type definition for manual editing in `workspace.yaml`.

### 5. TTY detection for interactive fallback

Use `process.stdin.isTTY`:
- `true`: interactive terminal — prompt for missing fields (name, description only)
- `false`: non-interactive — error if `--name` is missing; `--description` defaults to undefined

This matches standard CLI patterns (`npm init`, `create-react-app`).

### 6. Two init modes after cleanup

After removing `--from-template`, there are two modes:
- **Plain**: `mrw init [dir] --name X --description Y`
- **Design-driven**: `mrw init [dir] --from-arch <url> --arch-branch main`

For `--from-arch`, workspace name defaults to the derived repo name (via `deriveRepoName`) if `--name` is not provided. This makes arch mode fully non-interactive by default.

## Risks / Trade-offs

- **[Risk] Existing directory with files**: Only error if `workspace.yaml` exists; otherwise proceed (matches `git init` behavior) → Mitigation: clear error message.
- **[Risk] Breaking — --from-template removed**: No real impact — templates were hardcoded demo stubs → Mitigation: users can use `mrw service add` to build equivalent workspaces.
- **[Risk] Breaking — domain prompt removed**: Users who relied on the domain prompt → Mitigation: domain can be manually added to `workspace.yaml`.
