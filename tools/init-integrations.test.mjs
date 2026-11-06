import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));
const entry = join(repository, 'bin/docs-lint.mjs');
const spec = '---\ntitle: Auth\ntype: spec\nstatus: active\npurpose: Sign in.\nowns: [auth]\n---\n\n# Auth\n\nClean body.\n';

function run(cwd, command, args) {
  // Pin discovery to this checkout so an installed plugin elsewhere cannot change the result.
  const env = { ...process.env, STRUCT_DOCS_ROOT: repository };
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env });
  assert.ifError(result.error);
  return result;
}

function write(root, file, content) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

/** A git fixture project with one spec, removed afterwards. */
function withProject(callback) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-init-integrations-'));
  try {
    run(root, 'git', ['init', '-q']);
    write(root, 'docs/specs/auth.md', spec);
    return callback(root);
  } finally {
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-init-integrations-'));
    rmSync(root, { recursive: true, force: true });
  }
}

test('init --apply installs the approved project CLI and commit gate through the bundle', () => {
  withProject((root) => {
    run(root, 'git', ['config', 'core.hooksPath', '.githooks']);
    const result = run(root, process.execPath, [entry, 'init', '--apply',
      '--project-cli', 'heading-gap,stale-pointer', '--docs-dirs', 'docs/specs,docs/guides', '--commit-gate', 'pre-commit']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /^wrote docs\/README\.md$/m);
    assert.match(result.stdout, /^wrote tools\/docs-cli\/index\.mjs$/m);
    assert.match(result.stdout, /^install: npm install --prefix tools\/docs-cli$/m);
    assert.match(result.stdout, /^wrote \.githooks\/pre-commit$/m);
    assert.equal(existsSync(join(root, 'tools/docs-cli/heading-gap.mjs')), true);
    assert.equal(existsSync(join(root, 'tools/docs-cli/line-length.mjs')), false);
    assert.match(readFileSync(join(root, 'tools/docs-cli/index.mjs'), 'utf8'), /DOCS_DIRS = \["docs\/specs","docs\/guides"\]/);
    assert.match(readFileSync(join(root, '.githooks/pre-commit'), 'utf8'), /node tools\/docs-cli\/index\.mjs audit/);

    // Nothing is installed by init; stand in for the printed install before running the CLI.
    assert.equal(existsSync(join(root, 'tools/docs-cli/node_modules')), false);
    cpSync(join(repository, 'node_modules/commander'), join(root, 'tools/docs-cli/node_modules/commander'), { recursive: true });

    // The generated CLI runs, and a repeat apply rewrites only the kit, never a second gate.
    const audit = run(root, process.execPath, ['tools/docs-cli/index.mjs', 'audit']);
    assert.equal(audit.status, 0, audit.stderr + audit.stdout);
    const again = run(root, process.execPath, [entry, 'init', '--apply', '--commit-gate', 'pre-commit']);
    assert.equal(again.status, 0, again.stderr + again.stdout);
    assert.equal(again.stdout, '');
  });
});

test('the generated CLI covers the docs root and fails a missing check file', () => {
  withProject((root) => {
    const result = run(root, process.execPath, [entry, 'init', '--apply', '--project-cli', 'line-length', '--docs-dirs', 'docs']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    cpSync(join(repository, 'node_modules/commander'), join(root, 'tools/docs-cli/node_modules/commander'), { recursive: true });
    write(root, 'docs/open-questions.md', `---\ntitle: Open\ntype: open-questions\n---\n\n${'x'.repeat(130)}\n`);

    const audit = run(root, process.execPath, ['tools/docs-cli/index.mjs', 'audit']);
    assert.equal(audit.status, 1, audit.stderr + audit.stdout);
    assert.match(audit.stdout, /^open-questions\.md:6 /m);
    const missing = run(root, process.execPath, ['tools/docs-cli/index.mjs', 'check', 'docs/specs/nope.md']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /no such file/);
  });
});

test('integration flags are refused before init writes anything', () => {
  withProject((root) => {
    const cases = [
      [['--project-cli', 'heading-gap'], /require --apply/],
      [['--apply', '--project-cli', 'bogus'], /unknown house-style rule: bogus/],
      [['--apply', '--docs-dirs', 'docs'], /--docs-dirs requires --project-cli/],
      [['--apply', '--project-cli', 'line-length', '--docs-dirs', 'docs/specs,../src'], /inside docs\/: \.\.\/src/],
      [['--apply', '--commit-gate', 'pre-commit'], /needs the project CLI/],
    ];
    for (const [flags, message] of cases) {
      const result = run(root, process.execPath, [entry, 'init', ...flags]);
      assert.equal(result.status, 2, flags.join(' '));
      assert.match(result.stderr, message);
      assert.equal(existsSync(join(root, 'docs/README.md')), false);
    }
    const badMode = run(root, process.execPath, [entry, 'init', '--apply', '--commit-gate', 'sometimes']);
    assert.equal(badMode.status, 2);
  });
});
