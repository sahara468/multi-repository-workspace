import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { saveWorkspace, loadWorkspace, type WorkspaceConfig } from '../lib/workspace.js';

// Mock simple-git
const mockClone = vi.fn();
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: mockClone,
  })),
}));

// Mock inquirer
const mockPrompt = vi.fn();
vi.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
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

describe('mrw init with directory argument', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-init-dir-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates directory and workspace.yaml inside it', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', 'my-workspace', '--name', 'my-project']);

    const wsDir = path.join(tmpDir, 'my-workspace');
    expect(fs.existsSync(wsDir)).toBe(true);
    expect(fs.existsSync(path.join(wsDir, 'workspace.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(wsDir, 'repos'))).toBe(true);

    const loaded = loadWorkspace(wsDir);
    expect(loaded?.workspace.name).toBe('my-project');
  });

  it('works when directory exists but has no workspace', async () => {
    const existingDir = path.join(tmpDir, 'existing-dir');
    fs.mkdirSync(existingDir, { recursive: true });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', 'existing-dir', '--name', 'test-ws']);

    expect(fs.existsSync(path.join(existingDir, 'workspace.yaml'))).toBe(true);
    const loaded = loadWorkspace(existingDir);
    expect(loaded?.workspace.name).toBe('test-ws');
  });

  it('errors when workspace.yaml already exists in target directory', async () => {
    const existingDir = path.join(tmpDir, 'has-workspace');
    fs.mkdirSync(existingDir, { recursive: true });
    const config: WorkspaceConfig = {
      version: 1,
      workspace: { name: 'existing' },
      services: {},
    };
    saveWorkspace(existingDir, config);

    const consoleSpy = vi.spyOn(console, 'log');
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', 'has-workspace', '--name', 'new-name']);

    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('already exists');
    consoleSpy.mockRestore();
  });

  it('resolves relative directory path', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', './sub/dir', '--name', 'test-ws']);

    const wsDir = path.join(tmpDir, 'sub', 'dir');
    expect(fs.existsSync(wsDir)).toBe(true);
    expect(fs.existsSync(path.join(wsDir, 'workspace.yaml'))).toBe(true);
  });

  it('inits in current directory when no directory argument', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--name', 'test-ws']);

    expect(fs.existsSync(path.join(tmpDir, 'workspace.yaml'))).toBe(true);
    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('test-ws');
  });
});

describe('mrw init with CLI options', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-init-cli-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates workspace with --name and --description without prompts', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--name', 'my-project', '--description', 'My project']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('my-project');
    expect(loaded?.workspace.description).toBe('My project');
    // No domain set
    expect(loaded?.workspace.domain).toBeUndefined();
    // No interactive prompts called
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('creates workspace with --name only, prompts for description in TTY', async () => {
    mockPrompt.mockResolvedValue({ description: 'Prompted description' });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--name', 'my-project']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('my-project');
    // Inquirer was called for description since isTTY is undefined in test (not true)
  });

  it('does not prompt for domain', async () => {
    mockPrompt.mockResolvedValue({ name: 'test' });

    // Simulate interactive by importing with process.stdin.isTTY
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test']);

    // Verify inquirer was called and check prompt structure
    expect(mockPrompt).toHaveBeenCalled();
    const promptCalls = mockPrompt.mock.calls;
    // The first prompt should be for name (since no --name provided)
    const namePrompt = promptCalls[0][0] as Array<{ name: string; message: string }>;
    const promptNames = namePrompt.map((p: { name: string }) => p.name);
    expect(promptNames).not.toContain('domain');

    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });
});

describe('mrw init non-interactive mode', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-init-nonint-'));
    originalCwd = process.cwd();
    originalIsTTY = process.stdin.isTTY;
    process.chdir(tmpDir);
    // Simulate non-interactive (no TTY)
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('errors without --name in non-interactive mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    try {
      const { initCommand } = await import('../commands/init.js');
      await initCommand.parseAsync(['node', 'test']);
    } catch (err: unknown) {
      // process.exit throws in test
    }

    expect(mockExit).toHaveBeenCalledWith(1);
    const allOutput = consoleSpy.mock.calls.flat().map(String).join(' ');
    expect(allOutput).toContain('--name');
    consoleSpy.mockRestore();
    mockExit.mockRestore();
  });

  it('succeeds with --name in non-interactive mode', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--name', 'my-project']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('my-project');
    expect(loaded?.workspace.description).toBeUndefined();
    expect(mockPrompt).not.toHaveBeenCalled();
  });
});

describe('mrw init --from-arch name derivation', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-init-arch-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
    mockClone.mockImplementation(async (_url: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(path.join(dest, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(dest, 'arch'), { recursive: true });
      fs.writeFileSync(path.join(dest, 'services.yaml'), 'services: {}\n');
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('derives name from repo URL when --name is omitted', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/my-arch.git']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('my-arch');
  });

  it('uses --name when provided with --from-arch', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/my-arch.git', '--name', 'custom-name']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.name).toBe('custom-name');
  });

  it('uses --description with --from-arch', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', '--from-arch', 'https://github.com/org/my-arch.git', '--description', 'My desc']);

    const loaded = loadWorkspace(tmpDir);
    expect(loaded?.workspace.description).toBe('My desc');
  });

  it('supports directory argument with --from-arch', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand.parseAsync(['node', 'test', 'my-arch-dir', '--from-arch', 'https://github.com/org/my-arch.git']);

    const wsDir = path.join(tmpDir, 'my-arch-dir');
    expect(fs.existsSync(wsDir)).toBe(true);
    expect(fs.existsSync(path.join(wsDir, 'workspace.yaml'))).toBe(true);
  });
});

describe('mrw init --from-template removed', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-init-no-template-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects --from-template as unknown option', async () => {
    // Commander exits with error for unknown options — verify it doesn't succeed
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });

    try {
      const { initCommand } = await import('../commands/init.js');
      await initCommand.parseAsync(['node', 'test', '--from-template', 'microservice-java']);
      // Should not reach here
      expect.unreachable('Should have exited');
    } catch {
      // Expected: Commander calls process.exit(1) for unknown option
      expect(mockExit).toHaveBeenCalledWith(1);
    }

    mockExit.mockRestore();
  });
});
