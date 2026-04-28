import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { saveWorkspace, type WorkspaceConfig } from '../lib/workspace.js';

export const initCommand = new Command('init')
  .description('Initialize a new MRW workspace in the current directory')
  .option('--from-template <template>', 'Initialize from a template')
  .action(async (options) => {
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

    await initInteractive(cwd);
  });

async function initInteractive(cwd: string): Promise<void> {
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

  const services: WorkspaceConfig['services'] = {};

  let addMore = true;
  while (addMore) {
    const { addService } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addService',
        message: 'Add a service?',
        default: true,
      },
    ]);

    if (!addService) {
      addMore = false;
      continue;
    }

    const serviceAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Service name:',
        validate: (v: string) => v.trim() ? true : 'Service name is required',
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Git repository URL:',
        validate: (v: string) => v.trim() ? true : 'Repo URL is required',
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Default branch:',
        default: 'main',
      },
      {
        type: 'input',
        name: 'language',
        message: 'Language (optional):',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
    ]);

    services[serviceAnswers.name] = {
      repo: serviceAnswers.repo,
      branch: serviceAnswers.branch,
      ...(serviceAnswers.language && { language: serviceAnswers.language }),
      ...(serviceAnswers.description && { description: serviceAnswers.description }),
    };
  }

  const config: WorkspaceConfig = {
    version: 1,
    workspace: {
      name: answers.name,
      description: answers.description,
      domain: answers.domain,
    },
    services,
  };

  const spinner = ora('Creating workspace...').start();

  // Create directory structure
  const dirs = [
    '.mrw/state/repos',
    '.mrw/state/index',
    '.mrw/changes',
    'specs/capabilities',
    'specs/entries',
    'specs/constraints',
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(cwd, dir), { recursive: true });
  }

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
  console.log(chalk.dim(`  Created workspace.yaml with ${Object.keys(services).length} service(s)`));
  console.log(chalk.dim('  Run `mrw sync` to clone service repositories'));
}

async function initFromTemplate(cwd: string, templateName: string): Promise<void> {
  console.log(chalk.yellow('--from-template is not yet implemented'));
  console.log(chalk.dim(`  Template "${templateName}" requested`));
}
