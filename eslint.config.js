import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import layerImports from './tools/eslint/layer-imports.mjs';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'bin/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: {
      'max-lines': ['error', { max: 99, skipBlankLines: true, skipComments: true }],
      semi: ['error', 'always'],
      'no-restricted-syntax': ['error', {
        selector: 'TSEnumDeclaration',
        message: 'Use a literal union instead of a TypeScript enum.',
      }],
    },
  },
  {
    files: ['**/*.test.{ts,js,mjs}'],
    rules: { 'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }] },
  },
  {
    // Constants are data tables; length does not indicate growing behavior.
    files: ['**/const/**', '**/*-const.ts', 'eslint.config.js'],
    rules: { 'max-lines': 'off' },
  },
  {
    files: ['scripts/**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: { architecture: { rules: { 'layer-imports': layerImports } } },
    rules: { 'architecture/layer-imports': 'error' },
  },
);
