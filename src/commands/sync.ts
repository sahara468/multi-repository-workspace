import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import simpleGit from 'simple-git';
import { loadWorkspace, getRepoIndex } from '../lib/workspace.js';

export const syncCommand = new Command('sync')
  .description('Clone or pull service repositories')
  .argument('[service]', 'Sync a specific service only')
  .option('--depth <n>', 'Shallow clone depth (positive integer)')
  .action(async (serviceName?: string, options?: { depth?: string }) => {
    let depth: number | undefined;
    if (options?.depth !== undefined) {
      depth = Number(options.depth);
      if (!Number.isInteger(depth) || depth < 1) {
        console.log(chalk.red('--depth must be a positive integer'));
        return;
      }
    }
    const cwd = process.cwd();
    const config = loadWorkspace(cwd);

    if (!config) {
      console.log(chalk.red('No workspace found. Run `mrw init` first.'));
      return;
    }

    if (serviceName && !config.services[serviceName]) {
      console.log(chalk.red(`Service "${serviceName}" not found in workspace.yaml`));
      return;
    }

    const reposDir = path.join(cwd, '.mrw', 'state', 'repos');
    fs.mkdirSync(reposDir, { recursive: true });

    const fullIndex = getRepoIndex(config);

    // Filter repos to only those containing the target service
    const index = serviceName
      ? new Map([...fullIndex].filter(([, entry]) => entry.services.includes(serviceName)))
      : fullIndex;

    // Check for branch conflicts
    for (const [repoName, entry] of index) {
      const branches = new Set<string>();
      for (const svc of entry.services) {
        branches.add(config.services[svc].branch);
      }
      if (branches.size > 1) {
        const conflicting = entry.services
          .filter(s => config.services[s].branch !== entry.branch)
          .map(s => `${s} (${config.services[s].branch})`);
        console.log(chalk.yellow(`Warning: repo "${repoName}" has conflicting branches: ${entry.branch} vs ${conflicting.join(', ')}. Using "${entry.branch}" for clone.`));
      }
    }

    const results: { repoName: string; services: string[]; status: string; branch?: string }[] = [];

    for (const [repoName, entry] of index) {
      const repoDir = path.join(reposDir, repoName);
      const serviceLabel = entry.services.length > 1
        ? `${entry.services.join(', ')}`
        : entry.services[0];
      const spinner = ora(`Syncing ${repoName} (${serviceLabel})...`).start();

      try {
        if (fs.existsSync(repoDir)) {
          const git = simpleGit(repoDir);

          // Check for uncommitted changes
          const status = await git.status();
          if (!status.isClean()) {
            spinner.warn(chalk.yellow(`${repoName}: skipped (uncommitted changes)`));
            results.push({ repoName, services: entry.services, status: 'dirty' });
            continue;
          }

          await git.pull();
          const currentBranch = (await git.branch()).current;
          spinner.succeed(chalk.green(`${repoName}: updated (${currentBranch}) [${serviceLabel}]`));
          results.push({ repoName, services: entry.services, status: 'updated', branch: currentBranch });
        } else {
          const cloneArgs = ['--branch', entry.branch];
          if (depth) {
            cloneArgs.push('--depth', String(depth));
          }
          await simpleGit().clone(entry.url, repoDir, cloneArgs);
          const depthLabel = depth ? `, depth ${depth}` : '';
          spinner.succeed(chalk.green(`${repoName}: cloned (${entry.branch}${depthLabel}) [${serviceLabel}]`));
          results.push({ repoName, services: entry.services, status: 'cloned', branch: entry.branch });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        spinner.fail(chalk.red(`${repoName}: ${message}`));
        results.push({ repoName, services: entry.services, status: 'failed' });
      }
    }

    // Summary
    console.log();
    console.log(chalk.bold('Sync Summary:'));
    for (const r of results) {
      const icon = r.status === 'cloned' || r.status === 'updated' ? '✓' : r.status === 'dirty' ? '!' : '✗';
      const color = r.status === 'cloned' || r.status === 'updated' ? 'green' : r.status === 'dirty' ? 'yellow' : 'red';
      const svcList = r.services.length > 1 ? ` → ${r.services.join(', ')}` : '';
      console.log(`  ${chalk[color](icon)} ${r.repoName}: ${r.status}${r.branch ? ` (${r.branch})` : ''}${svcList}`);
    }
  });
