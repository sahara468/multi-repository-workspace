## 1. Shallow Clone — sync command

- [x] 1.1 Add `--depth <n>` option to `syncCommand` in `src/commands/sync.ts` (type: number, validate as positive integer)
- [x] 1.2 When cloning, append `--depth <n>` to the clone args array if `--depth` is provided
- [x] 1.3 Update clone result message to indicate shallow clone when depth is applied (e.g., "cloned (main, depth 1)")

## 2. Reset Command — new file

- [x] 2.1 Create `src/commands/reset.ts` with `resetCommand` Commander instance
- [x] 2.2 Add `--service <name>` option to target a single service (default: all services)
- [x] 2.3 Add `--force` flag to skip confirmation prompt
- [x] 2.4 Implement confirmation prompt using `inquirer`: list affected services and warn about discarding changes
- [x] 2.5 Implement reset logic per service: `git checkout <branch>`, `git clean -fd`, `git reset --hard origin/<branch>`
- [x] 2.6 Handle missing repository directory gracefully: report as "skipped (not cloned)"
- [x] 2.7 Implement summary output matching `mrw sync` icon/color pattern (✓ reset, ! skipped, ✗ failed)

## 3. CLI Registration

- [x] 3.1 Import and register `resetCommand` in `src/cli.ts`

## 4. Tests

- [x] 4.1 Test `syncCommand` with `--depth` flag (shallow clone args are passed to simple-git)
- [x] 4.2 Test `--depth` validation (rejects zero, negative, non-integer)
- [x] 4.3 Test `--depth` does not affect existing repositories (pull is unchanged)
- [x] 4.4 Test `resetCommand` confirmation prompt (confirms and cancels)
- [x] 4.5 Test `resetCommand --force` skips prompt
- [x] 4.6 Test `resetCommand --service <name>` targets single service
- [x] 4.7 Test reset handles missing repo directory (skipped)
- [x] 4.8 Test reset summary output format
