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

import simpleGit from 'simple-git';
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
      expect.any(String),
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
    const reposDir = path.join(tmpDir, '.mrw', 'state', 'repos');
    fs.mkdirSync(path.join(reposDir, 'order-service'), { recursive: true });
    fs.mkdirSync(path.join(reposDir, 'inventory-service'), { recursive: true });

    const { syncCommand } = await import('../commands/sync.js');
    await syncCommand.parseAsync(['node', 'test', '--depth', '5']);

    // Both services exist, so pull is called instead of clone
    expect(mockPull).toHaveBeenCalled();
    expect(mockClone).not.toHaveBeenCalled();
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
    const reposDir = path.join(tmpDir, '.mrw', 'state', 'repos');
    fs.mkdirSync(path.join(reposDir, 'order-service'), { recursive: true });

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
    const reposDir = path.join(tmpDir, '.mrw', 'state', 'repos');
    fs.mkdirSync(path.join(reposDir, 'order-service'), { recursive: true });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(mockCheckout).toHaveBeenCalled();
  });

  it('targets a single service with --service flag', async () => {
    const reposDir = path.join(tmpDir, '.mrw', 'state', 'repos');
    fs.mkdirSync(path.join(reposDir, 'order-service'), { recursive: true });
    fs.mkdirSync(path.join(reposDir, 'inventory-service'), { recursive: true });

    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--service', 'order-service', '--force']);

    // checkout called only for order-service (main branch)
    expect(mockCheckout).toHaveBeenCalledWith('main');
    expect(mockCheckout).toHaveBeenCalledTimes(1);
  });

  it('reports error for unknown service', async () => {
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--service', 'unknown', '--force']);

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('skips services that are not cloned', async () => {
    // Don't create repo directories
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('shows summary output after reset', async () => {
    const reposDir = path.join(tmpDir, '.mrw', 'state', 'repos');
    fs.mkdirSync(path.join(reposDir, 'order-service'), { recursive: true });

    const consoleSpy = vi.spyOn(console, 'log');
    const { resetCommand } = await import('../commands/reset.js');
    await resetCommand.parseAsync(['node', 'test', '--force']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('Reset Summary');
    consoleSpy.mockRestore();
  });
});
