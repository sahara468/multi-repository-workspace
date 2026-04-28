import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadWorkspace,
  saveWorkspace,
  addService,
  removeService,
  updateService,
  loadServiceFile,
  importServices,
} from '../lib/workspace.js';

export const serviceCommand = new Command('service')
  .description('Manage service registrations in the workspace');

serviceCommand.addCommand(
  new Command('add')
    .argument('<name>', 'Service name')
    .requiredOption('--repo <url>', 'Git repository URL')
    .requiredOption('--branch <name>', 'Default branch')
    .option('--language <lang>', 'Programming language')
    .option('--description <desc>', 'Service description')
    .description('Add a service to the workspace')
    .action((name: string, options: { repo: string; branch: string; language?: string; description?: string }) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const service = {
        repo: options.repo,
        branch: options.branch,
        ...(options.language && { language: options.language }),
        ...(options.description && { description: options.description }),
      };

      if (!addService(config, name, service)) {
        console.log(chalk.red(`Service "${name}" already exists. Use \`mrw service update\` to modify it.`));
        return;
      }

      saveWorkspace(cwd, config);
      console.log(chalk.green(`Service "${name}" added to workspace.`));
    })
);

serviceCommand.addCommand(
  new Command('remove')
    .argument('<name>', 'Service name')
    .description('Remove a service from the workspace')
    .action((name: string) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      if (!removeService(config, name)) {
        console.log(chalk.red(`Service "${name}" not found in workspace.yaml.`));
        return;
      }

      saveWorkspace(cwd, config);

      // Check if repo is still cloned locally
      const repoDir = path.join(cwd, '.mrw', 'state', 'repos', name);
      if (fs.existsSync(repoDir)) {
        console.log(chalk.green(`Service "${name}" removed from workspace.yaml.`));
        console.log(chalk.yellow(`  Warning: cloned repository still exists at .mrw/state/repos/${name}/`));
      } else {
        console.log(chalk.green(`Service "${name}" removed from workspace.yaml.`));
      }
    })
);

serviceCommand.addCommand(
  new Command('update')
    .argument('<name>', 'Service name')
    .option('--repo <url>', 'Git repository URL')
    .option('--branch <name>', 'Default branch')
    .option('--language <lang>', 'Programming language')
    .option('--description <desc>', 'Service description')
    .description('Update a service in the workspace')
    .action((name: string, options: { repo?: string; branch?: string; language?: string; description?: string }) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const updates: Record<string, string> = {};
      if (options.repo) updates.repo = options.repo;
      if (options.branch) updates.branch = options.branch;
      if (options.language) updates.language = options.language;
      if (options.description) updates.description = options.description;

      if (Object.keys(updates).length === 0) {
        console.log(chalk.yellow('No updates specified. Use --repo, --branch, --language, or --description.'));
        return;
      }

      if (!updateService(config, name, updates)) {
        console.log(chalk.red(`Service "${name}" not found in workspace.yaml.`));
        return;
      }

      saveWorkspace(cwd, config);
      console.log(chalk.green(`Service "${name}" updated: ${Object.keys(updates).join(', ')}`));
    })
);

serviceCommand.addCommand(
  new Command('import')
    .option('--file <path>', 'Path to services YAML file (default: services.yaml)')
    .description('Import services from a YAML file')
    .action((options: { file?: string }) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const filePath = options.file
        ? path.resolve(cwd, options.file)
        : path.join(cwd, 'services.yaml');

      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`Services file not found: ${filePath}`));
        return;
      }

      try {
        const serviceFile = loadServiceFile(filePath);
        const result = importServices(config, serviceFile.services);
        saveWorkspace(cwd, config);

        console.log(chalk.green('Service import completed.'));
        if (result.added.length > 0) {
          console.log(chalk.dim(`  Added: ${result.added.join(', ')}`));
        }
        if (result.updated.length > 0) {
          console.log(chalk.dim(`  Updated: ${result.updated.join(', ')}`));
        }
        if (result.added.length === 0 && result.updated.length === 0) {
          console.log(chalk.dim('  No changes — all services already match.'));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`Failed to import services: ${message}`));
      }
    })
);
