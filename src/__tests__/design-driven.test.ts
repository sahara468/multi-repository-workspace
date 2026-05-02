import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { saveWorkspace, loadWorkspace, isDesignDriven, archRepoDir, type WorkspaceConfig } from '../lib/workspace.js';

// Mock simple-git
const mockClone = vi.fn();
const mockPull = vi.fn();
const mockStatus = vi.fn();
const mockBranch = vi.fn();
const mockCheckout = vi.fn();
const mockCheckoutLocalBranch = vi.fn();

vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: mockClone,
    pull: mockPull,
    status: mockStatus,
    branch: mockBranch,
    checkout: mockCheckout,
    checkoutLocalBranch: mockCheckoutLocalBranch,
  })),
}));

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('mrw init --from-arch', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-arch-init-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockClone.mockResolvedValue('');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('clones arch repo and imports services.yaml', async () => {
    // After clone, simulate arch repo with services.yaml
    mockClone.mockImplementation(async (_url: string, dest: string, _opts: string[]) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs', 'capabilities'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs', 'entries'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'arch'), { recursive: true });
      const servicesYaml = `services:
  order-service:
    repo: https://github.com/org/order.git
    branch: main
  user-service:
    repo: https://github.com/org/user.git
    branch: main
`;
      fs.writeFileSync(path.join(dest, 'services.yaml'), servicesYaml);
    });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/order-service-arch.git']);

    // workspace.yaml should exist
    const loaded = loadWorkspace(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.arch).toBeDefined();
    expect(loaded!.arch!.repo).toBe('https://github.com/org/order-service-arch.git');
    expect(loaded!.arch!.branch).toBe('main');
    expect(Object.keys(loaded!.services)).toHaveLength(2);
    expect(loaded!.services['order-service']).toBeDefined();
    expect(loaded!.services['user-service']).toBeDefined();

    // repos/ directory should be created
    expect(fs.existsSync(path.join(tmpDir, 'repos'))).toBe(true);

    // .gitignore should have .mrw/
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.mrw/');
  });

  it('uses --arch-branch when specified', async () => {
    mockClone.mockImplementation(async (_url: string, dest: string, opts: string[]) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'arch'), { recursive: true });
      fs.writeFileSync(path.join(dest, 'services.yaml'), 'services: {}\n');
      // Verify branch option
      expect(opts).toContain('develop');
    });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/arch.git', '--arch-branch', 'develop']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded!.arch!.branch).toBe('develop');
  });

  it('fails when arch repo is missing services.yaml', async () => {
    mockClone.mockImplementation(async (_url: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      // No services.yaml
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/bad-arch.git']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('services.yaml');
    consoleSpy.mockRestore();

    // Arch repo should be cleaned up
    expect(fs.existsSync(path.join(tmpDir, 'bad-arch'))).toBe(false);
    // workspace.yaml should NOT exist
    expect(fs.existsSync(path.join(tmpDir, 'workspace.yaml'))).toBe(false);
  });

  it('warns when arch repo is missing specs/ or arch/ directories', async () => {
    mockClone.mockImplementation(async (_url: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(path.join(dest, 'services.yaml'), 'services: {}\n');
      // Missing specs/ and arch/
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/minimal-arch.git']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('specs/');
    expect(allOutput).toContain('arch/');
    consoleSpy.mockRestore();

    // workspace.yaml should still be created
    const loaded = loadWorkspace(tmpDir);
    expect(loaded).not.toBeNull();
  });

  it('does not sync service repos during init', async () => {
    mockClone.mockImplementation(async (_url: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'arch'), { recursive: true });
      fs.writeFileSync(path.join(dest, 'services.yaml'), `services:
  order-service:
    repo: https://github.com/org/order.git
    branch: main
`);
    });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/arch.git']);

    // repos/ should exist but be empty (no service repos cloned)
    const reposDir = path.join(tmpDir, 'repos');
    expect(fs.existsSync(reposDir)).toBe(true);
    const entries = fs.readdirSync(reposDir);
    expect(entries).toHaveLength(0);
  });

  it('prints message to run mrw sync', async () => {
    mockClone.mockImplementation(async (_url: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'arch'), { recursive: true });
      fs.writeFileSync(path.join(dest, 'services.yaml'), 'services: {}\n');
    });

    const consoleSpy = vi.spyOn(console, 'log');
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/arch.git']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('mrw sync');
    consoleSpy.mockRestore();
  });
});

describe('mrw service add/remove in design-driven workspace', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-svc-restrict-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('blocks service add in design-driven workspace', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {},
      arch: { repo: 'https://github.com/org/arch.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'add', 'new-svc', '--repo', 'https://example.com/new.git', '--branch', 'main']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('not allowed');
    expect(allOutput).toContain('service import');
    consoleSpy.mockRestore();
  });

  it('blocks service remove in design-driven workspace', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      },
      arch: { repo: 'https://github.com/org/arch.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'remove', 'order-service']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('not allowed');
    expect(allOutput).toContain('service import');
    consoleSpy.mockRestore();
  });

  it('allows service add in plain workspace', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'plain-ws' },
      services: {},
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'add', 'new-svc', '--repo', 'https://example.com/new.git', '--branch', 'main']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('added');
    consoleSpy.mockRestore();
  });

  it('allows service remove in plain workspace', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'plain-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      },
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'remove', 'order-service']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('removed');
    consoleSpy.mockRestore();
  });
});

describe('mrw service import in design-driven workspace', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-svc-import-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults to arch repo services.yaml in design-driven mode', async () => {
    // Create arch repo directory with services.yaml
    const archDir = path.join(tmpDir, 'order-service-arch');
    fs.mkdirSync(archDir, { recursive: true });
    const servicesYaml = `services:
  order-service:
    repo: https://github.com/org/order.git
    branch: develop
`;
    fs.writeFileSync(path.join(archDir, 'services.yaml'), servicesYaml);

    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {},
      arch: { repo: 'https://github.com/org/order-service-arch.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'import']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('import');
    consoleSpy.mockRestore();

    // Verify services were imported
    const loaded = loadWorkspace(tmpDir);
    expect(loaded!.services['order-service']).toBeDefined();
    expect(loaded!.services['order-service'].branch).toBe('develop');
  });

  it('uses --file when specified in design-driven mode', async () => {
    // Create a custom services file
    const customFile = path.join(tmpDir, 'custom-services.yaml');
    fs.writeFileSync(customFile, `services:
  custom-svc:
    repo: https://github.com/org/custom.git
    branch: main
`);

    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {},
      arch: { repo: 'https://github.com/org/arch.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'import', '--file', customFile]);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded!.services['custom-svc']).toBeDefined();
  });

  it('defaults to cwd services.yaml in plain workspace', async () => {
    const servicesYaml = `services:
  plain-svc:
    repo: https://github.com/org/plain.git
    branch: main
`;
    fs.writeFileSync(path.join(tmpDir, 'services.yaml'), servicesYaml);

    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'plain-ws' },
      services: {},
    };
    saveWorkspace(tmpDir, config);

    const { serviceCommand } = await import('../commands/service.js');
    await serviceCommand.parseAsync(['node', 'test', 'import']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded!.services['plain-svc']).toBeDefined();
  });
});

describe('mrw branch/checkout with arch repo', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-branch-arch-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockStatus.mockResolvedValue({ isClean: () => true });
    mockCheckout.mockResolvedValue(undefined);
    mockCheckoutLocalBranch.mockResolvedValue(undefined);
    mockBranch.mockResolvedValue({ current: 'main' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes arch repo in branch create', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      },
      arch: { repo: 'https://github.com/org/arch-design.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    // Create arch repo and service repo dirs
    fs.mkdirSync(path.join(tmpDir, 'arch-design'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'repos', 'order'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'log');
    const { branchCommand } = await import('../commands/branch.js');
    await branchCommand.parseAsync(['node', 'test', 'create', 'feature-x']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('[arch]');
    expect(allOutput).toContain('feature-x');
    consoleSpy.mockRestore();
  });

  it('includes arch repo in checkout', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      },
      arch: { repo: 'https://github.com/org/arch-design.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    fs.mkdirSync(path.join(tmpDir, 'arch-design'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'repos', 'order'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'log');
    const { checkoutCommand } = await import('../commands/checkout.js');
    await checkoutCommand.parseAsync(['node', 'test', 'develop']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('[arch]');
    consoleSpy.mockRestore();
  });
});
