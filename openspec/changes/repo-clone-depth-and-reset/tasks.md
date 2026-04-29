## 1. Data Model — cloneDepth field

- [ ] 1.1 Add `cloneDepth?: number` to `ServiceConfig` interface in `src/lib/workspace.ts`
- [ ] 1.2 Add validation in `loadWorkspace`: if `cloneDepth` is present, it must be a positive integer; throw descriptive error otherwise
- [ ] 1.3 Add validation in `loadServiceFile`: same `cloneDepth` validation for imported services
- [ ] 1.4 Update `addService` and `updateService` to accept and pass through `cloneDepth`

## 2. Shallow Clone — sync command

- [ ] 2.1 Add `--depth <n>` option to `syncCommand` in `src/commands/sync.ts` (type: number, validate as positive integer)
- [ ] 2.2 Implement depth precedence: CLI `--depth` > service `cloneDepth` > no depth (full clone)
- [ ] 2.3 When cloning, append `--depth <n>` to the clone args array if a depth value is resolved
- [ ] 2.4 Update clone result message to indicate shallow clone when depth is applied (e.g., "cloned (main, depth 1)")

## 3. Reset Command — new file

- [ ] 3.1 Create `src/commands/reset.ts` with `resetCommand` Commander instance
- [ ] 3.2 Add `--service <name>` option to target a single service (default: all services)
- [ ] 3.3 Add `--force` flag to skip confirmation prompt
- [ ] 3.4 Implement confirmation prompt using `inquirer`: list affected services and warn about discarding changes
- [ ] 3.5 Implement reset logic per service: `git checkout <branch>`, `git clean -fd`, `git reset --hard origin/<branch>`
- [ ] 3.6 Handle missing repository directory gracefully: report as "skipped (not cloned)"
- [ ] 3.7 Implement summary output matching `mrw sync` icon/color pattern (✓ reset, ! skipped, ✗ failed)

## 4. CLI Registration

- [ ] 4.1 Import and register `resetCommand` in `src/cli.ts`

## 5. Tests

- [ ] 5.1 Test `loadWorkspace` validates `cloneDepth` (positive integer, rejects zero/negative/non-integer)
- [ ] 5.2 Test `syncCommand` with `--depth` flag (shallow clone args are passed to simple-git)
- [ ] 5.3 Test depth precedence (CLI > config > none)
- [ ] 5.4 Test `resetCommand` confirmation prompt (confirms and cancels)
- [ ] 5.5 Test `resetCommand --force` skips prompt
- [ ] 5.6 Test `resetCommand --service <name>` targets single service
- [ ] 5.7 Test reset handles missing repo directory (skipped)
- [ ] 5.8 Test reset summary output format
