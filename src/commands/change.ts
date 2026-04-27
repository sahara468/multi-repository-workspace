import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';

export const changeCommand = new Command('change')
  .description('Manage cross-service changes');

changeCommand.addCommand(
  new Command('propose')
    .argument('<name>', 'Change name')
    .description('Create a cross-service change proposal')
    .action((name: string) => {
      const cwd = process.cwd();
      const config = loadWorkspace(cwd);

      if (!config) {
        console.log(chalk.red('No workspace found. Run `mrw init` first.'));
        return;
      }

      const changeDir = path.join(cwd, '.mrw', 'changes', name);
      if (fs.existsSync(changeDir)) {
        console.log(chalk.yellow(`Change "${name}" already exists.`));
        return;
      }

      fs.mkdirSync(changeDir, { recursive: true });

      // Build services table
      const serviceRows = Object.keys(config.services)
        .map(s => `| ${s} | | |`)
        .join('\n');

      const proposal = `# Proposal: ${name}

## Overview

<!-- Describe the change overview here -->

## Affected Services

| Service | Impact Type | Priority |
|---------|------------|----------|
${serviceRows}

## Cross-Service Impact

<!-- Describe cross-service interactions and dependencies -->

## Dependency Topology

<!-- Describe the order of changes based on service dependencies -->

## Split Strategy

<!-- Describe how to decompose the change across services -->
`;

      fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposal);
      console.log(chalk.green(`Created change proposal: ${changeDir}`));
    })
);

changeCommand.addCommand(
  new Command('list')
    .description('List all active changes')
    .action(() => {
      const cwd = process.cwd();
      const changesDir = path.join(cwd, '.mrw', 'changes');

      if (!fs.existsSync(changesDir)) {
        console.log(chalk.dim('No active changes.'));
        return;
      }

      const entries = fs.readdirSync(changesDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      if (entries.length === 0) {
        console.log(chalk.dim('No active changes.'));
        return;
      }

      console.log(chalk.bold('Active Changes:'));
      for (const entry of entries) {
        const proposalPath = path.join(changesDir, entry.name, 'proposal.md');
        let description = '';
        if (fs.existsSync(proposalPath)) {
          const content = fs.readFileSync(proposalPath, 'utf-8');
          const overviewMatch = content.match(/## Overview\s*\n\s*(.+)/);
          description = overviewMatch ? overviewMatch[1].trim() : '';
        }
        console.log(`  ${entry.name}${description ? chalk.dim(` — ${description}`) : ''}`);
      }
    })
);

changeCommand.addCommand(
  new Command('design')
    .argument('<name>', 'Change name')
    .description('Create a cross-service design document')
    .action((name: string) => {
      const cwd = process.cwd();
      const designPath = path.join(cwd, '.mrw', 'changes', name, 'design.md');

      if (fs.existsSync(designPath)) {
        console.log(chalk.yellow(`Design for "${name}" already exists.`));
        return;
      }

      const changeDir = path.join(cwd, '.mrw', 'changes', name);
      if (!fs.existsSync(changeDir)) {
        console.log(chalk.red(`Change "${name}" not found. Run \`mrw change propose ${name}\` first.`));
        return;
      }

      const template = `# Design: ${name}

## Cross-Service Interaction Design

<!-- Describe how services interact for this change -->

## Per-Service Design Scope

<!-- For each affected service, describe the design scope -->

## Interface Contracts

<!-- Define contracts between services (APIs, events, schemas) -->
`;

      fs.writeFileSync(designPath, template);
      console.log(chalk.green(`Created design: ${designPath}`));
    })
);

changeCommand.addCommand(
  new Command('tasks')
    .argument('<name>', 'Change name')
    .description('Create per-service task decomposition')
    .action((name: string) => {
      const cwd = process.cwd();
      const tasksPath = path.join(cwd, '.mrw', 'changes', name, 'tasks.md');

      if (fs.existsSync(tasksPath)) {
        console.log(chalk.yellow(`Tasks for "${name}" already exists.`));
        return;
      }

      const changeDir = path.join(cwd, '.mrw', 'changes', name);
      if (!fs.existsSync(changeDir)) {
        console.log(chalk.red(`Change "${name}" not found. Run \`mrw change propose ${name}\` first.`));
        return;
      }

      const config = loadWorkspace(cwd);
      const serviceSections = config
        ? Object.keys(config.services)
            .map(s => `## ${s}\n\n- [ ] Task 1\n- [ ] Task 2\n`)
            .join('\n')
        : '<!-- Add per-service task sections -->\n';

      const template = `# Tasks: ${name}

${serviceSections}
## Cross-Service Coordination

- [ ] Coordinate change deployment order
- [ ] Verify cross-service interface compatibility
`;

      fs.writeFileSync(tasksPath, template);
      console.log(chalk.green(`Created tasks: ${tasksPath}`));
    })
);
