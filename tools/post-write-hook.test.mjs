import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { isPending, sentinelPath, clearPending } from '../hooks/pending.mjs';

const hook = resolve('hooks/post-write-check.mjs');
const markers = '<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->\n';
const source = (type = 'spec') => `---\ntitle: Example\ntype: ${type}\npurpose: Describe something.\n---\n`;

function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function fixture(run, readme = markers) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-post-write-'));
  write(root, 'docs/README.md', readme);
  try {
    run(root);
  } finally {
    clearPending(root);
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-post-write-'));
    rmSync(root, { recursive: true, force: true });
  }
}

function invoke(root, file, options = {}) {
  const payload = { cwd: root, tool_name: 'Write', tool_input: { file_path: file } };
  const result = spawnSync(process.execPath, [options.entry ?? hook], {
    input: options.raw ?? JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '', CLAUDE_PLUGIN_ROOT: 'not-the-plugin' },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

function snapshot(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? snapshot(path) : [[path, statSync(path, { bigint: true }).mtimeNs, readFileSync(path)]];
  });
}

function copiedHook(root, cli) {
  for (const name of ['post-write-check.mjs', 'lib.mjs', 'pending.mjs']) {
    const target = join(root, 'plugin/hooks', name);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve('hooks', name), target);
  }
  write(root, 'plugin/bin/docs-lint.mjs', cli);
  return join(root, 'plugin/hooks/post-write-check.mjs');
}

test('only a unique ordered struct-docs marker pair adopts a project', () => {
  for (const readme of ['', '<!-- manage-docs:index -->\n<!-- /manage-docs:index -->',
    '<!-- struct-docs:index -->', '<!-- /struct-docs:index -->\n<!-- struct-docs:index -->',
    `${markers}${markers}`, `inline ${markers}`]) {
    fixture((root) => {
      const path = write(root, 'docs/specs/bad.md', source('review'));
      assert.equal(invoke(root, path), '');
      assert.equal(isPending(root), false);
    }, readme);
  }
});

test('a real bundle reports naming and placement only for the written file without repairs', () => {
  fixture((root) => {
    const path = write(root, 'docs/specs/Bad_Name.MD', source('review'));
    write(root, 'docs/specs/broken-sibling.md', '---\nbroken: [\n---\n');
    const before = snapshot(root);
    const output = invoke(root, path);
    assert.match(output, /specs\/Bad_Name\.MD:\d+ - .*kebab-case/);
    assert.match(output, /specs\/Bad_Name\.MD:\d+ - .*type `review`/);
    assert.doesNotMatch(output, /broken-sibling|owns|subject|template|index/);
    assert.equal(isPending(root), true);
    assert.deepEqual(snapshot(root), before);
  });
});

test('frontmatter errors report while full-schema and cross-document errors stay silent', () => {
  fixture((root) => {
    write(root, 'docs/specs/parse.md', '---\ntitle: [broken\n---\n');
    assert.match(invoke(root, 'docs/specs/parse.md'), /frontmatter:/);
    clearPending(root);
    write(root, 'docs/specs/valid.md', source());
    assert.equal(invoke(root, 'docs/specs/valid.md'), '', 'missing status and owns are full-schema checks');
    assert.equal(isPending(root), true);
    write(root, '.struct-docs.yml', 'unknown: true\n');
    assert.equal(invoke(root, 'docs/specs/valid.md'), '', 'config errors are not single-file feedback');
  });
});

test('all docs writes and only root config writes arm a path-keyed sentinel', () => {
  fixture((root) => {
    for (const path of ['docs/generated.txt', '.struct-docs.yml']) {
      write(root, path, '# content\n');
      assert.equal(invoke(root, path), '');
      assert.equal(isPending(root), true);
      assert.equal(sentinelPath(root), sentinelPath(join(root, '.')));
      assert.notEqual(sentinelPath(root), sentinelPath(join(root, 'other')));
      clearPending(root);
    }
    for (const path of ['src/index.ts', 'nested/.struct-docs.yml', 'docs-other/file.md']) {
      write(root, path, 'content');
      assert.equal(invoke(root, path), '');
      assert.equal(isPending(root), false);
    }
  });
});

test('malformed payloads, missing files, non-files and unrelated tools are harmless', () => {
  fixture((root) => {
    const path = write(root, 'docs/specs/example.md', source('review'));
    for (const raw of ['', 'not JSON', 'null', '[]', '{}', '{"cwd":4}',
      JSON.stringify({ cwd: root, tool_input: { file_path: 4 } }),
      JSON.stringify({ cwd: root, tool_name: 'Read', tool_input: { file_path: path } })]) {
      assert.equal(invoke(root, path, { raw }), '');
      assert.equal(isPending(root), false);
    }
    for (const file of ['docs/specs/missing.md', 'docs/specs']) {
      assert.equal(invoke(root, file), '');
      assert.equal(isPending(root), false);
    }
  });
});

test('copied hooks bound findings and swallow missing CLI and execution failures', () => {
  fixture((root) => {
    write(root, 'docs/specs/example.md', source());
    const cli = "for (let i=1; i<=9; i++) console.log(`specs/example.md:${i} - problem`); process.exitCode=1;";
    const entry = copiedHook(root, cli);
    const output = invoke(root, 'docs/specs/example.md', { entry });
    assert.equal(output.trimEnd().split('\n').length, 6);
    assert.match(output, /\.\.\. 4 more findings\n$/);
    for (const body of ["throw new Error('execution failure');", 'process.exitCode=2;']) {
      write(root, 'plugin/bin/docs-lint.mjs', body);
      assert.equal(invoke(root, 'docs/specs/example.md', { entry }), '');
    }
    rmSync(join(root, 'plugin/bin/docs-lint.mjs'));
    assert.equal(invoke(root, 'docs/specs/example.md', { entry }), '');
  });
});
