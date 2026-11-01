import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { Linter } from 'eslint';
import layerImports from './layer-imports.mjs';

function findings(root, filename, source) {
  const linter = new Linter({ cwd: root });
  return linter.verify(source, [{
    plugins: { architecture: { rules: { layers: layerImports } } },
    rules: { 'architecture/layers': ['error', { root }] },
  }], { filename: join(root, filename) });
}

test('layer boundaries survive an ancestor named scripts', () => {
  const root = resolve('test-checkout/scripts/app');
  const target = join(root, 'scripts/check/document.js');
  for (const source of ['../check/document.js', target, pathToFileURL(target).href]) {
    const result = findings(root, 'scripts/policy/x.js', `import ${JSON.stringify(source)};`);
    assert.equal(result.length, 1);
    assert.equal(result[0].messageId, 'forbidden');
  }
});

test('undeclared layers and root source files are reported instead of skipped', () => {
  const root = process.cwd();
  for (const file of ['scripts/rules/x.js', 'scripts/x.js']) {
    const result = findings(root, file, "import './anything.js';");
    assert.equal(result.length, 1);
    assert.equal(result[0].messageId, 'unknown');
  }
  const result = findings(root, 'scripts/policy/x.js', "export * from '../rules/new-rule.js';");
  assert.equal(result[0].messageId, 'unknown');
});
