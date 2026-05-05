## 1. Remove --from-template

- [x] 1.1 Remove `--from-template` option from `initCommand` in `src/commands/init.ts`
- [x] 1.2 Delete `initFromTemplate` function from `src/commands/init.ts`
- [x] 1.3 Remove the `fromTemplate` branch from the action handler

## 2. Update Commander Command Definition

- [x] 2.1 Add optional `[directory]` positional argument to `initCommand`
- [x] 2.2 Add `--name <string>` and `--description <string>` options to `initCommand`
- [x] 2.3 Update the action handler type signature to include new options and directory argument
- [x] 2.4 Remove the `domain` interactive prompt from `initInteractive`

## 3. Implement Directory Argument Logic

- [x] 3.1 Add directory resolution: if `[directory]` is provided, resolve to absolute path with `path.resolve`
- [x] 3.2 Create the target directory with `fs.mkdirSync(dir, { recursive: true })` if it doesn't exist
- [x] 3.3 Check for existing `workspace.yaml` in the target directory and error if found
- [x] 3.4 Use the resolved directory as `cwd` for the rest of init logic (repos/, workspace.yaml, .gitignore)
- [x] 3.5 Apply directory argument to `initFromArch` mode as well

## 4. Implement Non-Interactive CLI Options

- [x] 4.1 In `initInteractive`, check if `--name` is provided; if so, skip name prompt and use the option value
- [x] 4.2 For `--description`, use option value if provided; otherwise only prompt if interactive
- [x] 4.3 Add TTY detection: when `process.stdin.isTTY` is false, skip all prompts; error if `--name` is missing in plain init mode
- [x] 4.4 For `--from-arch` mode, derive workspace name from repo URL via `deriveRepoName()` when `--name` is not provided
- [x] 4.5 Remove all domain-related logic from init (no prompt, no option, no default)

## 5. Update Documentation

- [x] 5.1 Remove `--from-template` from command table in `docs/product-spec.md`
- [x] 5.2 Update `mrw init` description in `docs/product-spec.md` to reflect new CLI options and removed domain prompt

## 6. Tests

- [x] 6.1 Test `mrw init <dir> --name X` creates directory and workspace.yaml inside it
- [x] 6.2 Test `mrw init <existing-dir> --name X` works when directory exists but has no workspace
- [x] 6.3 Test `mrw init <dir>` errors when workspace.yaml already exists in target directory
- [x] 6.4 Test `mrw init --name X --description Y` creates workspace without prompts
- [x] 6.5 Test non-interactive mode (no TTY) errors without `--name` in plain init
- [x] 6.6 Test non-interactive mode succeeds with `--name` provided
- [x] 6.7 Test `--from-arch` derives name from repo URL when `--name` is omitted
- [x] 6.8 Test `mrw init` in interactive terminal prompts for name and description only (no domain)
- [x] 6.9 Test `--from-template` is rejected as unknown option

## 7. Lint & Cleanup

- [x] 7.1 Run `npm run lint` and fix any type errors
- [x] 7.2 Run `npx vitest run` and ensure all tests pass
- [x] 7.3 Verify no `console.log` in lib code
