import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadWorkspace, saveWorkspace, type WorkspaceConfig } from '../lib/workspace.js';

describe('workspace', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadWorkspace', () => {
    it('returns null when workspace.yaml does not exist', () => {
      expect(loadWorkspace(tmpDir)).toBeNull();
    });

    it('loads a valid workspace.yaml', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'test-ws', description: 'desc', domain: 'orders' },
        services: {
          'order-service': { repo: 'https://github.com/example/order.git', branch: 'main' },
        },
      };
      saveWorkspace(tmpDir, config);

      const loaded = loadWorkspace(tmpDir);
      expect(loaded).not.toBeNull();
      if (!loaded) throw new Error('unexpected null');
      expect(loaded.workspace.name).toBe('test-ws');
      expect(loaded.services['order-service'].repo).toBe('https://github.com/example/order.git');
    });

    it('throws when workspace.name is missing', () => {
      const yaml = `version: 1\nworkspace: {}\nservices: {}\n`;
      fs.writeFileSync(path.join(tmpDir, 'workspace.yaml'), yaml);
      expect(() => loadWorkspace(tmpDir)).toThrow('workspace.name');
    });

    it('throws when a service is missing required repo field', () => {
      const yaml = `version: 1\nworkspace:\n  name: test\nservices:\n  svc1:\n    branch: main\n`;
      fs.writeFileSync(path.join(tmpDir, 'workspace.yaml'), yaml);
      expect(() => loadWorkspace(tmpDir)).toThrow('repo');
    });

    it('throws when a service is missing required branch field', () => {
      const yaml = `version: 1\nworkspace:\n  name: test\nservices:\n  svc1:\n    repo: https://example.com/repo.git\n`;
      fs.writeFileSync(path.join(tmpDir, 'workspace.yaml'), yaml);
      expect(() => loadWorkspace(tmpDir)).toThrow('branch');
    });

    it('loads optional service fields (language, description)', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {
          'svc': {
            repo: 'https://example.com/repo.git',
            branch: 'develop',
            language: 'go',
            description: 'A service',
          },
        },
      };
      saveWorkspace(tmpDir, config);

      const loaded = loadWorkspace(tmpDir);
      if (!loaded) throw new Error('unexpected null');
      expect(loaded.services['svc'].language).toBe('go');
      expect(loaded.services['svc'].description).toBe('A service');
    });
  });

  describe('saveWorkspace', () => {
    it('writes workspace.yaml to disk', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'save-test' },
        services: {},
      };
      saveWorkspace(tmpDir, config);

      const filePath = path.join(tmpDir, 'workspace.yaml');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('save-test');
    });

    it('round-trips through save and load', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'round-trip', description: 'test', domain: 'billing' },
        services: {
          'billing-svc': { repo: 'https://github.com/example/billing.git', branch: 'main' },
          'payment-svc': { repo: 'https://github.com/example/payment.git', branch: 'develop', language: 'typescript' },
        },
      };
      saveWorkspace(tmpDir, config);
      const loaded = loadWorkspace(tmpDir);
      if (!loaded) throw new Error('unexpected null');

      expect(loaded.workspace.name).toBe('round-trip');
      expect(Object.keys(loaded.services)).toHaveLength(2);
      expect(loaded.services['billing-svc'].branch).toBe('main');
      expect(loaded.services['payment-svc'].language).toBe('typescript');
    });
  });
});
