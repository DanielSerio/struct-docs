import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { applyCommitGate } from './commit-gate.js';

function withRepo(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-gate-detect-'));
  try {
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
    run(root);
  } finally {
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-gate-detect-'));
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root: string, file: string, content: string) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

const read = (root: string, file: string) => readFileSync(join(root, file), 'utf8');
const pkg = (scripts: Record<string, string>) => `${JSON.stringify({ name: 'fixture', scripts }, null, 2)}\n`;

test('an older linter named docs-lint is not the gate, and a hook running `pnpm check` gets no second run', () => {
  withRepo((root) => {
    // SDLC-docs' shape: its check script runs its own `docs-lint` command, its hook `pnpm check`.
    spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root });
    write(root, 'package.json', pkg({ check: 'pnpm agents docs-lint && pnpm lint', 'docs-lint': 'node tools/docs-cli/index.mjs' }));
    write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
    const hook = '#!/bin/sh\n# Refuse a broken commit.\npnpm check\n';
    write(root, '.githooks/pre-commit', hook);

    assert.deepEqual(applyCommitGate(root).written, ['package.json']);
    const check = (JSON.parse(read(root, 'package.json')) as { scripts: Record<string, string> }).scripts.check;
    assert.equal(check, 'pnpm agents docs-lint && pnpm lint && pnpm run docs-lint audit');
    assert.equal(read(root, '.githooks/pre-commit'), hook);
    assert.deepEqual(applyCommitGate(root).written, []);
  });
});

test('a docs-lint script the project already had for something else is bypassed by the gate', () => {
  withRepo((root) => {
    write(root, 'package.json', pkg({ 'docs-lint': 'markdownlint docs' }));
    const applied = applyCommitGate(root);
    assert.equal(applied.gateCommand, 'node tools/docs-cli/index.mjs audit');
    assert.match(read(root, '.git/hooks/pre-commit'), /^node tools\/docs-cli\/index\.mjs audit$/m);
  });
});

test('the gate goes before a trailing exec or exit, so the hook still reaches it', () => {
  for (const last of ['exec node scripts/lint-staged.mjs "$@"', 'exit 0']) {
    withRepo((root) => {
      write(root, '.git/hooks/pre-commit', `#!/bin/sh\necho prior\n${last}\n`);
      applyCommitGate(root);
      assert.equal(read(root, '.git/hooks/pre-commit'),
        `#!/bin/sh\necho prior\nnode tools/docs-cli/index.mjs audit\n${last}\n`);
    });
  }
});
