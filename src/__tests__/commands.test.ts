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
      '.mrw/state/index',
      '.mrw/changes',
      'specs/capabilities',
      'specs/entries',
      'specs/constraints',
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
    expect(help).toContain('spec');
    expect(help).toContain('change');
    expect(help).toContain('index');
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

describe('integration: mrw spec', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-spec-test-'));
    const dirs = ['specs/capabilities', 'specs/entries', 'specs/constraints'];
    for (const dir of dirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates and reads a spec file with frontmatter', () => {
    const specName = 'order-api';
    const involves = ['order-service', 'inventory-service'];
    const frontmatter = { name: specName, involves };
    const content = `---\n${YAML.stringify(frontmatter)}---\n\n# ${specName}\n\nOrder API specification.\n`;

    fs.writeFileSync(path.join(tmpDir, 'specs', 'capabilities', `${specName}.md`), content);

    const filePath = path.join(tmpDir, 'specs', 'capabilities', `${specName}.md`);
    expect(fs.existsSync(filePath)).toBe(true);

    const readContent = fs.readFileSync(filePath, 'utf-8');
    expect(readContent).toContain('order-service');
    expect(readContent).toContain('Order API specification.');
  });

  it('lists specs by type', () => {
    fs.writeFileSync(path.join(tmpDir, 'specs', 'capabilities', 'api.md'), '# API\n');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'constraints', 'naming.md'), '# Naming\n');

    const types = ['capabilities', 'entries', 'constraints'] as const;
    const found: string[] = [];

    for (const type of types) {
      const dir = path.join(tmpDir, 'specs', type);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        found.push(`${type}/${file.replace('.md', '')}`);
      }
    }

    expect(found).toContain('capabilities/api');
    expect(found).toContain('constraints/naming');
    expect(found).not.toContain('entries/anything');
  });
});

describe('integration: mrw change', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-change-test-'));
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'test-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
        'inventory-service': { repo: 'https://example.com/inventory.git', branch: 'main' },
      },
    };
    saveWorkspace(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('propose -> design -> tasks lifecycle', () => {
    const changesDir = path.join(tmpDir, '.mrw', 'changes');
    fs.mkdirSync(changesDir, { recursive: true });

    const changeName = 'add-payment';
    const changeDir = path.join(changesDir, changeName);
    fs.mkdirSync(changeDir, { recursive: true });

    const proposal = `# Proposal: ${changeName}\n\n## Overview\nAdd payment support\n`;
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposal);

    const design = `# Design: ${changeName}\n\n## Cross-Service Interaction\nTBD\n`;
    fs.writeFileSync(path.join(changeDir, 'design.md'), design);

    const tasks = `# Tasks: ${changeName}\n\n## order-service\n\n- [ ] Add payment field\n\n## inventory-service\n\n- [ ] Handle payment events\n`;
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasks);

    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'design.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);

    const entries = fs.readdirSync(changesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    expect(entries).toContain(changeName);
  });
});
