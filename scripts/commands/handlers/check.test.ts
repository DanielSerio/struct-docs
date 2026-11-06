import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../../tests/utils/temp-docs.js';
import { run } from './check.js';

const entry = resolve('dist/scripts/commands/docs-lint.js');
const source = '---\ntype: spec\n---\n';

test('one-file handler reports only parse, naming and placement without sibling scans', () => {
  tempDocs({ 'specs/auth.md': source, 'specs/broken.md': 'not frontmatter' }, (root) => {
    assert.deepEqual(run({ root, file: 'docs/specs/auth.md' }).findings, []);
    assert.deepEqual(run({ root, file: join(root, 'docs/specs/auth.md') }).findings, []);
    assert.deepEqual(run({ root, file: 'docs\\specs\\auth.md' }).findings, []);
    assert.equal(run({ root, file: 'docs/specs/broken.md' }).findings[0]?.rule, 'frontmatter');
  });
});

test('outside and excluded files are silent, missing files are errors and forbidden root files fail', () => {
  tempDocs({ 'living/notes.md': 'not frontmatter', 'random.txt': 'root file' }, (root) => {
    writeFileSync(join(root, 'elsewhere.md'), 'outside docs');
    for (const file of ['elsewhere.md', 'docs/living/notes.md']) {
      assert.deepEqual(run({ root, file }).findings, [], file);
    }
    // A typo, inside docs/ or out of it, must not read as a clean result.
    for (const file of ['docs/specs/missing.md', 'docs/missing.txt', 'doc/specs/auth.md']) {
      assert.throws(() => run({ root, file }), /no such file/, file);
    }
    assert.equal(run({ root, file: 'docs/random.txt' }).findings[0]?.rule, 'filing');
    mkdirSync(join(root, 'docs/specs'));
    assert.throws(() => run({ root, file: 'docs/specs' }), /file/);
  });
});

test('real check process reports field lines and exits one for findings', () => {
  tempDocs({ 'specs/My_Auth.MD': '---\ntitle: Auth\ntype: review\n---\n' }, (root) => {
    const result = spawnSync(process.execPath, [entry, 'check', 'docs/specs/My_Auth.MD'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /specs\/My_Auth.MD:1 - filename stem/);
    assert.match(result.stdout, /specs\/My_Auth.MD:3 - type `review`/);
  });
});

test('real check process ignores full-schema gaps and exits two on an execution failure', () => {
  tempDocs({ 'specs/auth.md': source }, (root) => {
    const clean = spawnSync(process.execPath, [entry, 'check', 'docs/specs/auth.md'], { cwd: root, encoding: 'utf8' });
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(clean.stdout, '');
    mkdirSync(join(root, 'docs/specs/directory.md'));
    const failed = spawnSync(process.execPath, [entry, 'check', 'docs/specs/directory.md'], { cwd: root, encoding: 'utf8' });
    assert.equal(failed.status, 2);
    assert.match(failed.stderr, /file/);
    const missing = spawnSync(process.execPath, [entry, 'check', 'docs/specs/nope.md'], { cwd: root, encoding: 'utf8' });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /no such file/);
  });
});
