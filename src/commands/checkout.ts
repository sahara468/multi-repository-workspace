import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace } from '../lib/workspace.js';

export const checkoutCommand = new Command('checkout')
  .description('Switch branches across service repositories')
  .argument('<branch>', 'Branch name to checkout')
  .option('--services <services>', 'Comma-separated list of services')
  .action(async (branchName: string, options: { services?: string }) => {
    const cwd = process.cwd();
    const config = loadWorkspace(cwd);

    if (!config) {
      console.log(chalk.red('No workspace found. Run `mrw init` first.'));
      return;
    }

    const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
    const targetServices = options.services
      ? options.services.split(',').map(s => s.trim())
      : Object.keys(config.services);

    for (const name of targetServices) {
      if (!config.services[name]) {
        console.log(chalk.yellow(`Service "${name}" not found in workspace.yaml, skipping.`));
        continue;
      }

      const serviceDir = path.join(reposDir, name);
      if (!fs.existsSync(serviceDir)) {
        console.log(chalk.yellow(`${name}: not cloned, skipping.`));
        continue;
      }

      try {
        const git = simpleGit(serviceDir);
        const status = await git.status();

        if (!status.isClean()) {
          console.log(chalk.yellow(`${name}: skipped (uncommitted changes)`));
          continue;
        }

        await git.checkout(branchName);
        console.log(chalk.green(`${name}: switched to "${branchName}"`));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('did not match any file')) {
          console.log(chalk.red(`${name}: branch "${branchName}" not found`));
        } else {
          console.log(chalk.red(`${name}: ${message}`));
        }
      }
    }
  });
