## ADDED Requirements

### Requirement: Package files whitelist

The `package.json` SHALL include a `files` field that whitelists only the directories and files needed for the published package: `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md` (if present).

#### Scenario: npm pack includes only whitelisted files

- **WHEN** `npm pack` is run
- **THEN** the resulting tarball contains only files from `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md`

#### Scenario: Source files are excluded from published package

- **WHEN** the package is published to npm
- **THEN** `src/`, `openspec/`, `__tests__/`, `.claude/`, and development config files are NOT included in the package

### Requirement: Pre-publish safety checks

The `package.json` SHALL include a `prepublishOnly` script that runs lint, test, and build in sequence before publishing.

#### Scenario: Publish blocked on failing tests

- **WHEN** `npm publish` is run and tests are failing
- **THEN** the publish is aborted before reaching the registry

#### Scenario: Publish blocked on type errors

- **WHEN** `npm publish` is run and TypeScript type checking fails
- **THEN** the publish is aborted before reaching the registry

#### Scenario: Successful publish after all checks pass

- **WHEN** `npm publish` is run and lint, tests, and build all pass
- **THEN** the dist/ bundle is freshly built and the package is published

### Requirement: Git-based installation build

The `package.json` SHALL include a `prepare` script that runs the build step, ensuring the CLI works when installed from a git URL or via `npm link`.

#### Scenario: Install from git URL

- **WHEN** a user runs `npm install -g <git-url>`
- **THEN** the `prepare` script builds `dist/cli.js` and the `mrw` command is available

#### Scenario: npm link for local development

- **WHEN** a developer runs `npm link` in the project directory
- **THEN** the `prepare` script builds `dist/cli.js` and the `mrw` command is globally available

### Requirement: Node.js engine constraints

The `package.json` SHALL include an `engines` field declaring the minimum Node.js version as `>=20.0.0`.

#### Scenario: Install on compatible Node version

- **WHEN** a user with Node.js 20+ runs `npm install -g mrw`
- **THEN** installation completes successfully

#### Scenario: Install on incompatible Node version

- **WHEN** a user with Node.js <20 runs `npm install -g mrw` with `engine-strict` enabled
- **THEN** npm refuses to install and shows an engine mismatch error

### Requirement: npm configuration file

The project SHALL include a `.npmrc` file with `engine-strict=true` to enforce Node.js version checks at install time.

#### Scenario: Engine strict enforcement

- **WHEN** a user installs the package on an incompatible Node.js version
- **THEN** the installation fails with a clear engine compatibility error
