import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { saveWorkspace, type WorkspaceConfig } from '../lib/workspace.js';

// Mock simple-git
const mockClone = vi.fn();
const mockPull = vi.fn();
const mockStatus = vi.fn();
const mockBranch = vi.fn();
const mockCheckout = vi.fn();
const mockClean = vi.fn();
const mockReset = vi.fn();

vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: mockClone,
    pull: mockPull,
    status: mockStatus,
    branch: mockBranch,
    checkout: mockCheckout,
    clean: mockClean,
    reset: mockReset,
  })),
}));

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock ora to suppress spinner output in tests
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
  })),
}));

import inquirer from 'inquirer';

function createTestWorkspace(tmpDir: string): WorkspaceConfig {
  const config: WorkspaceConfig = {
    version: 1,
    workspace: { name: 'test-ws' },
    services: {
      'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      'inventory-service': { repo: 'https://example.com/inventory.git', branch: 'develop' },
    },
  };
  saveWorkspace(tmpDir, config);
  return config;
}

describe('sync command --depth', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-sync-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    createTestWorkspace(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockClone.mockResolvedValue('');
    mockPull.mockResolvedValue('');
    mockStatus.mockResolvedValue({ isClean: () => true });
    mockBranch.mockResolvedValue({ current: 'main' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes --depth to clone args when --depth flag is provided', async () => {
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '1']);

    expect(mockClone).toHaveBeenCalledWith(
      'https://example.com/order.git',
      expect.stringContaining('order'),
      ['--branch', 'main', '--depth', '1'],
    );
  });

  it('rejects zero depth', async () => {
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '0']);

    expect(mockClone).not.toHaveBeenCalled();
  });

  it('rejects negative depth', async () => {
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '-5']);

    expect(mockClone).not.toHaveBeenCalled();
  });

  it('rejects non-integer depth', async () => {
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '1.5']);

    expect(mockClone).not.toHaveBeenCalled();
  });

  it('clones without --depth when flag is not provided', async () => {
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test']);

    expect(mockClone).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      ['--branch', expect.any(String)],
    );
  });

  it('does not pass depth to pull for existing repositories', async () => {
    // Repo directories use repo-derived names (order, inventory) under repos/
    const reposDir = path.join(tmpDir, 'repos');
    fs.mkdirSync(path.join(reposDir, 'order'), { recursive: true });
    fs.mkdirSync(path.join(reposDir, 'inventory'), { recursive: true });

    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '5']);

    // Both repos exist, so pull is called instead of clone
    expect(mockPull).toHaveBeenCalled();
    expect(mockClone).not.toHaveBeenCalled();
  });
});

describe('sync command with shared repos', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-sync-shared-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockClone.mockResolvedValue('');
    mockPull.mockResolvedValue('');
    mockStatus.mockResolvedValue({ isClean: () => true });
    mockBranch.mockResolvedValue({ current: 'main' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('clones shared repo only once for multiple services', async () => {
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

    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test']);

    // Should clone 2 repos: platform and auth-service
    expect(mockClone).toHaveBeenCalledTimes(2);
    expect(mockClone).toHaveBeenCalledWith(
      'https://github.com/org/platform.git',
      expect.stringContaining('platform'),
      ['--branch', 'main'],
    );
    expect(mockClone).toHaveBeenCalledWith(
      'https://github.com/org/auth-service.git',
      expect.stringContaining('auth-service'),
      ['--branch', 'develop'],
    );
  });

  it('warns about branch conflicts in shared repos', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'conflict-ws' },
      services: {
        'svc-a': { repo: 'https://github.com/org/platform.git', branch: 'main' },
        'svc-b': { repo: 'https://github.com/org/platform.git', branch: 'develop' },
      },
    };
    saveWorkspace(tmpDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('conflicting branches');
    consoleSpy.mockRestore();
  });
});

describe('sync command with arch repo', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-sync-arch-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockClone.mockResolvedValue('');
    mockPull.mockResolvedValue('');
    mockStatus.mockResolvedValue({ isClean: () => true });
    mockBranch.mockResolvedValue({ current: 'main' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('pulls arch repo before service repos when arch config is present', async () => {
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'design-ws' },
      services: {
        'order-service': { repo: 'https://example.com/order.git', branch: 'main' },
      },
      arch: { repo: 'https://github.com/org/arch-design.git', branch: 'main' },
    };
    saveWorkspace(tmpDir, config);

    // Create arch repo directory so it gets pulled instead of cloned
    fs.mkdirSync(path.join(tmpDir, 'arch-design'), { recursive: true });

    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test']);

    // Arch repo should be pulled (it exists)
    expect(mockPull).toHaveBeenCalled();
  });

  it('includes arch repo in summary with [arch] label', async () => {
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

    const consoleSpy = vi.spyOn(console, 'log');
    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('[arch]');
    consoleSpy.mockRestore();
  });
});

describe('reset command', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-reset-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    createTestWorkspace(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockCheckout.mockResolvedValue(undefined);
    mockClean.mockResolvedValue('');
    mockReset.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prompts for confirmation and proceeds when confirmed', async () => {
    // Repo directories use repo-derived names under repos/
    const reposDir = path.join(tmpDir, 'repos');
    fs.mkdirSync(path.join(reposDir, 'order'), { recursive: true });

    vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test']);

    expect(inquirer.prompt).toHaveBeenCalled();
    expect(mockCheckout).toHaveBeenCalledWith('main');
    expect(mockClean).toHaveBeenCalledWith('f', ['-d']);
    expect(mockReset).toHaveBeenCalledWith(['--hard', 'origin/main']);
  });

  it('cancels reset when user declines confirmation', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test']);

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('skips confirmation prompt with --force flag', async () => {
    const reposDir = path.join(tmpDir, 'repos');
    fs.mkdirSync(path.join(reposDir, 'order'), { recursive: true });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(mockCheckout).toHaveBeenCalled();
  });

  it('targets a single service with --service flag', async () => {
    const reposDir = path.join(tmpDir, 'repos');
    fs.mkdirSync(path.join(reposDir, 'order'), { recursive: true });
    fs.mkdirSync(path.join(reposDir, 'inventory'), { recursive: true });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--service', 'order-service', '--force']);

    // checkout called only for the order repo (main branch)
    expect(mockCheckout).toHaveBeenCalledWith('main');
    expect(mockCheckout).toHaveBeenCalledTimes(1);
  });

  it('reports error for unknown service', async () => {
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--service', 'unknown', '--force']);

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('skips repos that are not cloned', async () => {
    // Don't create repo directories
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('shows summary output after reset', async () => {
    const reposDir = path.join(tmpDir, 'repos');
    fs.mkdirSync(path.join(reposDir, 'order'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'log');
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('Reset Summary');
    consoleSpy.mockRestore();
  });
});
