import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from './utils/temp-docs.js';

const entry = resolve('dist/scripts/commands/docs-lint.js');
const init = (root: string, apply = false) => spawnSync(process.execPath,
  [entry, 'init', ...(apply ? ['--apply'] : [])], { cwd: root, encoding: 'utf8' });

test('real init is read-only without apply, applies explicitly, and repeated apply is silent', () => {
  tempDocs({}, (root) => {
    const planned = init(root);
    assert.equal(planned.status, 0, planned.stderr);
    assert.match(planned.stdout, /Nothing written/);
    assert.deepEqual(readdirSync(root), []);
    const applied = init(root, true);
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /wrote docs\/README.md/);
    const paths = ['docs/README.md', 'docs/templates/code-review-v1.md', '.gitignore'];
    const snapshots = paths.map((path) => [readFileSync(join(root, path)), statSync(join(root, path)).mtimeMs]);
    const repeated = init(root, true);
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.equal(repeated.stdout, '');
    assert.deepEqual(paths.map((path) => [readFileSync(join(root, path)), statSync(join(root, path)).mtimeMs]), snapshots);
  });
});

test('real init apply refuses legacy semantic migration without writing generated files', () => {
  tempDocs({ '.doctypes': 'product: prd', 'roadmap/v1/task.md': '# Task' }, (root) => {
    const result = init(root, true);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /init skill/);
    assert.equal(existsSync(join(root, 'docs/README.md')), false);
    assert.equal(existsSync(join(root, '.gitignore')), false);
  });
});
