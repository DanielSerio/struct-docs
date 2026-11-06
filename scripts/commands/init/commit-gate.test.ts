import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { applyCommitGate } from './commit-gate.js';
import { applyProjectCli } from './project-cli.js';
import { installCommander } from '../../../tests/utils/install-commander.js';

const repoRoot = resolve('.');

function withTempRepo(run: (root: string) => void | Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-commit-gate-'));
  return Promise.resolve()
    .then(() => {
      git(root, ['init']);
      git(root, ['config', 'user.name', 'Test User']);
      git(root, ['config', 'user.email', 'test@example.com']);
      return run(root);
    })
    .finally(() => {
      assert.ok(relative(tmpdir(), root).startsWith('struct-docs-commit-gate-'));
      rmSync(root, { recursive: true, force: true });
    });
}

function write(root: string, file: string, content: string) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function git(cwd: string, args: readonly string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync('git', [...args], { cwd, encoding: 'utf8', env });
  assert.ifError(result.error);
  return result;
}

test('existing pre-commit hook and existing check script keep prior behavior and run the generated CLI once per commit', async () => {
  // 1. Fixture with an existing pre-commit hook.
  await withTempRepo((root) => {
    const hookMarker = join(root, 'hook-ran.log');
    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    mkdirSync(dirname(hookPath), { recursive: true });
    writeFileSync(hookPath, `#!/bin/sh\necho "prior-hook" >> "${hookMarker.replaceAll('\\', '/')}"\n`, { mode: 0o755 });
    chmodSync(hookPath, 0o755);

    applyProjectCli(root, { rules: ['heading-gap'] });
    installCommander(root);
    const cliPath = join(root, 'tools/docs-cli/index.mjs');
    const cliLog = join(root, 'cli-runs.log').replaceAll('\\', '/');
    writeFileSync(cliPath, `${readFileSync(cliPath, 'utf8')}\nimport { appendFileSync } from 'node:fs';\nappendFileSync('${cliLog}', 'run\\n');\n`);

    applyCommitGate(root);
    // Repeated apply must not duplicate the gate.
    applyCommitGate(root);

    write(root, 'README.md', '# Fixture\n');
    git(root, ['add', 'README.md']);
    const commit = git(root, ['commit', '-m', 'Initial commit'], {
      ...process.env,
      STRUCT_DOCS_ROOT: repoRoot,
    });
    assert.equal(commit.status, 0, commit.stderr + commit.stdout);
    assert.equal(readFileSync(hookMarker, 'utf8').trim(), 'prior-hook');
    assert.equal(readFileSync(join(root, 'cli-runs.log'), 'utf8').trim().split(/\r?\n/).length, 1);
  });

  // 2. Fixture with an existing check script in package.json.
  await withTempRepo((root) => {
    const checkLog = join(root, 'check-ran.log').replaceAll('\\', '/');
    write(root, 'package.json', JSON.stringify({
      name: 'check-fixture',
      private: true,
      scripts: {
        check: `node -e "require('node:fs').appendFileSync('${checkLog}', 'prior-check\\n')"`,
      },
    }, null, 2) + '\n');

    applyProjectCli(root, { rules: ['heading-gap'] });
    installCommander(root);
    const cliPath = join(root, 'tools/docs-cli/index.mjs');
    const cliLog = join(root, 'cli-runs.log').replaceAll('\\', '/');
    writeFileSync(cliPath, `${readFileSync(cliPath, 'utf8')}\nimport { appendFileSync } from 'node:fs';\nappendFileSync('${cliLog}', 'run\\n');\n`);

    applyCommitGate(root);
    applyCommitGate(root);

    write(root, 'README.md', '# Check Fixture\n');
    git(root, ['add', 'README.md']);
    const commit = git(root, ['commit', '-m', 'Check commit'], {
      ...process.env,
      STRUCT_DOCS_ROOT: repoRoot,
    });
    assert.equal(commit.status, 0, commit.stderr + commit.stdout);
    assert.equal(readFileSync(join(root, 'check-ran.log'), 'utf8').trim(), 'prior-check');
    assert.equal(readFileSync(join(root, 'cli-runs.log'), 'utf8').trim().split(/\r?\n/).length, 1);
  });
});

test('commit with local rule error is blocked, while commit with only missing plugin or only warnings succeeds and prints warning', async () => {
  await withTempRepo((root) => {
    const emptyHome = join(root, 'empty-home');
    mkdirSync(emptyHome, { recursive: true });
    applyProjectCli(root, { rules: ['stale-pointer', 'file-size'] });
    installCommander(root);
    applyCommitGate(root);

    const envNoPlugin = {
      ...process.env,
      HOME: emptyHome,
      USERPROFILE: emptyHome,
      CODEX_HOME: join(emptyHome, '.codex'),
      STRUCT_DOCS_ROOT: '',
    };

    // 1. Local rule error blocks the commit.
    write(root, 'docs/specs/bad.md', '---\ntitle: Bad\ntype: spec\nstatus: active\npurpose: Bad.\nowns: [bad]\n---\n\nTODO: blocked commit.\n');
    git(root, ['add', 'docs/specs/bad.md']);
    const blocked = git(root, ['commit', '-m', 'Should fail'], envNoPlugin);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stdout + blocked.stderr, /defers to later work \("TODO"\)/);

    // 2. Missing plugin alone succeeds and prints the installation / STRUCT_DOCS_ROOT warning.
    write(root, 'docs/specs/bad.md', '---\ntitle: Clean\ntype: spec\nstatus: active\npurpose: Clean.\nowns: [clean]\n---\n\nClean spec body.\n');
    git(root, ['add', 'docs/specs/bad.md']);
    const missingPluginCommit = git(root, ['commit', '-m', 'Missing plugin allowed'], envNoPlugin);
    assert.equal(missingPluginCommit.status, 0, missingPluginCommit.stderr + missingPluginCommit.stdout);
    assert.match(missingPluginCommit.stdout + missingPluginCommit.stderr, /STRUCT_DOCS_ROOT/);

    // 3. Warning alone (file-size over 0.05 MB) succeeds and prints the warning.
    const largeBody = Array.from({ length: 650 }, () => 'x'.repeat(80)).join('\n');
    write(root, 'docs/specs/bad.md', `---\ntitle: Large\ntype: spec\nstatus: active\npurpose: Large.\nowns: [clean]\n---\n\n${largeBody}\n`);
    git(root, ['add', 'docs/specs/bad.md']);
    const warningOnlyCommit = git(root, ['commit', '-m', 'Warning only allowed'], envNoPlugin);
    assert.equal(warningOnlyCommit.status, 0, warningOnlyCommit.stderr + warningOnlyCommit.stdout);
    assert.match(warningOnlyCommit.stdout + warningOnlyCommit.stderr, /1 warning \(--verbose to list\)/);
  });
});

test('the gate goes where git runs hooks: core.hooksPath, husky and a shared worktree hooks directory', async () => {
  await withTempRepo((root) => {
    applyProjectCli(root, { rules: ['heading-gap'] });
    git(root, ['config', 'core.hooksPath', '.githooks']);
    assert.deepEqual(applyCommitGate(root).written, ['.githooks/pre-commit']);
    assert.match(readFileSync(join(root, '.githooks/pre-commit'), 'utf8'), /^node tools\/docs-cli\/index\.mjs audit$/m);
    assert.equal(existsSync(join(root, '.git/hooks/pre-commit')), false);
  });

  await withTempRepo((root) => {
    applyProjectCli(root, { rules: ['heading-gap'] });
    git(root, ['config', 'core.hooksPath', '.husky/_']);
    assert.deepEqual(applyCommitGate(root).written, ['.husky/pre-commit']);
  });

  await withTempRepo((root) => {
    write(root, 'README.md', '# Main\n');
    git(root, ['add', 'README.md']);
    git(root, ['commit', '-m', 'Main']);
    const worktree = `${root}-worktree`;
    git(root, ['worktree', 'add', worktree]);
    try {
      applyProjectCli(worktree, { rules: ['heading-gap'] });
      applyCommitGate(worktree);
      // Linked worktrees share the main repository's hooks; `.git` there is a file.
      assert.match(readFileSync(join(root, '.git/hooks/pre-commit'), 'utf8'), /docs-cli\/index\.mjs audit/);
    } finally {
      git(root, ['worktree', 'remove', '--force', worktree]);
    }
  });
});

test('a nested project enters its own directory, and outside a repository nothing is created', async () => {
  await withTempRepo((root) => {
    const project = join(root, 'packages', 'docs');
    mkdirSync(project, { recursive: true });
    applyProjectCli(project, { rules: ['heading-gap'] });
    applyCommitGate(project);
    assert.match(readFileSync(join(root, '.git/hooks/pre-commit'), 'utf8'),
      /^\(cd 'packages\/docs' && node tools\/docs-cli\/index\.mjs audit\)$/m);
  });

  const outside = mkdtempSync(join(tmpdir(), 'struct-docs-commit-gate-'));
  try {
    applyProjectCli(outside, { rules: ['heading-gap'] });
    assert.throws(() => applyCommitGate(outside), /needs a git repository/);
    assert.equal(existsSync(join(outside, '.git')), false);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test('skills/init/SKILL.md offers the gate after project CLI, uses project package manager and respects a decline', async () => {
  await withTempRepo((root) => {
    const declined = applyCommitGate(root, { approved: false });
    assert.equal(declined.skipped, true);
    assert.deepEqual(declined.written, []);
    assert.equal(existsSync(join(root, '.git/hooks/pre-commit')), false);

    write(root, 'package.json', '{"name":"pnpm-proj","scripts":{"docs-lint":"node tools/docs-cli/index.mjs"}}\n');
    write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
    const applied = applyCommitGate(root);
    assert.equal(applied.packageManager, 'pnpm');
    assert.equal(applied.gateCommand, 'pnpm run docs-lint audit');
  });

  const skill = readFileSync(join(repoRoot, 'skills/init/SKILL.md'), 'utf8');
  const cliIndex = skill.indexOf('offer the optional project CLI');
  const gateIndex = skill.indexOf('After the project CLI, offer a local commit gate');
  assert.ok(cliIndex >= 0 && gateIndex > cliIndex, 'commit gate must be offered after the project CLI');
  assert.match(skill, /using the project's package manager/);
  assert.match(skill, /Respect declines/);
});
