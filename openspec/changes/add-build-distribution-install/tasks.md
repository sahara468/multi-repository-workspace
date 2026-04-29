## 1. Package Configuration

- [x] 1.1 Add `files` field to `package.json` whitelisting `dist/`, `README.md`, and `LICENSE`
- [x] 1.2 Add `engines` field to `package.json` with `node >= 20.0.0`
- [x] 1.3 Add `prepublishOnly` script to `package.json`: `npm run lint && npm test && npm run build`
- [x] 1.4 Add `prepare` script to `package.json`: `npm run build`
- [x] 1.5 Create `.npmrc` with `engine-strict=true`

## 2. README Documentation

- [x] 2.1 Create `README.md` with project title, description, and license at the top
- [x] 2.2 Add installation section covering: `npm install -g mrw`, `npx mrw`, and `npm link` for local dev
- [x] 2.3 Add usage section with examples for all CLI commands
- [x] 2.4 Add development section with build, test, lint, and coverage commands

## 3. Verification

- [x] 3.1 Run `npm run build` and verify `dist/cli.js` is generated with shebang
- [x] 3.2 Run `npm run lint && npm test` to confirm no regressions
- [x] 3.3 Run `npm pack --dry-run` and verify only whitelisted files are included
- [x] 3.4 Run `npm link` and verify `mrw --help` works globally
