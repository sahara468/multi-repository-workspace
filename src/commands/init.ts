import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { saveWorkspace, loadServiceFile, importServices, type WorkspaceConfig } from '../lib/workspace.js';

export const initCommand = new Command('init')
  .description('Initialize a new MRW workspace in the current directory')
  .option('--from-template <template>', 'Initialize from a template')
  .option('--services-file <path>', 'Import services from a YAML file (default: services.yaml)')
  .action(async (options: { fromTemplate?: string; servicesFile?: string }) => {
    const cwd = process.cwd();
    const workspacePath = path.join(cwd, 'workspace.yaml');

    if (fs.existsSync(workspacePath)) {
      console.log(chalk.yellow('Workspace already exists in this directory.'));
      return;
    }

    if (options.fromTemplate) {
      await initFromTemplate(cwd, options.fromTemplate);
      return;
    }

    await initInteractive(cwd, options.servicesFile);
  });

async function initInteractive(cwd: string, servicesFile?: string): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Workspace name:',
      validate: (v: string) => v.trim() ? true : 'Name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Business domain:',
    },
  ]);

  const config: WorkspaceConfig = {
    version: 1,
    workspace: {
      name: answers.name,
      description: answers.description || undefined,
      domain: answers.domain || undefined,
    },
    services: {},
  };

  // Import services from file if available
  const servicesFilePath = servicesFile
    ? path.resolve(cwd, servicesFile)
    : path.join(cwd, 'services.yaml');

  if (fs.existsSync(servicesFilePath)) {
    const spinner = ora(`Importing services from ${path.basename(servicesFilePath)}...`).start();
    try {
      const serviceFile = loadServiceFile(servicesFilePath);
      const result = importServices(config, serviceFile.services);
      spinner.succeed(
        chalk.green(`Imported ${result.added.length + result.updated.length} service(s) from ${path.basename(servicesFilePath)}`)
      );
      if (result.added.length > 0) {
        console.log(chalk.dim(`  Added: ${result.added.join(', ')}`));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      spinner.warn(chalk.yellow(`Failed to import services: ${message}`));
    }
  } else if (servicesFile) {
    console.log(chalk.yellow(`Services file "${servicesFile}" not found.`));
  }

  const spinner = ora('Creating workspace...').start();

  // Create directory structure
  fs.mkdirSync(path.join(cwd, '.mrw/state/repos'), { recursive: true });

  // Create .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (!gitignoreContent.includes('.mrw/state/')) {
    const updated = gitignoreContent
      ? gitignoreContent.trimEnd() + '\n.mrw/state/\n'
      : '.mrw/state/\n';
    fs.writeFileSync(gitignorePath, updated);
  }

  // Write workspace.yaml
  saveWorkspace(cwd, config);

  spinner.succeed(chalk.green('Workspace initialized!'));
  console.log(chalk.dim(`  Created workspace.yaml with ${Object.keys(config.services).length} service(s)`));
  console.log(chalk.dim('  Run `mrw sync` to clone service repositories'));
}

async function initFromTemplate(cwd: string, templateName: string): Promise<void> {
  const templates: Record<string, { workspace: WorkspaceConfig['workspace']; services: WorkspaceConfig['services'] }> = {
    'microservice-java': {
      workspace: { name: templateName, description: 'Java microservice workspace', domain: 'backend' },
      services: {
        'api-gateway': { repo: 'https://github.com/example/api-gateway.git', branch: 'main', language: 'java', description: 'API Gateway' },
        'user-service': { repo: 'https://github.com/example/user-service.git', branch: 'main', language: 'java', description: 'User Service' },
        'order-service': { repo: 'https://github.com/example/order-service.git', branch: 'main', language: 'java', description: 'Order Service' },
      },
    },
    'microservice-go': {
      workspace: { name: templateName, description: 'Go microservice workspace', domain: 'backend' },
      services: {
        'api-gateway': { repo: 'https://github.com/example/api-gateway.git', branch: 'main', language: 'go', description: 'API Gateway' },
        'user-service': { repo: 'https://github.com/example/user-service.git', branch: 'main', language: 'go', description: 'User Service' },
      },
    },
  };

  const template = templates[templateName];
  if (!template) {
    console.log(chalk.red(`Template "${templateName}" not found. Available: ${Object.keys(templates).join(', ')}`));
    return;
  }

  const config: WorkspaceConfig = {
    version: 1,
    workspace: template.workspace,
    services: template.services,
  };

  const spinner = ora(`Creating workspace from template "${templateName}"...`).start();

  // Create directory structure
  fs.mkdirSync(path.join(cwd, '.mrw/state/repos'), { recursive: true });

  // Create .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (!gitignoreContent.includes('.mrw/state/')) {
    const updated = gitignoreContent
      ? gitignoreContent.trimEnd() + '\n.mrw/state/\n'
      : '.mrw/state/\n';
    fs.writeFileSync(gitignorePath, updated);
  }

  saveWorkspace(cwd, config);

  spinner.succeed(chalk.green(`Workspace initialized from template "${templateName}"!`));
  console.log(chalk.dim(`  Created workspace.yaml with ${Object.keys(config.services).length} service(s)`));
  console.log(chalk.dim('  Run `mrw sync` to clone service repositories'));
}
