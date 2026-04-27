import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface WorkspaceConfig {
  version: number;
  workspace: {
    name: string;
    description?: string;
    domain?: string;
  };
  services: Record<string, {
    repo: string;
    branch: string;
    language?: string;
    description?: string;
  }>;
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
