import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { createRehearsal } from './rehearsal/create.mjs';
import { git } from './rehearsal/git.mjs';
import { assertRehearsalRoot, fixture, repository } from './rehearsal/paths.mjs';

const cli = join(repository, 'bin/docs-lint.mjs');
const npm = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');

function run(project, args, expected = 0) {
  const result = spawnSync(process.execPath, args, { cwd: project, encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, expected, result.stderr + result.stdout);
  return result.stdout;
}

function snapshot(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? snapshot(path) : [[path, statSync(path, { bigint: true }).mtimeNs, readFileSync(path)]];
  });
}

function rehearse(variant, check) {
  const result = createRehearsal(variant);
  try {
    check(result);
  } finally {
    rmSync(assertRehearsalRoot(result.root), { recursive: true, force: true });
  }
}

test('the source fixture has a passing code check and clean audit without dependencies', () => {
  const before = snapshot(fixture);
  run(fixture, [npm, 'run', 'check']);
  assert.equal(run(fixture, [cli, 'audit']), '');
  assert.equal(existsSync(join(fixture, 'node_modules')), false);
  assert.deepEqual(snapshot(fixture), before);
});

test('the fixture Git attributes accept a CRLF source edit without whitespace errors', () => {
  rehearse('success', (result) => {
    const path = join(result.project, 'src/greeting.mjs');
    const source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
    writeFileSync(path, (source + '// A Windows editor may save CRLF.\n').replaceAll('\n', '\r\n'));
    assert.equal(git(result.project, 'diff', '--check'), '');
    assert.equal(git(result.project, 'rev-parse', 'main'), result.baseline);
    assert.equal(git(result.root, '--git-dir', result.remote, 'rev-parse', 'main'), result.baseline);
  });
});

test('each variant creates a fresh outside repository with matching main and bare-remote baselines', () => {
  const before = snapshot(fixture);
  const roots = new Set();
  for (const variant of ['success', 'failed-check', 'decision']) rehearse(variant, (result) => {
    assert.equal(roots.has(result.root), false);
    roots.add(result.root);
    assert.equal(assertRehearsalRoot(result.root), result.root);
    const location = relative(repository, result.root);
    assert.ok(isAbsolute(location) || location === '..' || location.startsWith(`..${sep}`));
    assert.equal(git(result.project, 'branch', '--show-current'), 'main');
    assert.equal(git(result.project, 'rev-parse', 'main'), result.baseline);
    assert.equal(git(result.root, '--git-dir', result.remote, 'rev-parse', 'refs/heads/main'), result.baseline);
    assert.equal(git(result.project, 'status', '--porcelain'), '');
    assert.equal(git(result.root, '--git-dir', result.remote, 'rev-parse', '--is-bare-repository'), 'true');
    assert.equal(git(result.project, 'remote', 'get-url', 'origin'), result.remote);
    run(result.project, [npm, 'run', 'check']);
    assert.equal(run(result.project, [cli, 'audit']), '');
    const progress = run(result.project, [cli, 'status', 'docs/roadmaps/release/greeting.md']);
    assert.match(progress, /\[>\] named-greeting/);
    assert.match(progress, /next: nothing ready - every todo leaf is gated/);
    assert.equal(existsSync(join(result.project, 'node_modules')), false);
    const source = readFileSync(join(result.project, 'docs/roadmaps/release/greeting.md'), 'utf8');
    assert.match(source, /2026-11-03 the baseline check passes/);
    if (variant === 'failed-check') {
      assert.match(source, /### delivery-check/);
      assert.match(source, /Deps: delivery-check/);
      run(result.project, [npm, 'run', 'check:failure'], 1);
    }
    if (variant === 'decision') {
      assert.match(source, /### choose-audience/);
      assert.match(source, /Neither is authorized/);
      assert.match(source, /Deps: choose-audience/);
    }
  });
  assert.deepEqual(snapshot(fixture), before);
});

test('the one-command creator prints reusable paths and rejects unknown variants before creating a project', () => {
  const source = join(repository, 'tools/rehearsal/create.mjs');
  const output = run(repository, [source, 'success']);
  const result = JSON.parse(output);
  try {
    assert.equal(result.variant, 'success');
    assert.equal(result.plugin, repository);
    assert.equal(JSON.parse(readFileSync(join(result.root, 'rehearsal.json'), 'utf8')).baseline, result.baseline);
    assert.equal(git(result.project, 'rev-parse', 'HEAD'), result.baseline);
  } finally {
    rmSync(assertRehearsalRoot(result.root), { recursive: true, force: true });
  }
  assert.throws(() => createRehearsal('unknown'), /variant must be/);
  assert.throws(() => assertRehearsalRoot(repository), /outside the checkout/);
  run(repository, [source, 'unknown'], 1);
});
