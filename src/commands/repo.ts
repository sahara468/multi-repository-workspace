import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace, getRepoIndex } from '../lib/workspace.js';

export const repoCommand = new Command('repo')
  .description('Manage repositories in the workspace');

repoCommand.addCommand(
  new Command('list')
    .description('List all repositories in the workspace')
    .action(() => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const index = getRepoIndex(config);
      if (index.size === 0) {
        console.log(chalk.dim('No repositories in this workspace.'));
        return;
      }

      for (const [repoName, entry] of index) {
        const repoDir = path.join(cwd, '.mrw', 'state', 'repos', repoName);
        const cloned = fs.existsSync(repoDir);
        const statusIcon = cloned ? chalk.green('●') : chalk.yellow('○');
        const svcList = entry.services.join(', ');

        console.log(`  ${statusIcon} ${repoName}`);
        console.log(chalk.dim(`    url: ${entry.url}`));
        console.log(chalk.dim(`    branch: ${entry.branch}`));
        console.log(chalk.dim(`    services: ${svcList}`));
        if (!cloned) {
          console.log(chalk.dim(`    status: not cloned`));
        }
      }
    })
);

repoCommand.addCommand(
  new Command('status')
    .description('Show clone state and branch status for each repository')
    .action(async () => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
      const index = getRepoIndex(config);

      if (index.size === 0) {
        console.log(chalk.dim('No repositories in this workspace.'));
        return;
      }

      for (const [repoName, entry] of index) {
        const repoDir = path.join(reposDir, repoName);
        const svcList = entry.services.join(', ');

        if (!fs.existsSync(repoDir)) {
          console.log(`  ${chalk.yellow('○')} ${repoName} ${chalk.dim(`[${svcList}] — not cloned`)}`);
          console.log();
          continue;
        }

        try {
          const git = simpleGit(repoDir);
          const branchSummary = await git.branch();
          const status = await git.status();
          const currentBranch = branchSummary.current;
          const isClean = status.isClean();

          const branchDisplay = currentBranch === entry.branch
            ? currentBranch
            : chalk.yellow(currentBranch);

          const dirtyIndicator = isClean ? '' : chalk.red(' (uncommitted changes)');

          console.log(`  ${chalk.green('●')} ${repoName} ${chalk.dim(`[${svcList}]`)} ${chalk.dim(`[${branchDisplay}]`)}${dirtyIndicator}`);
        } catch {
          console.log(`  ${chalk.red('✗')} ${repoName} ${chalk.dim(`[${svcList}] — error reading repo`)}`);
        }

        console.log();
      }
    })
);
