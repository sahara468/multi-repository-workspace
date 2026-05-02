import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace, getRepoIndex, getServiceRepoDir, archRepoDir, isDesignDriven } from '../lib/workspace.js';

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
    if (isDesignDriven(config)) {
      console.log(chalk.dim(`  Mode: design-driven`));
    }
    console.log();

    const reposDir = path.join(cwd, 'repos');

    // Arch repo
    if (isDesignDriven(config)) {
      const archPath = archRepoDir(config, cwd);
      const archName = path.basename(archPath);

      console.log(chalk.bold('Arch Repository:'));
      if (!fs.existsSync(archPath)) {
        console.log(`  ${chalk.yellow('○')} ${archName} ${chalk.dim('[arch] — not cloned')}`);
      } else {
        try {
          const git = simpleGit(archPath);
          const branchSummary = await git.branch();
          const status = await git.status();
          const currentBranch = branchSummary.current;
          const isClean = status.isClean();

          const branchDisplay = currentBranch === config.arch!.branch
            ? currentBranch
            : chalk.yellow(currentBranch);

          const dirtyIndicator = isClean ? '' : chalk.red(' (uncommitted changes)');

          console.log(`  ${chalk.green('●')} ${archName} ${chalk.dim('[arch]')} ${chalk.dim(`[${branchDisplay}]`)}${dirtyIndicator}`);
        } catch {
          console.log(`  ${chalk.red('✗')} ${archName} ${chalk.dim('[arch] — error reading repo')}`);
        }
      }
      console.log();
    }

    const index = getRepoIndex(config);

    // Repos
    console.log(chalk.bold('Repositories:'));
    for (const [repoName, entry] of index) {
      const repoDir = path.join(reposDir, repoName);
      const svcList = entry.services.join(', ');

      if (!fs.existsSync(repoDir)) {
        console.log(`  ${chalk.yellow('○')} ${repoName} ${chalk.dim(`[${svcList}] — not cloned`)}`);
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
    }

    // Services detail
    console.log();
    console.log(chalk.bold('Services:'));
    const serviceNames = Object.keys(config.services);

    for (const name of serviceNames) {
      const service = config.services[name];
      const repoDir = getServiceRepoDir(name, config, cwd);

      if (!fs.existsSync(repoDir)) {
        console.log(`  ${chalk.yellow('○')} ${name} ${chalk.dim(`→ ${service.repo}`)} — not cloned`);
        continue;
      }

      try {
        const git = simpleGit(repoDir);
        const branchSummary = await git.branch();
        const status = await git.status();
        const currentBranch = branchSummary.current;
        const isClean = status.isClean();

        const branchDisplay = currentBranch === service.branch
          ? currentBranch
          : chalk.yellow(currentBranch);

        const dirtyIndicator = isClean ? '' : chalk.red(' (uncommitted changes)');
        const pathIndicator = service.path ? chalk.dim(` ./${service.path}`) : '';

        console.log(`  ${chalk.green('●')} ${name}${pathIndicator} ${chalk.dim(`[${branchDisplay}]`)}${dirtyIndicator}`);
      } catch {
        console.log(`  ${chalk.red('✗')} ${name} ${chalk.dim('— error reading repo')}`);
      }
    }

    // Branch divergence warning
    const defaultBranches = new Set(Object.values(config.services).map(s => s.branch));
    if (defaultBranches.size > 0) {
      const branches = new Map<string, string[]>();
      for (const name of serviceNames) {
        const repoDir = getServiceRepoDir(name, config, cwd);
        if (!fs.existsSync(repoDir)) continue;
        try {
          const git = simpleGit(repoDir);
          const currentBranch = (await git.branch()).current;
          if (!branches.has(currentBranch)) branches.set(currentBranch, []);
          branches.get(currentBranch)!.push(name);
        } catch {
          // skip unreadable repos
        }
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
