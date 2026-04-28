import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*'],
    rules: {
      // Enforce TypeScript-only source — no .js/.mjs/.cjs in src/
      // This is a code review rule; ESLint can't block JS files from existing,
      // but the tsconfig include only covers .ts files so they won't compile.

      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-require-imports': 'error',

      // Import discipline
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/dist/**'],
          message: 'Do not import from dist/ — import from src/ instead.',
        }],
      }],

      // Node.js ESM best practices
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'build.ts', 'eslint.config.js'],
  },
);
