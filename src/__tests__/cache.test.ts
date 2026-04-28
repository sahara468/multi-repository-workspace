import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  readJsonCache,
  writeJsonCache,
  loadTopology,
  saveTopology,
  loadDependencies,
  saveDependencies,
  type TopologyEntry,
  type DependencyEntry,
} from '../lib/cache.js';

describe('cache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrw-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('readJsonCache / writeJsonCache', () => {
    it('returns null when file does not exist', () => {
      expect(readJsonCache(tmpDir, 'missing.json')).toBeNull();
    });

    it('writes and reads back JSON data', () => {
      const data = { foo: 'bar', count: 42 };
      writeJsonCache(tmpDir, 'test.json', data);
      const result = readJsonCache<typeof data>(tmpDir, 'test.json');
      expect(result).toEqual(data);
    });

    it('creates directory if it does not exist', () => {
      const nested = path.join(tmpDir, 'nested', 'dir');
      writeJsonCache(nested, 'test.json', { ok: true });
      expect(readJsonCache(nested, 'test.json')).toEqual({ ok: true });
    });

    it('returns null for invalid JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'bad.json'), 'not json');
      expect(readJsonCache(tmpDir, 'bad.json')).toBeNull();
    });
  });

  describe('topology cache', () => {
    it('returns empty array when no cache exists', () => {
      expect(loadTopology(tmpDir)).toEqual([]);
    });

    it('saves and loads topology entries', () => {
      const entries: TopologyEntry[] = [
        { service: 'order-svc', dependsOn: ['inventory-svc'], calledBy: ['api-gateway'] },
        { service: 'inventory-svc', dependsOn: [], calledBy: ['order-svc'] },
      ];
      saveTopology(tmpDir, entries);
      const loaded = loadTopology(tmpDir);
      expect(loaded).toEqual(entries);
    });
  });

  describe('dependencies cache', () => {
    it('returns empty array when no cache exists', () => {
      expect(loadDependencies(tmpDir)).toEqual([]);
    });

    it('saves and loads dependency entries', () => {
      const entries: DependencyEntry[] = [
        { service: 'order-svc', provides: ['POST /orders'], consumes: ['GET /inventory'] },
      ];
      saveDependencies(tmpDir, entries);
      const loaded = loadDependencies(tmpDir);
      expect(loaded).toEqual(entries);
    });
  });
});
