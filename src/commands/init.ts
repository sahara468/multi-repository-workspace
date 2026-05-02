import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { saveWorkspace, loadServiceFile, importServices, deriveRepoName, type WorkspaceConfig } from '../lib/workspace.js';

export const initCommand = new Command('init')
  .description('Initialize a new MRW workspace in the current directory')
  .option('--from-template <template>', 'Initialize from a template')
  .option('--from-arch <repo-url>', 'Initialize from a service architecture design repo')
  .option('--arch-branch <branch>', 'Branch for the arch repo (default: main)', 'main')
  .option('--services-file <path>', 'Import services from a YAML file (default: services.yaml)')
  .action(async (options: { fromTemplate?: string; fromArch?: string; archBranch?: string; servicesFile?: string }) => {
    const cwd = process.cwd();
    const workspacePath = path.join(cwd, 'workspace.yaml');

    if (fs.existsSync(workspacePath)) {
      console.log(chalk.yellow('Workspace already exists in this directory.'));
      return;
    }

    if (options.fromArch) {
      await initFromArch(cwd, options.fromArch, options.archBranch ?? 'main');
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
  fs.mkdirSync(path.join(cwd, 'repos'), { recursive: true });

  // Create .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (!gitignoreContent.includes('.mrw/')) {
    const updated = gitignoreContent
      ? gitignoreContent.trimEnd() + '\n.mrw/\n'
      : '.mrw/\n';
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
  fs.mkdirSync(path.join(cwd, 'repos'), { recursive: true });

  // Create .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (!gitignoreContent.includes('.mrw/')) {
    const updated = gitignoreContent
      ? gitignoreContent.trimEnd() + '\n.mrw/\n'
      : '.mrw/\n';
    fs.writeFileSync(gitignorePath, updated);
  }

  saveWorkspace(cwd, config);

  spinner.succeed(chalk.green(`Workspace initialized from template "${templateName}"!`));
  console.log(chalk.dim(`  Created workspace.yaml with ${Object.keys(config.services).length} service(s)`));
  console.log(chalk.dim('  Run `mrw sync` to clone service repositories'));
}

async function initFromArch(cwd: string, repoUrl: string, branch: string): Promise<void> {
  const archRepoName = deriveRepoName(repoUrl);
  const archRepoPath = path.join(cwd, archRepoName);

  // Clone the arch repo
  const cloneSpinner = ora(`Cloning arch repo ${archRepoName}...`).start();
  try {
    await simpleGit().clone(repoUrl, archRepoPath, ['--branch', branch]);
    cloneSpinner.succeed(chalk.green(`Cloned arch repo: ${archRepoName} (${branch})`));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    cloneSpinner.fail(chalk.red(`Failed to clone arch repo: ${message}`));
    return;
  }

  // Validate: services.yaml is required
  const servicesYamlPath = path.join(archRepoPath, 'services.yaml');
  if (!fs.existsSync(servicesYamlPath)) {
    console.log(chalk.red(`Arch repo must contain services.yaml at its root.`));
    fs.rmSync(archRepoPath, { recursive: true, force: true });
    return;
  }

  // Warn about missing convention directories
  const specsDir = path.join(archRepoPath, 'specs');
  const archDir = path.join(archRepoPath, 'arch');
  if (!fs.existsSync(specsDir)) {
    console.log(chalk.yellow(`Warning: arch repo is missing "specs/" directory (convention)`));
  }
  if (!fs.existsSync(archDir)) {
    console.log(chalk.yellow(`Warning: arch repo is missing "arch/" directory (convention)`));
  }

  // Import services from arch repo's services.yaml
  const config: WorkspaceConfig = {
    version: 1,
    workspace: { name: archRepoName },
    services: {},
    arch: { repo: repoUrl, branch },
  };

  const importSpinner = ora('Importing services from arch repo...').start();
  try {
    const serviceFile = loadServiceFile(servicesYamlPath);
    const result = importServices(config, serviceFile.services);
    importSpinner.succeed(
      chalk.green(`Imported ${result.added.length + result.updated.length} service(s) from arch repo`)
    );
    if (result.added.length > 0) {
      console.log(chalk.dim(`  Added: ${result.added.join(', ')}`));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    importSpinner.warn(chalk.yellow(`Failed to import services: ${message}`));
  }

  // Create directory structure
  fs.mkdirSync(path.join(cwd, 'repos'), { recursive: true });

  // Create .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (!gitignoreContent.includes('.mrw/')) {
    const updated = gitignoreContent
      ? gitignoreContent.trimEnd() + '\n.mrw/\n'
      : '.mrw/\n';
    fs.writeFileSync(gitignorePath, updated);
  }

  // Write workspace.yaml
  saveWorkspace(cwd, config);

  console.log(chalk.green('Design-driven workspace initialized!'));
  console.log(chalk.dim(`  Arch repo: ${archRepoName}/`));
  console.log(chalk.dim(`  Services: ${Object.keys(config.services).length}`));
  console.log(chalk.dim('  Run `mrw sync` to clone service repositories'));
}
