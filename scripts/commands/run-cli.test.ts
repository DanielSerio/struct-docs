import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import type { CommandOptions, CommandName } from './command-types.js';
import { runCli } from './run-cli.js';
import { run as runInit } from './handlers/init.js';
import { run as runAudit } from './handlers/audit.js';
import { run as runCheck } from './handlers/check.js';
import { run as runRepair } from './handlers/repair.js';

function capture() {
  let stdout = '';
  let stderr = '';
  return { writeOut: (text: string) => { stdout += text; }, writeErr: (text: string) => { stderr += text; },
    stdout: () => stdout, stderr: () => stderr };
}

test('all registration modules adapt flags and file arguments into testable handlers', async () => {
  for (const [name, args, expected] of [
    ['init', ['--apply'], { apply: true }],
    ['audit', ['--fix', '--verbose'], { fix: true, verbose: true }],
    ['check', ['docs/specs/a.md'], { file: 'docs/specs/a.md' }],
    ['repair', [], {}],
  ] as const) {
    const calls: CommandOptions[] = [];
    const io = capture();
    const code = await runCli([name, ...args], { ...io, root: 'fixture-root',
      handlers: { [name]: (options: CommandOptions) => { calls.push(options); return { findings: [] }; } } });
    assert.equal(code, 0);
    assert.deepEqual(calls, [{ ...expected, root: 'fixture-root' }]);
    assert.equal(io.stdout(), '');
    assert.equal(io.stderr(), '');
  }
});

test('every real handler exposes config findings without spawning a process', () => {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-command-'));
  try {
    writeFileSync(join(root, '.struct-docs.yml'), '# config\nunknown: true');
    for (const run of [runInit, runAudit, runCheck, runRepair]) {
      const result = run({ root, file: 'docs/specs/a.md' });
      assert.equal(result.findings[0]?.file, '.struct-docs.yml');
      assert.equal(result.findings[0]?.line, 2);
      assert.equal(result.findings[0]?.severity, 'error');
    }
  } finally {
    assert.equal(relative(tmpdir(), root).startsWith('struct-docs-command-'), true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('usage errors and execution failures exit two while explicit help exits zero', async () => {
  for (const args of [['unknown'], ['check'], ['audit', '--unknown'], ['repair', 'extra']]) {
    const io = capture();
    assert.equal(await runCli(args, io), 2);
    assert.ok(io.stderr());
  }
  const help = capture();
  assert.equal(await runCli(['--help'], help), 0);
  assert.match(help.stdout(), /docs-lint/);
  const failure = capture();
  const command: CommandName = 'audit';
  assert.equal(await runCli([command], { ...failure, handlers: {
    audit: () => { throw new Error('disk unavailable'); },
  } }), 2);
  assert.equal(failure.stderr(), 'docs-lint: disk unavailable\n');
});
