import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadWorkspace,
  saveWorkspace,
  loadServiceFile,
  importServices,
  addService,
  removeService,
  updateService,
  type WorkspaceConfig,
} from '../lib/workspace.js';

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

  describe('loadServiceFile', () => {
    it('loads a valid services.yaml file', () => {
      const yaml = `services:
  order-service:
    repo: https://github.com/example/order.git
    branch: main
    language: java
    description: Order service
`;
      fs.writeFileSync(path.join(tmpDir, 'services.yaml'), yaml);
      const result = loadServiceFile(path.join(tmpDir, 'services.yaml'));
      expect(Object.keys(result.services)).toHaveLength(1);
      expect(result.services['order-service'].repo).toBe('https://github.com/example/order.git');
      expect(result.services['order-service'].language).toBe('java');
    });

    it('throws when services section is missing', () => {
      fs.writeFileSync(path.join(tmpDir, 'services.yaml'), 'foo: bar\n');
      expect(() => loadServiceFile(path.join(tmpDir, 'services.yaml'))).toThrow('missing or invalid');
    });

    it('throws when a service is missing required repo field', () => {
      const yaml = `services:
  svc1:
    branch: main
`;
      fs.writeFileSync(path.join(tmpDir, 'services.yaml'), yaml);
      expect(() => loadServiceFile(path.join(tmpDir, 'services.yaml'))).toThrow('repo');
    });
  });

  describe('importServices', () => {
    it('adds new services', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {},
      };
      const result = importServices(config, {
        'svc-a': { repo: 'https://example.com/a.git', branch: 'main' },
      });
      expect(result.added).toEqual(['svc-a']);
      expect(result.updated).toEqual([]);
      expect(config.services['svc-a'].repo).toBe('https://example.com/a.git');
    });

    it('updates existing services with merge', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {
          'svc-a': { repo: 'https://example.com/a.git', branch: 'main', language: 'java' },
        },
      };
      const result = importServices(config, {
        'svc-a': { repo: 'https://example.com/a-v2.git', branch: 'develop' },
      });
      expect(result.added).toEqual([]);
      expect(result.updated).toEqual(['svc-a']);
      expect(config.services['svc-a'].repo).toBe('https://example.com/a-v2.git');
      expect(config.services['svc-a'].branch).toBe('develop');
      // Original optional field preserved since incoming doesn't override it
      expect(config.services['svc-a'].language).toBe('java');
    });

    it('handles mixed add and update', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {
          'existing': { repo: 'https://example.com/e.git', branch: 'main' },
        },
      };
      const result = importServices(config, {
        'existing': { repo: 'https://example.com/e2.git', branch: 'main' },
        'new-svc': { repo: 'https://example.com/n.git', branch: 'develop' },
      });
      expect(result.added).toEqual(['new-svc']);
      expect(result.updated).toEqual(['existing']);
    });
  });

  describe('addService', () => {
    it('adds a new service', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {},
      };
      const result = addService(config, 'svc-a', { repo: 'https://example.com/a.git', branch: 'main' });
      expect(result).toBe(true);
      expect(config.services['svc-a']).toBeDefined();
    });

    it('rejects duplicate service name', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: { 'svc-a': { repo: 'https://example.com/a.git', branch: 'main' } },
      };
      const result = addService(config, 'svc-a', { repo: 'https://example.com/other.git', branch: 'main' });
      expect(result).toBe(false);
    });
  });

  describe('removeService', () => {
    it('removes an existing service', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: { 'svc-a': { repo: 'https://example.com/a.git', branch: 'main' } },
      };
      const result = removeService(config, 'svc-a');
      expect(result).toBe(true);
      expect(config.services['svc-a']).toBeUndefined();
    });

    it('returns false for non-existent service', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {},
      };
      const result = removeService(config, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('updateService', () => {
    it('updates specified fields', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: { 'svc-a': { repo: 'https://example.com/a.git', branch: 'main' } },
      };
      const result = updateService(config, 'svc-a', { branch: 'develop', language: 'go' });
      expect(result).toBe(true);
      expect(config.services['svc-a'].branch).toBe('develop');
      expect(config.services['svc-a'].language).toBe('go');
      expect(config.services['svc-a'].repo).toBe('https://example.com/a.git');
    });

    it('returns false for non-existent service', () => {
      const config: WorkspaceConfig = {
        version: 1,
        workspace: { name: 'ws' },
        services: {},
      };
      const result = updateService(config, 'non-existent', { branch: 'develop' });
      expect(result).toBe(false);
    });
  });
});
