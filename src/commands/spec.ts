import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const specCommand = new Command('spec')
  .description('Manage workspace-level specifications');

specCommand.addCommand(
  new Command('list')
    .description('List all workspace specs')
    .action(() => {
      const cwd = process.cwd();
      const specsDir = path.join(cwd, 'specs');

      if (!fs.existsSync(specsDir)) {
        console.log(chalk.yellow('No specs directory found. Run `mrw init` first.'));
        return;
      }

      const types = ['capabilities', 'entries', 'constraints'] as const;
      let found = false;

      for (const type of types) {
        const dir = path.join(specsDir, type);
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        if (files.length === 0) continue;

        found = true;
        console.log(chalk.bold(`${type}:`));

        for (const file of files) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          const involves = parseFrontmatterInvolves(content);
          const name = file.replace('.md', '');
          const involvesStr = involves.length > 0
            ? chalk.dim(` [${involves.join(', ')}]`)
            : '';
          console.log(`  ${name}${involvesStr}`);
        }
      }

      // Also check for topology.md
      const topologyPath = path.join(specsDir, 'topology.md');
      if (fs.existsSync(topologyPath)) {
        found = true;
        console.log(chalk.bold('topology:'));
        console.log('  topology');
      }

      if (!found) {
        console.log(chalk.dim('No specs found.'));
      }
    })
);

specCommand.addCommand(
  new Command('show')
    .argument('<name>', 'Spec name')
    .description('Show a spec file')
    .action((name: string) => {
      const cwd = process.cwd();
      const specsDir = path.join(cwd, 'specs');

      const types = ['capabilities', 'entries', 'constraints'] as const;
      for (const type of types) {
        const filePath = path.join(specsDir, type, `${name}.md`);
        if (fs.existsSync(filePath)) {
          console.log(fs.readFileSync(filePath, 'utf-8'));
          return;
        }
      }

      // Check topology
      if (name === 'topology') {
        const topologyPath = path.join(specsDir, 'topology.md');
        if (fs.existsSync(topologyPath)) {
          console.log(fs.readFileSync(topologyPath, 'utf-8'));
          return;
        }
      }

      console.log(chalk.red(`Spec "${name}" not found.`));
    })
);

specCommand.addCommand(
  new Command('create')
    .argument('<name>', 'Spec name')
    .requiredOption('--type <type>', 'Spec type: capability, entry, or constraint')
    .option('--involves <services>', 'Comma-separated list of involved services')
    .description('Create a new spec file')
    .action((name: string, options: { type: string; involves?: string }) => {
      const cwd = process.cwd();
      const typeMap: Record<string, string> = {
        capability: 'capabilities',
        entry: 'entries',
        constraint: 'constraints',
      };

      const dirName = typeMap[options.type];
      if (!dirName) {
        console.log(chalk.red(`Invalid type "${options.type}". Use: capability, entry, or constraint`));
        return;
      }

      const dir = path.join(cwd, 'specs', dirName);
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${name}.md`);
      if (fs.existsSync(filePath)) {
        console.log(chalk.yellow(`Spec "${name}" already exists.`));
        return;
      }

      const involves = options.involves
        ? options.involves.split(',').map(s => s.trim())
        : [];

      const frontmatter: Record<string, string | string[]> = { name };
      if (involves.length > 0) {
        frontmatter.involves = involves;
      }

      const content = `---\n${YAML.stringify(frontmatter)}---\n\n# ${name}\n\n<!-- Describe the spec here -->\n`;
      fs.writeFileSync(filePath, content);
      console.log(chalk.green(`Created spec: ${filePath}`));
    })
);

function parseFrontmatterInvolves(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  try {
    const parsed = YAML.parse(match[1]);
    return Array.isArray(parsed?.involves) ? parsed.involves : [];
  } catch {
    return [];
  }
}
