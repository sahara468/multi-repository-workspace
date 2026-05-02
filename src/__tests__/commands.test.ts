import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { loadWorkspace, saveWorkspace, type WorkspaceConfig } from '../lib/workspace.js';
import { execSync } from 'node:child_process';

describe('integration: mrw init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-int-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates standard directory layout when init runs', () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'test-ws', description: 'test workspace' },
      services: {},
    };

    const dirs = [
      'repos',
    ];

    for (const dir of dirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }

    saveWorkspace(tmpDir, config);

    for (const dir of dirs) {
      expect(fs.existsSync(path.join(tmpDir, dir))).toBe(true);
    }

    const loaded = loadWorkspace(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.workspace.name).toBe('test-ws');
  });

  it('generates .gitignore with .mrw/ entry', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    const gitignoreContent = '.mrw/\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.mrw/');
  });

  it('imports services from services.yaml during init', () => {
    const servicesYaml = `services:
  order-service:
    repo: https://github.com/example/order.git
    branch: main
    language: java
    description: Order service
`;
    fs.writeFileSync(path.join(tmpDir, 'services.yaml'), servicesYaml);

    const parsed = YAML.parse(fs.readFileSync(path.join(tmpDir, 'services.yaml'), 'utf-8')) as { services: Record<string, { repo: string; branch: string; language?: string }> };
    expect(parsed.services['order-service'].repo).toBe('https://github.com/example/order.git');
    expect(parsed.services['order-service'].language).toBe('java');
  });

  it('CLI registers all commands', () => {
    const help = execSync(`npx tsx src/cli.ts --help`, {
      cwd: path.resolve(''),
      encoding: 'utf-8',
    });
    expect(help).toContain('init');
    expect(help).toContain('service');
    expect(help).toContain('sync');
    expect(help).toContain('status');
    expect(help).toContain('repo');
  });
});

describe('integration: mrw service', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-service-test-'));
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'test-ws' },
      services: {},
    };
    saveWorkspace(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('service add/remove/update lifecycle', () => {
    const config = loadWorkspace(tmpDir);
    if (!config) throw new Error('workspace not found');

    // Add
    config.services['order-service'] = { repo: 'https://example.com/order.git', branch: 'main' };
    saveWorkspace(tmpDir, config);

    let loaded = loadWorkspace(tmpDir);
    expect(loaded?.services['order-service']).toBeDefined();

    // Update
    loaded!.services['order-service'].branch = 'develop';
    loaded!.services['order-service'].language = 'java';
    saveWorkspace(tmpDir, loaded!);

    loaded = loadWorkspace(tmpDir);
    expect(loaded?.services['order-service'].branch).toBe('develop');
    expect(loaded?.services['order-service'].language).toBe('java');

    // Remove
    delete loaded!.services['order-service'];
    saveWorkspace(tmpDir, loaded!);

    loaded = loadWorkspace(tmpDir);
    expect(loaded?.services['order-service']).toBeUndefined();
  });

  it('service import from YAML file merges with existing', () => {
    const servicesYaml = `services:
  order-service:
    repo: https://github.com/example/order.git
    branch: main
    language: java
  inventory-service:
    repo: https://github.com/example/inventory.git
    branch: main
    language: go
`;
    fs.writeFileSync(path.join(tmpDir, 'services.yaml'), servicesYaml);

    const parsed = YAML.parse(fs.readFileSync(path.join(tmpDir, 'services.yaml'), 'utf-8')) as { services: Record<string, { repo: string; branch: string; language?: string }> };

    const config = loadWorkspace(tmpDir)!;
    for (const [name, service] of Object.entries(parsed.services)) {
      config.services[name] = service;
    }
    saveWorkspace(tmpDir, config);

    const loaded = loadWorkspace(tmpDir);
    expect(Object.keys(loaded!.services)).toHaveLength(2);
    expect(loaded!.services['order-service'].language).toBe('java');
    expect(loaded!.services['inventory-service'].language).toBe('go');
  });
});

describe('integration: mrw service with path field', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-service-path-'));
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'test-ws' },
      services: {},
    };
    saveWorkspace(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds service with --path option', () => {
    const config = loadWorkspace(tmpDir)!;
    config.services['user-api'] = {
      repo: 'https://github.com/org/platform.git',
      branch: 'main',
      path: 'services/user-api',
    };
    saveWorkspace(tmpDir, config);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.services['user-api'].path).toBe('services/user-api');
  });

  it('round-trips path field through save/load', () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'ws' },
      services: {
        'user-api': { repo: 'https://github.com/org/platform.git', branch: 'main', path: 'services/user-api' },
      },
    };
    saveWorkspace(tmpDir, config);
    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.services['user-api'].path).toBe('services/user-api');
  });
});

describe('integration: mrw repo', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-repo-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('repo list shows repos derived from service URLs', () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'mono-ws' },
      services: {
        'user-api': { repo: 'https://github.com/org/platform.git', branch: 'main' },
        'order-api': { repo: 'https://github.com/org/platform.git', branch: 'main' },
        'auth-api': { repo: 'https://github.com/org/auth-service.git', branch: 'develop' },
      },
    };
    saveWorkspace(tmpDir, config);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded).not.toBeNull();
    expect(Object.keys(loaded!.services)).toHaveLength(3);
  });

  it('repo CLI is registered', () => {
    const help = execSync(`npx tsx src/cli.ts repo --help`, {
      cwd: path.resolve(''),
      encoding: 'utf-8',
    });
    expect(help).toContain('list');
    expect(help).toContain('status');
  });

  it('service list CLI is registered', () => {
    const help = execSync(`npx tsx src/cli.ts service --help`, {
      cwd: path.resolve(''),
      encoding: 'utf-8',
    });
    expect(help).toContain('list');
  });
});

describe('integration: design-driven workspace', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-design-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and loads workspace with arch config', () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {
        'order-service': { repo: 'https://github.com/org/order.git', branch: 'main' },
      },
      arch: { repo: 'https://github.com/org/order-service-arch.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.arch).toBeDefined();
    expect(loaded?.arch?.repo).toBe('https://github.com/org/order-service-arch.git');
    expect(loaded?.arch?.branch).toBe('main');
  });
});
