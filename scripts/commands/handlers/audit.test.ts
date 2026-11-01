import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../../tests/utils/temp-docs.js';
import { cleanAuditFiles } from '../../../tests/utils/audit-fixtures.js';
import { run } from './audit.js';

const entry = resolve('dist/scripts/commands/docs-lint.js');
const invoke = (root: string, args: string[] = []) =>
  spawnSync(process.execPath, [entry, 'audit', ...args], { cwd: root, encoding: 'utf8' });

test('real audit is silent for a clean roadmap fixture and missing docs', () => {
  for (const files of [cleanAuditFiles(), {}]) tempDocs(files, (root) => {
    assert.deepEqual(run({ root }).findings, []);
    const result = invoke(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });
});

test('real audit errors use the reporter and do not print roadmap progress', () => {
  tempDocs({ ...cleanAuditFiles(), 'stray.bin': 'root artifact' }, (root) => {
    const result = invoke(root);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, 'stray.bin:1 - root-level file - route it into a subdirectory\n');
    assert.equal(result.stderr, '');
  });
});

test('warning-only audits exit zero, count by default and list deterministic detail with verbose', () => {
  tempDocs({ ...cleanAuditFiles(), 'guides/z.md': 'notes', 'guides/a.md': 'notes',
    'decisions/old.md': 'legacy' }, (root) => {
    const counted = invoke(root);
    assert.equal(counted.status, 0, counted.stderr);
    assert.equal(counted.stdout, '2 warnings (--verbose to list)\n');
    const detailed = invoke(root, ['--verbose']);
    assert.equal(detailed.status, 0, detailed.stderr);
    const lines = detailed.stdout.trim().split('\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0] ?? '', /^decisions\/:1 - .*`fold`/);
    assert.match(lines[1] ?? '', /^guides\/:1 - 2 unrouted.*`init`/);
  });
});
