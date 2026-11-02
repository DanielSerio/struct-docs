import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { leafSource, rootSource } from './utils/roadmap-checks.js';
import { statusFiles } from './utils/status-fixtures.js';
import { tempDocs } from './utils/temp-docs.js';

const entry = resolve('dist/scripts/commands/docs-lint.js');
const invoke = (root: string, args: readonly string[]) =>
  spawnSync(process.execPath, [entry, 'status', ...args], { cwd: root, encoding: 'utf8' });

/** Include directory inventory and timestamps to catch creation as well as file rewrites. */
function snapshot(root: string): unknown[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((item): unknown[] => {
    const path = join(root, item.name);
    const metadata = statSync(path, { bigint: true });
    return [[path, metadata.mtimeNs, item.isDirectory() ? 'directory' : readFileSync(path)],
      ...(item.isDirectory() ? snapshot(path) : [])];
  });
}

test('status processes repeatedly report clean, scoped, cyclic and empty trees without writing anything', () => {
  const cases = [
    { files: statusFiles(), args: [], expected: /next: webhooks\n$/ },
    { files: statusFiles(), args: ['docs/roadmaps/v1/billing.md'], expected: /^billing \[in-progress\]/ },
    { files: { ...statusFiles(), 'roadmaps/payments/index.md': rootSource('payments', leafSource('auth')) },
      args: ['docs/roadmaps/v1/billing.md'], expected: /gated on payments:auth/ },
    { files: { 'roadmaps/v1/index.md': rootSource('v1', leafSource('working', 'in-progress')) },
      args: [], expected: /no todo leaves, but work remains open/ },
    { files: { 'roadmaps/v1/index.md': rootSource('v1', leafSource('finished', 'done')) },
      args: [], expected: /every node is done or cut/ },
    { files: { 'roadmaps/v1/index.md': rootSource('v1',
      leafSource('a', 'todo', 'Deps: b\n') + leafSource('b', 'todo', 'Deps: a\n')) }, args: [], expected: /next: cyclic/ },
    { files: {}, args: [], expected: /No roadmaps found/ },
  ];
  for (const { files, args, expected } of cases) tempDocs(files, (root) => {
    const before = snapshot(root);
    const first = invoke(root, args);
    const second = invoke(root, args);
    assert.equal(first.status, 0, first.stderr + first.stdout);
    assert.equal(second.status, 0, second.stderr + second.stdout);
    assert.equal(first.stderr, '');
    assert.equal(second.stderr, '');
    assert.match(first.stdout, expected);
    assert.equal(second.stdout, first.stdout);
    assert.deepEqual(snapshot(root), before);
  });
});

test('unmodelable roadmap processes exit one with audit guidance and preserve files and mtimes', () => {
  for (const source of ['---\nid: [broken\n---\n', rootSource().replace('type: roadmap', 'type: spec')]) {
    tempDocs({ 'roadmaps/v1/index.md': source }, (root) => {
      const before = snapshot(root);
      const result = invoke(root, []);
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /roadmaps\/v1\/index.md:\d+ - .*docs-lint audit/);
      assert.deepEqual(snapshot(root), before);
    });
  }
});

test('outside status paths and invalid arguments exit two without writing, even with malformed config', () => {
  tempDocs(statusFiles(), (root) => {
    writeFileSync(join(root, '.struct-docs.yml'), 'unknown: true\n');
    const before = snapshot(root);
    for (const args of [['docs/specs/a.md'], ['../outside.md'], [''], ['--unknown'], ['a', 'b']]) {
      const result = invoke(root, args);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.ok(result.stderr);
      assert.deepEqual(snapshot(root), before);
    }
    const config = invoke(root, []);
    assert.equal(config.status, 1, config.stderr);
    assert.match(config.stdout, /^\.struct-docs\.yml:1 - unknown option/);
    assert.deepEqual(snapshot(root), before);
  });
});
