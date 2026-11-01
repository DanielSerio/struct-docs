import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../../tests/utils/temp-docs.js';
import { staleRoadmapFiles } from '../../../tests/utils/repair-fixtures.js';
import { run } from './repair.js';

const entry = resolve('dist/scripts/commands/docs-lint.js');
const invoke = (root: string, ...args: string[]) => spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });

test('repair process is silent and idempotent; a following audit is silent too', () => {
  tempDocs(staleRoadmapFiles(), (root) => {
    for (let count = 0; count < 2; count += 1) {
      const result = invoke(root, 'repair');
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    }
    const result = invoke(root, 'audit');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });
});

test('audit --fix labels each status and the same-run index write as repaired', () => {
  tempDocs(staleRoadmapFiles(), (root) => {
    const result = invoke(root, 'audit', '--fix');
    assert.equal(result.status, 0, result.stderr);
    const lines = result.stdout.trim().split('\n');
    assert.equal(lines.length, 4);
    assert.ok(lines.every((line) => line.endsWith('(repaired)')));
    assert.ok(lines.some((line) => line.startsWith('README.md:1 - index is stale')));
    assert.equal(invoke(root, 'audit').stdout, '');
  });
});

test('maintenance withholds invalid roadmap values without printing structural errors', () => {
  const files = staleRoadmapFiles();
  files['roadmaps/v1/milestone.MD'] = '---\nid: milestone\n  broken: field\n---\n';
  files['roadmaps/v1/index.md'] = (files['roadmaps/v1/index.md'] ?? '').replace('status: "todo"', 'status: "done"');
  tempDocs(files, (root) => {
    const before = readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8');
    assert.deepEqual(run({ root }).findings, []);
    const result = invoke(root, 'repair');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
    assert.equal(readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8'), before);
    const report = invoke(root, 'audit', '--fix');
    assert.equal(report.status, 1);
    assert.match(report.stdout, /withheld until this roadmap/);
  });
});
