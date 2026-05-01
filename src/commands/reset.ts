import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace, getRepoIndex } from '../lib/workspace.js';

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

    if (options.service && !config.services[options.service]) {
      console.log(chalk.red(`Service "${options.service}" not found in workspace.yaml`));
      return;
    }

    const fullIndex = getRepoIndex(config);

    // Filter to repos containing the target service
    const index = options.service
      ? new Map([...fullIndex].filter(([, entry]) => entry.services.includes(options.service!)))
      : fullIndex;

    const repoEntries = [...index.entries()];

    if (!options.force) {
      console.log(chalk.yellow('Warning: This will discard all uncommitted changes and untracked files.'));
      console.log(chalk.yellow('Repos to reset:'));
      for (const [repoName, entry] of repoEntries) {
        const svcList = entry.services.join(', ');
        console.log(chalk.yellow(`  - ${repoName} (${entry.branch}) [${svcList}]`));
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
    const results: { repoName: string; services: string[]; status: string; branch?: string }[] = [];

    for (const [repoName, entry] of repoEntries) {
      const repoDir = path.join(reposDir, repoName);
      const svcList = entry.services.join(', ');

      if (!fs.existsSync(repoDir)) {
        console.log(chalk.yellow(`${repoName} (${svcList}): skipped (not cloned)`));
        results.push({ repoName, services: entry.services, status: 'skipped' });
        continue;
      }

      try {
        const git = simpleGit(repoDir);

        await git.checkout(entry.branch);
        await git.clean('f', ['-d']);
        await git.reset(['--hard', `origin/${entry.branch}`]);

        console.log(chalk.green(`${repoName} (${svcList}): reset (${entry.branch})`));
        results.push({ repoName, services: entry.services, status: 'reset', branch: entry.branch });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`${repoName} (${svcList}): ${message}`));
        results.push({ repoName, services: entry.services, status: 'failed' });
      }
    }

    // Summary
    console.log();
    console.log(chalk.bold('Reset Summary:'));
    for (const r of results) {
      const icon = r.status === 'reset' ? '✓' : r.status === 'skipped' ? '!' : '✗';
      const color = r.status === 'reset' ? 'green' : r.status === 'skipped' ? 'yellow' : 'red';
      const svcList = r.services.length > 1 ? ` → ${r.services.join(', ')}` : '';
      console.log(`  ${chalk[color](icon)} ${r.repoName}: ${r.status}${r.branch ? ` (${r.branch})` : ''}${svcList}`);
    }
  });
