import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const entry = fileURLToPath(new URL('../bin/docs-lint.mjs', import.meta.url));
const markers = '# Docs\n\n<!-- struct-docs:index -->\n<!-- /struct-docs:index -->\n';
const badSpec = '---\ntitle: Bad\ntype: review\npurpose: Misfiled.\n---\n';

function write(root, file, content) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

function withProject(callback) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-project-root-'));
  try {
    write(root, 'docs/README.md', markers);
    write(root, 'docs/specs/bad.md', badSpec);
    mkdirSync(join(root, 'scripts/deep'), { recursive: true });
    return callback(root);
  } finally {
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-project-root-'));
    rmSync(root, { recursive: true, force: true });
  }
}

const run = (cwd, args) => spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8' });

test('commands run from a subdirectory work on the adopted project above it', () => {
  withProject((root) => {
    const cwd = join(root, 'scripts/deep');
    const audit = run(cwd, ['audit']);
    assert.equal(audit.status, 1, audit.stderr + audit.stdout);
    assert.match(audit.stdout, /^specs\/bad\.md:\d+ - /m);

    // File arguments still mean what they say from where the command ran.
    const check = run(cwd, ['check', '../../docs/specs/bad.md']);
    assert.equal(check.status, 1, check.stderr + check.stdout);
    assert.match(check.stdout, /^specs\/bad\.md:\d+ - /m);
  });
});

test('a README the hooks would not adopt does not adopt a project for the CLI either', () => {
  withProject((root) => {
    write(root, 'docs/README.md', `${markers}${markers}`);
    write(root, '.struct-docs.yml', '');
    const audit = run(join(root, 'scripts/deep'), ['audit']);
    assert.equal(audit.status, 0, audit.stderr + audit.stdout);
    assert.equal(audit.stdout, '');
  });
});

test('the search stops at the git root, so a nested repository is not mistaken for its parent', () => {
  withProject((root) => {
    const nested = join(root, 'scripts/deep');
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: nested }).status, 0);
    const audit = run(nested, ['audit']);
    assert.equal(audit.status, 0, audit.stderr + audit.stdout);
    assert.equal(audit.stdout, '');
  });
});
