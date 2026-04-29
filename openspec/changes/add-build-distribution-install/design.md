## Context

MRW is a TypeScript/Node.js CLI tool (`mrw` command) built with ESM-only architecture. The current project has:
- `package.json` with `bin.mrw` pointing to `./dist/cli.js` and basic `build`/`dev`/`lint`/`test` scripts
- `build.ts` using esbuild to bundle `src/cli.ts` → `dist/cli.js` with a shebang and externalized deps
- No `files` field (entire project directory would be published, including `src/`, tests, openspec, etc.)
- No `prepublishOnly` or `prepare` lifecycle hooks
- No README.md at project root
- No `.npmrc` for package manager configuration

The tool cannot be reliably installed or used outside of direct source checkout.

## Goals / Non-Goals

**Goals:**
- Enable `npm install -g mrw` and `npx mrw` once published to npm
- Enable `npm link` for local development workflow
- Enable `npm install -g <git-url>` for git-based installation
- Ensure only necessary files are included in the published package
- Provide clear installation and usage documentation in README.md
- Add safety guards to prevent broken publishes

**Non-Goals:**
- Setting up CI/CD publishing automation (separate change)
- Homebrew formula or other non-npm distribution channels
- Version management or release tooling (e.g., semantic-release)
- Binary distribution via pkg/nexe

## Decisions

### 1. Use `files` field instead of `.npmignore`

**Choice:** `files` whitelist in `package.json`
**Rationale:** Whitelist approach is safer — only explicitly listed directories are included. `.npmignore` is a blacklist that can accidentally publish sensitive files. The `files` array is also self-documenting.
**Alternative considered:** `.npmignore` — rejected because it's fragile and easy to miss new directories.

### 2. `prepublishOnly` for build + lint + test

**Choice:** `"prepublishOnly": "npm run lint && npm test && npm run build"`
**Rationale:** Ensures that only verified code gets published. Running lint + test + build in sequence catches type errors, failing tests, and ensures dist/ is fresh.
**Alternative considered:** `prepack` — rejected because `prepublishOnly` runs only on `npm publish`, while `prepack` also runs on `npm pack` and `npm install -g .` which could be slow during local dev.

### 3. `prepare` script for git installs

**Choice:** `"prepare": "npm run build"`
**Rationale:** `prepare` runs after `npm install` when installing from git URL, ensuring the dist/ bundle exists. It also runs on `npm link`, making local dev linking work.
**Alternative considered:** `postinstall` — rejected because `postinstall` runs on every `npm install` (including as a dependency), which is unnecessary overhead. `prepare` is the standard for CLI tools installed from git.

### 4. README structure

**Choice:** Standard CLI README with: project description, features, installation (npm, npx, local dev), quick start, available commands, development, license
**Rationale:** Follows common patterns for Node.js CLI tools. Installation section is the most critical — users need to know all ways to install.

### 5. `.npmrc` with `engine-strict`

**Choice:** `.npmrc` with `engine-strict=true`
**Rationale:** MRW targets Node 20+ and uses ESM. Enforcing engine checks prevents installation on incompatible Node versions.
**Alternative considered:** No `.npmrc` — rejected because users on older Node would get confusing runtime errors instead of clear install-time errors.

## Risks / Trade-offs

- **`prepare` runs on `npm link`**: The build step adds ~2s to `npm link`. Acceptable trade-off since it ensures dist/ is always fresh.
- **`prepublishOnly` adds latency to publish**: Running lint + test + build takes ~10-20s. This is a worthwhile safety guard.
- **No CI/CD publishing yet**: Without automated publishing, a developer must manually run `npm publish`. Risk is mitigated by `prepublishOnly` checks, but CI/CD should be added in a future change.
