## Why

MRW CLI currently has a `package.json` with `bin` field and an esbuild build script, but lacks the complete build/distribution/installation pipeline needed for users to actually install and use the tool. There is no `files` field to control what gets published, no `prepublishOnly` lifecycle hook, no README with installation instructions, and no documented way for users to install the CLI (via npm, npx, or local dev link). This blocks anyone outside the development team from using the tool.

## What Changes

- Add `files` field to `package.json` to whitelist published package contents
- Add `prepublishOnly` script to ensure build + lint + test pass before publishing
- Add `prepare` script for post-install build (when installed from git)
- Add `engines` field to declare Node.js version requirements
- Add `.npmrc` to enforce consistent package manager behavior
- Create a comprehensive `README.md` with installation, usage, and development sections
- Ensure `npm link` / `npm install -g` works correctly for local development

## Capabilities

### New Capabilities
- `build-and-distribution`: Build pipeline, npm publishing configuration, and package distribution setup
- `installation-and-docs`: Installation methods (npm, npx, local dev) and README documentation

### Modified Capabilities

_(none — no existing specs to modify)_

## Impact

- **package.json**: Add `files`, `engines`, `scripts.prepublishOnly`, `scripts.prepare`
- **New file**: `README.md` at project root
- **New file**: `.npmrc` for package manager configuration
- **build.ts**: No changes expected — current esbuild setup is sufficient
- **Users**: Can now `npm install -g mrw` or `npx mrw` once published, or use `npm link` for local dev
