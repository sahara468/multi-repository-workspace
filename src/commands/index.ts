import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import { loadTopology, loadDependencies } from '../lib/cache.js';

export const indexCommand = new Command('index')
  .description('Manage workspace index caches')
  .addCommand(
    new Command('show')
      .argument('<type>', 'Cache type: topology or dependencies')
      .description('Show an index cache')
      .action((type: string) => {
        const cwd = process.cwd();
        const config = loadWorkspace(cwd);

        if (!config) {
          console.log(chalk.red('No workspace found. Run `mrw init` first.'));
          return;
        }

        const indexDir = path.join(cwd, '.mrw', 'state', 'index');

        if (type === 'topology') {
          const entries = loadTopology(indexDir);
          if (entries.length === 0) {
            console.log(chalk.dim('No topology index found.'));
            return;
          }
          for (const entry of entries) {
            const deps = entry.dependsOn.length > 0 ? entry.dependsOn.join(', ') : 'none';
            const callers = entry.calledBy.length > 0 ? entry.calledBy.join(', ') : 'none';
            console.log(`  ${chalk.bold(entry.service)}`);
            console.log(chalk.dim(`    depends on: ${deps}`));
            console.log(chalk.dim(`    called by:  ${callers}`));
          }
        } else if (type === 'dependencies') {
          const entries = loadDependencies(indexDir);
          if (entries.length === 0) {
            console.log(chalk.dim('No dependencies index found.'));
            return;
          }
          for (const entry of entries) {
            const provides = entry.provides.length > 0 ? entry.provides.join(', ') : 'none';
            const consumes = entry.consumes.length > 0 ? entry.consumes.join(', ') : 'none';
            console.log(`  ${chalk.bold(entry.service)}`);
            console.log(chalk.dim(`    provides:  ${provides}`));
            console.log(chalk.dim(`    consumes:  ${consumes}`));
          }
        } else {
          console.log(chalk.red(`Unknown index type "${type}". Use: topology or dependencies`));
        }
      })
  )
  .addCommand(
    new Command('clear')
      .description('Clear all index caches')
      .action(() => {
        const cwd = process.cwd();
        const config = loadWorkspace(cwd);

        if (!config) {
          console.log(chalk.red('No workspace found. Run `mrw init` first.'));
          return;
        }

        const indexDir = path.join(cwd, '.mrw', 'state', 'index');
        if (!fs.existsSync(indexDir)) {
          console.log(chalk.dim('No index caches to clear.'));
          return;
        }

        const files = fs.readdirSync(indexDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          fs.unlinkSync(path.join(indexDir, file));
        }

        console.log(chalk.green(`Cleared ${files.length} index cache(s).`));
      })
  );
