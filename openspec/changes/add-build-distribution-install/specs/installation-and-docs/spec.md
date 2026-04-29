## ADDED Requirements

### Requirement: README with installation section

The project root SHALL include a `README.md` file with an installation section documenting all supported installation methods: npm global install, npx one-off usage, and local development setup via `npm link`.

#### Scenario: User finds npm install instructions

- **WHEN** a user views the README
- **THEN** they see instructions for `npm install -g mrw` to install globally

#### Scenario: User finds npx usage instructions

- **WHEN** a user views the README
- **THEN** they see instructions for `npx mrw <command>` to run without installing

#### Scenario: User finds local development setup instructions

- **WHEN** a developer views the README
- **THEN** they see instructions for cloning the repo, `npm install`, `npm run build`, and `npm link` to set up local development

### Requirement: README with usage section

The `README.md` SHALL include a usage section showing common commands with examples.

#### Scenario: User discovers available commands

- **WHEN** a user views the README usage section
- **THEN** they see examples for `mrw init`, `mrw sync`, `mrw status`, `mrw branch`, `mrw checkout`, `mrw spec`, `mrw change`, `mrw service`, and `mrw index`

#### Scenario: User finds help flag reference

- **WHEN** a user views the README
- **THEN** they see a reference to `mrw --help` and `mrw <command> --help` for discovering all options

### Requirement: README with development section

The `README.md` SHALL include a development section with commands for building, testing, linting, and contributing.

#### Scenario: Developer finds build and test commands

- **WHEN** a developer views the README development section
- **THEN** they see `npm run build`, `npm run dev`, `npm run lint`, `npm test`, and `npm run test:coverage`

### Requirement: README with project metadata

The `README.md` SHALL include the project name, description, license (MIT), and Node.js version requirement at the top.

#### Scenario: User identifies project purpose

- **WHEN** a user views the top of the README
- **THEN** they see the project name "MRW", a description of what it does, and the MIT license
