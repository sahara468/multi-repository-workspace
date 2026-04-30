import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace } from '../lib/workspace.js';

export const resetCommand = new Command('reset')
  .description('Reset services to default branch and initial state')
  .option('--service <name>', 'Reset a specific service only')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options: { service?: string; force?: boolean }) => {
    const cwd = process.cwd();
    const config = loadWorkspace(cwd);

    if (!config) {
      console.log(chalk.red('No workspace found. Run `mrw init` first.'));
      return;
    }

    const services = options.service
      ? { [options.service]: config.services[options.service] }
      : config.services;

    if (options.service && !config.services[options.service]) {
      console.log(chalk.red(`Service "${options.service}" not found in workspace.yaml`));
      return;
    }

    const serviceNames = Object.keys(services);

    if (!options.force) {
      console.log(chalk.yellow('Warning: This will discard all uncommitted changes and untracked files.'));
      console.log(chalk.yellow('Services to reset:'));
      for (const name of serviceNames) {
        console.log(chalk.yellow(`  - ${name} (${services[name].branch})`));
      }
      console.log();

      const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure you want to reset?',
          default: false,
        },
      ]);

      if (!confirmed) {
        console.log(chalk.gray('Reset cancelled.'));
        return;
      }
    }

    const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
    const results: { name: string; status: string; branch?: string }[] = [];

    for (const name of serviceNames) {
      const service = services[name];
      const serviceDir = path.join(reposDir, name);

      if (!fs.existsSync(serviceDir)) {
        console.log(chalk.yellow(`${name}: skipped (not cloned)`));
        results.push({ name, status: 'skipped' });
        continue;
      }

      try {
        const git = simpleGit(serviceDir);

        await git.checkout(service.branch);
        await git.clean('f', ['-d']);
        await git.reset(['--hard', `origin/${service.branch}`]);

        console.log(chalk.green(`${name}: reset (${service.branch})`));
        results.push({ name, status: 'reset', branch: service.branch });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`${name}: ${message}`));
        results.push({ name, status: 'failed' });
      }
    }

    // Summary
    console.log();
    console.log(chalk.bold('Reset Summary:'));
    for (const r of results) {
      const icon = r.status === 'reset' ? '✓' : r.status === 'skipped' ? '!' : '✗';
      const color = r.status === 'reset' ? 'green' : r.status === 'skipped' ? 'yellow' : 'red';
      console.log(`  ${chalk[color](icon)} ${r.name}: ${r.status}${r.branch ? ` (${r.branch})` : ''}`);
    }
  });
