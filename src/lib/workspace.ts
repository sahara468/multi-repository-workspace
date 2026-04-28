import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface ServiceConfig {
  repo: string;
  branch: string;
  language?: string;
  description?: string;
}

export interface WorkspaceConfig {
  version: number;
  workspace: {
    name: string;
    description?: string;
    domain?: string;
  };
  services: Record<string, ServiceConfig>;
}

export function loadWorkspace(cwd: string): WorkspaceConfig | null {
  const filePath = path.join(cwd, 'workspace.yaml');
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content) as WorkspaceConfig;

  // Validate required fields
  if (!parsed.workspace?.name) {
    throw new Error('workspace.yaml is missing required field: workspace.name');
  }

  for (const [name, service] of Object.entries(parsed.services ?? {})) {
    if (!service.repo) {
      throw new Error(`Service "${name}" is missing required field: repo`);
    }
    if (!service.branch) {
      throw new Error(`Service "${name}" is missing required field: branch`);
    }
  }

  return parsed;
}

export function saveWorkspace(cwd: string, config: WorkspaceConfig): void {
  const filePath = path.join(cwd, 'workspace.yaml');
  const content = YAML.stringify(config);
  fs.writeFileSync(filePath, content);
}

export interface ServiceFile {
  services: Record<string, ServiceConfig>;
}

export function loadServiceFile(filePath: string): ServiceFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content) as ServiceFile;

  if (!parsed.services || typeof parsed.services !== 'object') {
    throw new Error('Invalid services file: missing or invalid "services" section');
  }

  for (const [name, service] of Object.entries(parsed.services)) {
    if (!service.repo) {
      throw new Error(`Service "${name}" in services file is missing required field: repo`);
    }
    if (!service.branch) {
      throw new Error(`Service "${name}" in services file is missing required field: branch`);
    }
  }

  return parsed;
}

export interface ImportResult {
  added: string[];
  updated: string[];
  skipped: string[];
}

export function importServices(
  config: WorkspaceConfig,
  incoming: Record<string, ServiceConfig>
): ImportResult {
  const result: ImportResult = { added: [], updated: [], skipped: [] };

  for (const [name, service] of Object.entries(incoming)) {
    if (config.services[name]) {
      // Merge: update fields from incoming
      config.services[name] = {
        ...config.services[name],
        ...service,
      };
      result.updated.push(name);
    } else {
      config.services[name] = { ...service };
      result.added.push(name);
    }
  }

  return result;
}

export function addService(
  config: WorkspaceConfig,
  name: string,
  service: ServiceConfig
): boolean {
  if (config.services[name]) {
    return false;
  }
  config.services[name] = { ...service };
  return true;
}

export function removeService(
  config: WorkspaceConfig,
  name: string
): boolean {
  if (!config.services[name]) {
    return false;
  }
  delete config.services[name];
  return true;
}

export function updateService(
  config: WorkspaceConfig,
  name: string,
  updates: Partial<ServiceConfig>
): boolean {
  if (!config.services[name]) {
    return false;
  }
  config.services[name] = {
    ...config.services[name],
    ...updates,
  };
  return true;
}
