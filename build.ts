import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/cli.js',
  banner: { js: '#!/usr/bin/env node' },
  external: [
    'inquirer',
    'simple-git',
    'chalk',
    'ora',
    'commander',
    'yaml',
  ],
});
