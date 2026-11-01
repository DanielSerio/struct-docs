import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();
async function rules(source: string, filePath = 'scripts/policy/lint-probe.ts') {
  const [result] = await eslint.lintText(source, { filePath });
  assert.ok(result);
  return result.messages.map((message) => message.ruleId);
}

test('source lint rejects explicit any, missing semicolons and enums', async () => {
  assert.ok((await rules('export const value: any = 1;')).includes('@typescript-eslint/no-explicit-any'));
  assert.ok((await rules('export const value = 1')).includes('semi'));
  assert.ok((await rules('export enum Value { One }')).includes('no-restricted-syntax'));
});

test('code cap rejects long source, while additive test cases have a higher cap', async () => {
  const source = Array.from({ length: 101 }, (_, i) => `export const value${i} = ${i};`).join('\n');
  assert.ok((await rules(source)).includes('max-lines'));
  assert.equal((await rules(source, 'tests/long-probe.test.ts')).includes('max-lines'), false);
  const rationale = `${'// Rationale belongs beside the rule.\n'.repeat(101)}export const value = 1;`;
  assert.equal((await rules(rationale)).includes('max-lines'), false);
});

test('layer boundaries resolve relative, absolute and file URL imports', async () => {
  const target = path.resolve('scripts/check/document.js');
  for (const source of ['../check/document.js', target, pathToFileURL(target).href]) {
    assert.ok((await rules(`import ${JSON.stringify(source)};`)).includes('architecture/layer-imports'));
  }
  assert.equal((await rules("import './kebab-case.js';")).includes('architecture/layer-imports'), false);
});
