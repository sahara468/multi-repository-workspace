import fs from 'node:fs';
import path from 'node:path';

export interface TopologyEntry {
  service: string;
  dependsOn: string[];
  calledBy: string[];
}

export interface DependencyEntry {
  service: string;
  provides: string[];
  consumes: string[];
}

export function readJsonCache<T>(indexDir: string, filename: string): T | null {
  const filePath = path.join(indexDir, filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function writeJsonCache<T>(indexDir: string, filename: string, data: T): void {
  fs.mkdirSync(indexDir, { recursive: true });
  const filePath = path.join(indexDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadTopology(indexDir: string): TopologyEntry[] {
  return readJsonCache<TopologyEntry[]>(indexDir, 'topology.json') ?? [];
}

export function saveTopology(indexDir: string, entries: TopologyEntry[]): void {
  writeJsonCache(indexDir, 'topology.json', entries);
}

export function loadDependencies(indexDir: string): DependencyEntry[] {
  return readJsonCache<DependencyEntry[]>(indexDir, 'dependencies.json') ?? [];
}

export function saveDependencies(indexDir: string, entries: DependencyEntry[]): void {
  writeJsonCache(indexDir, 'dependencies.json', entries);
}
