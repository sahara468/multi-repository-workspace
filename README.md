# MRW — Multi-Repository Workspace

A CLI tool for managing multiple microservice repositories as a unified business workspace.

**License:** MIT | **Node.js:** >= 20.0.0

## Installation

### Install from GitHub Release (recommended)

Each release publishes a standalone `.tgz` package — no npm registry needed.

```bash
# Replace <version> with the latest release version (e.g., 0.1.0)
npm install -g https://github.com/sahara468/multi-repository-workspace/releases/download/v<version>/mrw-<version>.tgz
```

Check the [Releases page](https://github.com/sahara468/multi-repository-workspace/releases) for available versions.

### Global install (npm)

```bash
npm install -g mrw
```

### Run without installing (npx)

```bash
npx mrw <command>
```

### Install from git

```bash
npm install -g github:sahara468/multi-repository-workspace
```

### Local development

```bash
git clone https://github.com/sahara468/multi-repository-workspace.git
cd multi-repository-workspace
npm install
npm run build
npm link
```

After `npm link`, the `mrw` command is available globally.

## Usage

After installation, the `mrw` command is available:

```bash
mrw --help           # Show all commands
mrw init             # Initialize a workspace
mrw sync             # Clone/pull all services
mrw sync --depth 1   # Shallow clone (only latest commit)
mrw reset --force    # Reset services to default branch and clean state
```

## Quick Start

```bash
# 1. Create a services.yaml with your microservice definitions
cat > services.yaml << 'EOF'
services:
  order-service:
    repo: https://github.com/org/order-service.git
    branch: main
    language: java
    description: Order core service
  inventory-service:
    repo: https://github.com/org/inventory-service.git
    branch: main
    language: go
    description: Inventory management
EOF

# 2. Initialize a workspace (automatically imports from services.yaml)
mrw init

# 3. Clone all service repositories
mrw sync

# 4. Check workspace status
mrw status
```

## Commands

### `mrw init`

Initialize a new workspace in the current directory.

```bash
mrw init                          # Interactive, imports from services.yaml if present
mrw init --services-file path.yaml  # Import from a specific file
mrw init --from-template microservice-java  # Use a built-in template
```

Creates:
- `workspace.yaml` — workspace definition (tracked in Git)
- `specs/` — workspace-level specifications (tracked in Git)
- `.mrw/state/repos/` — cloned service repos (not tracked)
- `.mrw/state/index/` — index caches (not tracked)
- `.mrw/changes/` — cross-service changes (tracked in Git)

### `mrw service`

Manage service registrations after initialization.

```bash
mrw service add <name> --repo <url> --branch <name>  # Add a service
mrw service remove <name>                            # Remove a service
mrw service update <name> --branch develop            # Update fields
mrw service import                                   # Import from services.yaml
mrw service import --file path.yaml                   # Import from specific file
```

### `mrw sync`

Clone or pull service repositories.

```bash
mrw sync              # Sync all services
mrw sync <name>       # Sync a single service
```

### `mrw status`

Display workspace status: services, branches, uncommitted changes.

```bash
mrw status
```

### `mrw branch`

Create branches across service repositories.

```bash
mrw branch create <name>              # Create branch in all cloned services
mrw branch create <name> --services svc1,svc2  # Specific services only
```

### `mrw checkout`

Switch branches across service repositories.

```bash
mrw checkout <name>                   # Checkout branch in all cloned services
mrw checkout <name> --services svc1   # Specific services only
```

### `mrw spec`

Manage workspace-level specifications.

```bash
mrw spec list                                    # List all specs
mrw spec show <name>                             # Show a spec
mrw spec create <name> --type capability          # Create capability spec
mrw spec create <name> --type entry --involves svc1,svc2
```

Spec types: `capability`, `entry`, `constraint`

### `mrw change`

Manage cross-service changes (OpenSpec-based).

```bash
mrw change propose <name>   # Create a change proposal
mrw change design <name>    # Create a design document
mrw change tasks <name>     # Create task decomposition
mrw change list             # List active changes
```

### `mrw index`

Manage workspace index caches.

```bash
mrw index show topology       # Show topology cache
mrw index show dependencies   # Show dependencies cache
mrw index clear               # Clear all caches
```

## workspace.yaml Format

```yaml
version: 1
workspace:
  name: order-fulfillment
  description: Order fulfillment business workspace
  domain: orders
services:
  order-service:
    repo: https://github.com/org/order-service.git
    branch: main
    language: java
    description: Order core service
  inventory-service:
    repo: https://github.com/org/inventory-service.git
    branch: main
    language: go
```

Required fields: `workspace.name`, service `repo` and `branch`.
Optional fields: `workspace.description`, `workspace.domain`, service `language` and `description`.

## services.yaml Format

Used by `mrw init` and `mrw service import`. Same format as the `services` section in workspace.yaml:

```yaml
services:
  order-service:
    repo: https://github.com/org/order-service.git
    branch: main
    language: java
```

## Development

```bash
npm run dev -- <args>        # Run CLI in dev mode
npm run build                # Build with esbuild
npm run lint                 # Type check (tsc --noEmit)
npm test                     # Run tests
npm run test:coverage        # Run tests with coverage
```

## License

MIT
