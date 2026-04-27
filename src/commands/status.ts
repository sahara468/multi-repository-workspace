import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace } from '../lib/workspace.js';

export const statusCommand = new Command('status')
  .description('Show workspace status')
  .action(async () => {
    const cwd = process.cwd();
    const config = loadWorkspace(cwd);

    if (!config) {
      console.log(chalk.red('No workspace found. Run `mrw init` first.'));
      return;
    }

    // Workspace info
    console.log(chalk.bold(`Workspace: ${config.workspace.name}`));
    if (config.workspace.description) {
      console.log(chalk.dim(`  ${config.workspace.description}`));
    }
    if (config.workspace.domain) {
      console.log(chalk.dim(`  Domain: ${config.workspace.domain}`));
    }
    console.log();

    // Services
    const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
    const serviceNames = Object.keys(config.services);
    const defaultBranches = new Set(Object.values(config.services).map(s => s.branch));

    console.log(chalk.bold('Services:'));
    for (const name of serviceNames) {
      const service = config.services[name];
      const serviceDir = path.join(reposDir, name);

      if (!fs.existsSync(serviceDir)) {
        console.log(`  ${chalk.yellow('○')} ${name} ${chalk.dim('— not cloned')}`);
        continue;
      }

      try {
        const git = simpleGit(serviceDir);
        const branchSummary = await git.branch();
        const status = await git.status();
        const currentBranch = branchSummary.current;
        const isClean = status.isClean();

        // Highlight if on a different branch than default
        const branchDisplay = currentBranch === service.branch
          ? currentBranch
          : chalk.yellow(currentBranch);

        const dirtyIndicator = isClean ? '' : chalk.red(' (uncommitted changes)');

        console.log(`  ${chalk.green('●')} ${name} ${chalk.dim(`[${branchDisplay}]`)}${dirtyIndicator}`);
      } catch {
        console.log(`  ${chalk.red('✗')} ${name} ${chalk.dim('— error reading repo')}`);
      }
    }

    // Branch divergence warning
    if (defaultBranches.size > 0) {
      const branches = new Map<string, string[]>();
      for (const name of serviceNames) {
        const serviceDir = path.join(reposDir, name);
        if (!fs.existsSync(serviceDir)) continue;
        try {
          const git = simpleGit(serviceDir);
          const currentBranch = (await git.branch()).current;
          if (!branches.has(currentBranch)) branches.set(currentBranch, []);
          branches.get(currentBranch)!.push(name);
        } catch {}
      }

      if (branches.size > 1) {
        console.log();
        console.log(chalk.yellow('⚠ Services are on different branches:'));
        for (const [branch, svcs] of branches) {
          console.log(chalk.dim(`  ${branch}: ${svcs.join(', ')}`));
        }
      }
    }
  });
