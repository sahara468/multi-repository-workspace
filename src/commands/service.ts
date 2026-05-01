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
  getRepoIndex,
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
    .option('--path <path>', 'Service path within the repository')
    .description('Add a service to the workspace')
    .action((name: string, options: { repo: string; branch: string; language?: string; description?: string; path?: string }) => {
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
        ...(options.path && { path: options.path }),
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

      const service = config.services[name];
      if (!service) {
        console.log(chalk.red(`Service "${name}" not found in workspace.yaml.`));
        return;
      }

      // Check repo sharing before removing
      const index = getRepoIndex(config);
      let repoDirName: string | undefined;
      let repoEntry: { url: string; branch: string; services: string[] } | undefined;
      for (const [rName, entry] of index) {
        if (entry.services.includes(name)) {
          repoDirName = rName;
          repoEntry = entry;
          break;
        }
      }

      removeService(config, name);
      saveWorkspace(cwd, config);

      console.log(chalk.green(`Service "${name}" removed from workspace.yaml.`));

      if (repoDirName && repoEntry) {
        if (repoEntry.services.length > 1) {
          const otherServices = repoEntry.services.filter(s => s !== name);
          console.log(chalk.yellow(`  Warning: repo "${repoDirName}" is still used by: ${otherServices.join(', ')}`));
        } else {
          const repoDir = path.join(cwd, '.mrw', 'state', 'repos', repoDirName);
          if (fs.existsSync(repoDir)) {
            console.log(chalk.yellow(`  Warning: cloned repository at .mrw/state/repos/${repoDirName}/ is now orphaned (no services reference it).`));
          }
        }
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
    .option('--path <path>', 'Service path within the repository (use "" to clear)')
    .description('Update a service in the workspace')
    .action((name: string, options: { repo?: string; branch?: string; language?: string; description?: string; path?: string }) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const updates: Record<string, string | undefined> = {};
      if (options.repo) updates.repo = options.repo;
      if (options.branch) updates.branch = options.branch;
      if (options.language) updates.language = options.language;
      if (options.description) updates.description = options.description;

      // Handle --path: empty string clears the path field
      if (options.path !== undefined) {
        if (options.path === '') {
          updates.path = undefined;
        } else {
          updates.path = options.path;
        }
      }

      if (Object.keys(updates).length === 0) {
        console.log(chalk.yellow('No updates specified. Use --repo, --branch, --language, --description, or --path.'));
        return;
      }

      if (!updateService(config, name, updates)) {
        console.log(chalk.red(`Service "${name}" not found in workspace.yaml.`));
        return;
      }

      saveWorkspace(cwd, config);
      const changedFields = Object.keys(updates).join(', ');
      console.log(chalk.green(`Service "${name}" updated: ${changedFields}`));
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

serviceCommand.addCommand(
  new Command('list')
    .description('List all services in the workspace')
    .action(() => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const serviceNames = Object.keys(config.services);
      if (serviceNames.length === 0) {
        console.log(chalk.dim('No services registered in this workspace.'));
        return;
      }

      for (const name of serviceNames) {
        const service = config.services[name];
        const pathIndicator = service.path ? chalk.dim(` ./${service.path}`) : '';
        console.log(`  ${chalk.green('●')} ${name}${pathIndicator}`);
        console.log(chalk.dim(`    repo: ${service.repo}`));
        console.log(chalk.dim(`    branch: ${service.branch}`));
        if (service.language) {
          console.log(chalk.dim(`    language: ${service.language}`));
        }
      }
    })
);
