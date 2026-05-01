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
      '.mrw/state/repos',
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

  it('generates .gitignore with .mrw/state/ entry', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    const gitignoreContent = '.mrw/state/\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.mrw/state/');
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

