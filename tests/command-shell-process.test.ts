import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const fixture = resolve('dist/tests/fixtures/command-shell.js');
const entry = resolve('dist/scripts/commands/docs-lint.js');

test('process boundary keeps every finding severity and execution failure distinct', () => {
  for (const [mode, expected] of [['clean', 0], ['warning', 0], ['repairable', 0],
    ['error', 1], ['failure', 2]] as const) {
    const result = spawnSync(process.execPath, [fixture, mode, 'audit'], { encoding: 'utf8' });
    assert.equal(result.status, expected, result.stderr);
    if (mode === 'clean') assert.equal(result.stdout, '');
    if (mode === 'warning') assert.equal(result.stdout, '1 warning (--verbose to list)\n');
    if (mode === 'error') assert.equal(result.stdout, 'specs/a.md:7 - fixture finding\n');
    if (mode === 'repairable') assert.match(result.stdout, /specs\/a.md:7 - .*repairable with --fix/);
    if (mode === 'failure') assert.match(result.stderr, /fixture execution failure/);
  }
  const verbose = spawnSync(process.execPath, [fixture, 'warning', 'audit', '--verbose'], { encoding: 'utf8' });
  assert.equal(verbose.status, 0);
  assert.equal(verbose.stdout, 'specs/a.md:7 - fixture finding\n');
});

test('real malformed config passes through the shared reporter for every command', () => {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-process-'));
  try {
    writeFileSync(join(root, '.struct-docs.yml'), '# config\nunknown: true');
    for (const args of [['audit'], ['init'], ['check', 'docs/specs/a.md'], ['repair']]) {
      const result = spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /^\.struct-docs\.yml:2 - unknown option/);
    }
  } finally {
    assert.equal(relative(tmpdir(), root).startsWith('struct-docs-process-'), true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('real entry uses exit two for usage errors', () => {
  for (const args of [['unknown'], ['check'], ['audit', '--unknown']]) {
    const result = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.ok(result.stderr);
  }
});
