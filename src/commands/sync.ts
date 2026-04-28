import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace } from '../lib/workspace.js';

export const syncCommand = new Command('sync')
  .description('Clone or pull service repositories')
  .argument('[service]', 'Sync a specific service only')
  .action(async (serviceName?: string) => {
    const cwd = process.cwd();
    const config = loadWorkspace(cwd);

    if (!config) {
      console.log(chalk.red('No workspace found. Run `mrw init` first.'));
      return;
    }

    const services = serviceName
      ? { [serviceName]: config.services[serviceName] }
      : config.services;

    if (serviceName && !config.services[serviceName]) {
      console.log(chalk.red(`Service "${serviceName}" not found in workspace.yaml`));
      return;
    }

    const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
    fs.mkdirSync(reposDir, { recursive: true });

    const entries = Object.entries(services);
    const results: { name: string; status: string; branch?: string }[] = [];

    for (const [name, service] of entries) {
      const serviceDir = path.join(reposDir, name);
      const spinner = ora(`Syncing ${name}...`).start();

      try {
        if (fs.existsSync(serviceDir)) {
          const git = simpleGit(serviceDir);

          // Check for uncommitted changes
          const status = await git.status();
          if (!status.isClean()) {
            spinner.warn(chalk.yellow(`${name}: skipped (uncommitted changes)`));
            results.push({ name, status: 'dirty' });
            continue;
          }

          await git.pull();
          const currentBranch = (await git.branch()).current;
          spinner.succeed(chalk.green(`${name}: updated (${currentBranch})`));
          results.push({ name, status: 'updated', branch: currentBranch });
        } else {
          await simpleGit().clone(service.repo, serviceDir, ['--branch', service.branch]);
          spinner.succeed(chalk.green(`${name}: cloned (${service.branch})`));
          results.push({ name, status: 'cloned', branch: service.branch });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(chalk.red(`${name}: ${message}`));
        results.push({ name, status: 'failed' });
      }
    }

    // Summary
    console.log();
    console.log(chalk.bold('Sync Summary:'));
    for (const r of results) {
      const icon = r.status === 'cloned' || r.status === 'updated' ? '✓' : r.status === 'dirty' ? '!' : '✗';
      const color = r.status === 'cloned' || r.status === 'updated' ? 'green' : r.status === 'dirty' ? 'yellow' : 'red';
      console.log(`  ${chalk[color](icon)} ${r.name}: ${r.status}${r.branch ? ` (${r.branch})` : ''}`);
    }
  });
