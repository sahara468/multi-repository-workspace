import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { saveWorkspace, loadServiceFile, importServices, deriveRepoName, type WorkspaceConfig } from '../lib/workspace.js';

export const initCommand = new Command('init')
  .description('Initialize a new MRW workspace')
  .argument('[directory]', 'Directory to create and initialize the workspace in (defaults to workspace name)')
  .option('--from-arch <repo-url>', 'Initialize from a service architecture design repo')
  .option('--arch-branch <branch>', 'Branch for the arch repo (default: main)', 'main')
  .option('--services-file <path>', 'Import services from a YAML file (default: services.yaml)')
  .option('--name <string>', 'Workspace name (defaults to directory name)')
  .option('--description <string>', 'Workspace description')
  .action(async (directory: string | undefined, options: {
    fromArch?: string;
    archBranch?: string;
    servicesFile?: string;
    name?: string;
    description?: string;
  }) => {
    if (options.fromArch) {
      await initFromArch(directory, options.fromArch, options.archBranch ?? 'main', options);
      return;
    }

    await initPlain(directory, options);
  });

async function initPlain(directory: string | undefined, options: {
  name?: string;
  description?: string;
  servicesFile?: string;
}): Promise<void> {
  const isInteractive = process.stdin.isTTY ?? false;

  let workspaceName = options.name;
  let workspaceDescription = options.description;

  // Determine workspace name: --name > directory arg > prompt
  if (!workspaceName && directory) {
    workspaceName = path.basename(path.resolve(directory));
  }

  if (!workspaceName) {
    if (isInteractive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Workspace name:',
          validate: (v: string) => v.trim() ? true : 'Name is required',
        },
      ]);
      workspaceName = answers.name;
    } else {
      console.log(chalk.red('Workspace name is required in non-interactive mode. Use --name <name>'));
      process.exit(1);
      return;
    }
  }

  if (!workspaceName) {
    return;
  }

  if (!workspaceDescription && isInteractive) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
      },
    ]);
    workspaceDescription = answers.description || undefined;
  }

  // Directory: explicit arg > name-based
  const baseCwd = process.cwd();
  const cwd = directory
    ? path.resolve(baseCwd, directory)
    : path.join(baseCwd, workspaceName);

  const workspacePath = path.join(cwd, 'workspace.yaml');

  if (fs.existsSync(workspacePath)) {
    console.log(chalk.yellow(`Workspace already exists in ${cwd}.`));
    return;
  }

  // Create directory
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true });
  }

  const config: WorkspaceConfig = {
    version: 1,
    workspace: {
      name: workspaceName,
      description: workspaceDescription,
    },
    services: {},
  };

  // Import services from file if available
  const servicesFilePath = options.servicesFile
    ? path.resolve(cwd, options.servicesFile)
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
  } else if (options.servicesFile) {
    console.log(chalk.yellow(`Services file "${options.servicesFile}" not found.`));
  }

  const spinner = ora('Creating workspace...').start();

  // Create directory structure
  fs.mkdirSync(path.join(cwd, 'repos'), { recursive: true });

  // Create .gitignore
  createGitignore(cwd);

  // Write workspace.yaml
  saveWorkspace(cwd, config);

  spinner.succeed(chalk.green('Workspace initialized!'));
  console.log(chalk.dim(`  Created ${cwd}`));
  const cdPath = path.relative(baseCwd, cwd) || '.';
  console.log(chalk.dim(`  Run "cd ${cdPath} && mrw sync" to clone service repositories`));
}

async function initFromArch(directory: string | undefined, repoUrl: string, branch: string, options: {
  name?: string;
  description?: string;
}): Promise<void> {
  const archRepoName = deriveRepoName(repoUrl);

  // Workspace name: --name > directory basename > derived from repo URL
  const workspaceName = options.name ?? (directory ? path.basename(path.resolve(directory)) : archRepoName);

  // Directory: explicit arg > name-based
  const baseCwd = process.cwd();
  const cwd = directory
    ? path.resolve(baseCwd, directory)
    : path.join(baseCwd, workspaceName);

  const workspacePath = path.join(cwd, 'workspace.yaml');

  if (fs.existsSync(workspacePath)) {
    console.log(chalk.yellow(`Workspace already exists in ${cwd}.`));
    return;
  }

  // Create directory
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true });
  }

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
    workspace: {
      name: workspaceName,
      description: options.description,
    },
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
  createGitignore(cwd);

  // Write workspace.yaml
  saveWorkspace(cwd, config);

  console.log(chalk.green('Design-driven workspace initialized!'));
  console.log(chalk.dim(`  Created ${cwd}`));
  console.log(chalk.dim(`  Arch repo: ${archRepoName}/`));
  console.log(chalk.dim(`  Services: ${Object.keys(config.services).length}`));
  const cdPath = path.relative(baseCwd, cwd) || '.';
  console.log(chalk.dim(`  Run "cd ${cdPath} && mrw sync" to clone service repositories`));
}

function createGitignore(cwd: string): void {
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
}
