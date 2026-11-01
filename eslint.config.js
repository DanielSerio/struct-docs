import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import layerImports from './tools/eslint/layer-imports.mjs';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'bin/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
    plugins: { '@stylistic': stylistic },
    rules: {
      'max-lines': ['error', { max: 99, skipBlankLines: true, skipComments: true }],
      semi: 'off',
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
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
    files: ['scripts/**/*.{ts,js,mjs}'],
    ignores: ['**/*.test.{ts,js,mjs}'],
    plugins: { architecture: { rules: { 'layer-imports': layerImports } } },
    rules: { 'architecture/layer-imports': ['error', { root: import.meta.dirname }] },
  },
);
