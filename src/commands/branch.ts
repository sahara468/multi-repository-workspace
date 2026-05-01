import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace, getRepoIndex } from '../lib/workspace.js';

export const branchCommand = new Command('branch')
  .description('Manage branches across service repositories')
  .addCommand(
    new Command('create')
      .argument('<name>', 'Branch name')
      .option('--services <services>', 'Comma-separated list of services')
      .action(async (branchName: string, options: { services?: string }) => {
        const cwd = process.cwd();
        const config = loadWorkspace(cwd);

        if (!config) {
          console.log(chalk.red('No workspace found. Run `mrw init` first.'));
          return;
        }

        const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
        const index = getRepoIndex(config);
        const targetServices = options.services
          ? options.services.split(',').map(s => s.trim())
          : Object.keys(config.services);

        // Build set of target service names for filtering
        const targetSet = new Set(targetServices);

        // Track which repos we've already operated on (avoid duplicate operations)
        const processedRepos = new Set<string>();

        for (const name of targetServices) {
          if (!config.services[name]) {
            console.log(chalk.yellow(`Service "${name}" not found in workspace.yaml, skipping.`));
            continue;
          }

          // Find the repo entry for this service
          let repoName: string | undefined;
          let repoDir: string | undefined;
          for (const [rName, entry] of index) {
            if (entry.services.includes(name)) {
              repoName = rName;
              repoDir = path.join(reposDir, rName);
              break;
            }
          }

          if (!repoName || !repoDir) {
            console.log(chalk.yellow(`${name}: could not resolve repo, skipping.`));
            continue;
          }

          // Skip if we already processed this repo
          if (processedRepos.has(repoName)) {
            continue;
          }
          processedRepos.add(repoName);

          // Get all target services in this repo for display
          const repoServices = index.get(repoName)!.services.filter(s => targetSet.has(s));

          if (!fs.existsSync(repoDir)) {
            console.log(chalk.yellow(`${repoName} (${repoServices.join(', ')}): not cloned, skipping.`));
            continue;
          }

          try {
            const git = simpleGit(repoDir);
            const status = await git.status();

            if (!status.isClean()) {
              console.log(chalk.yellow(`${repoName} (${repoServices.join(', ')}): skipped (uncommitted changes)`));
              continue;
            }

            await git.checkoutLocalBranch(branchName);
            console.log(chalk.green(`${repoName} (${repoServices.join(', ')}): created branch "${branchName}"`));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('already exists')) {
              console.log(chalk.yellow(`${repoName} (${repoServices.join(', ')}): branch "${branchName}" already exists`));
            } else {
              console.log(chalk.red(`${repoName} (${repoServices.join(', ')}): ${message}`));
            }
          }
        }
      })
  );
