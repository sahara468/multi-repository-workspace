## 1. Remove Command Files

- [x] 1.1 Delete `src/commands/spec.ts`
- [x] 1.2 Delete `src/commands/change.ts`
- [x] 1.3 Delete `src/commands/index.ts`

## 2. Remove Supporting Library Code

- [x] 2.1 Delete `src/lib/cache.ts`

## 3. Update CLI Registration

- [x] 3.1 Remove spec, change, index imports from `src/cli.ts`
- [x] 3.2 Remove `program.addCommand()` calls for spec, change, index from `src/cli.ts`

## 4. Update Init Command

- [x] 4.1 Remove `.mrw/changes/` directory creation from `src/commands/init.ts`
- [x] 4.2 Remove `.mrw/state/index/` directory creation from `src/commands/init.ts`
- [x] 4.3 Remove `specs/` directory structure creation from `src/commands/init.ts`

## 5. Update Tests

- [x] 5.1 Remove spec command tests from `src/__tests__/commands.test.ts`
- [x] 5.2 Remove change command tests from `src/__tests__/commands.test.ts`
- [x] 5.3 Update command registration assertion to exclude spec, change, index
- [x] 5.4 Remove index-related test imports and setup if present

## 6. Verify

- [x] 6.1 Run `npm run lint` and fix any type errors
- [x] 6.2 Run `npx vitest run` and ensure all tests pass
- [x] 6.3 Run `npm run dev -- --help` and verify spec, change, index are absent
