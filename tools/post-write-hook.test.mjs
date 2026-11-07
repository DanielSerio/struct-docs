import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { HOOK_TIMEOUTS } from '../hooks/limits.mjs';
import { isPending, sentinelPath, clearPending } from '../hooks/pending.mjs';
import { fixture, invoke, markers, source, write } from './post-write-fixture.mjs';

function replayFixture(name, root, targetRelative = 'docs/example.md', second = '/workspace/second') {
  const raw = readFileSync(resolve('tests/fixtures/hooks', name), 'utf8')
    // Antigravity sends a Windows path as written, backslashes and all (JSON-escaped here).
    // Any captured docs file in the project root becomes the file under test.
    .replace(/\\\\workspace\\\\project\\\\docs\\\\[^"]*/g, () => JSON.stringify(join(root, targetRelative)).slice(1, -1))
    .replaceAll('/workspace/second', second.replaceAll('\\', '/'))
    .replaceAll('/workspace/project/docs/example.md', join(root, targetRelative).replaceAll('\\', '/'))
    .replaceAll('docs/example.md', targetRelative)
    .replaceAll('/workspace/project', root.replaceAll('\\', '/'));
  return { raw, payload: JSON.parse(raw) };
}

function snapshot(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? snapshot(path) : [[path, statSync(path, { bigint: true }).mtimeNs, readFileSync(path)]];
  });
}

function copiedHook(root, cli) {
  for (const name of ['post-write-check.mjs', 'lib.mjs', 'limits.mjs', 'project.mjs', 'project-root.mjs', 'pending.mjs']) {
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

test('the pending flag names one checkout however its path is spelled', () => {
  fixture((root) => {
    const link = `${root}-link`;
    symlinkSync(root, link, 'junction');
    try {
      assert.equal(sentinelPath(link), sentinelPath(root));
      if (process.platform === 'win32') assert.equal(sentinelPath(root.toUpperCase()), sentinelPath(root));
      // A write reported through the link arms the flag that Stop finds from the real path.
      write(root, 'docs/specs/linked.md', source());
      invoke(link, join(link, 'docs/specs/linked.md'));
      assert.equal(isPending(root), true);
    } finally {
      rmSync(link, { force: true });
    }
  });
});

test('a host directory below the project still checks and arms the adopted project', () => {
  fixture((root) => {
    const path = write(root, 'docs/specs/Bad_Name.md', source('review'));
    const cwd = join(root, 'src');
    mkdirSync(cwd, { recursive: true });
    for (const file of [path, '../docs/specs/Bad_Name.md']) {
      const raw = JSON.stringify({ cwd, tool_name: 'Write', tool_input: { file_path: file } });
      assert.match(invoke(root, path, { raw }), /specs\/Bad_Name\.md:\d+ - .*kebab-case/);
      assert.equal(isPending(root), true);
      clearPending(root);
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

test('replaying each host PostToolUse fixture produces equivalent findings, sentinel and host output', () => {
  fixture((root) => {
    const cleanRel = 'docs/specs/clean.md';
    write(root, cleanRel, source('spec'));
    const claudeClean = invoke(root, cleanRel, { raw: replayFixture('claude-post-tool-use.json', root, cleanRel).raw });
    assert.equal(claudeClean, '');
    assert.equal(isPending(root), true);
    clearPending(root);

    const codexClean = invoke(root, cleanRel, { raw: replayFixture('codex-post-tool-use.json', root, cleanRel).raw });
    assert.equal(codexClean, '');
    assert.equal(isPending(root), true);
    clearPending(root);

    for (const fixtureName of ['antigravity-post-tool-use.json', 'antigravity-post-tool-use-edit.json']) {
      const agyClean = invoke(root, cleanRel, { raw: replayFixture(fixtureName, root, cleanRel).raw });
      assert.deepEqual(JSON.parse(agyClean), {});
      assert.equal(isPending(root), true);
      clearPending(root);
    }

    const badRel = 'docs/specs/Bad_Name.md';
    write(root, badRel, source('review'));
    const claudeBad = invoke(root, badRel, { raw: replayFixture('claude-post-tool-use.json', root, badRel).raw });
    assert.match(claudeBad, /specs\/Bad_Name\.md:\d+ - .*kebab-case/);
    assert.match(claudeBad, /specs\/Bad_Name\.md:\d+ - .*type `review`/);
    assert.equal(isPending(root), true);
    clearPending(root);

    const codexBad = invoke(root, badRel, { raw: replayFixture('codex-post-tool-use.json', root, badRel).raw });
    assert.equal(codexBad, claudeBad);
    assert.equal(isPending(root), true);
    clearPending(root);

    for (const fixtureName of ['antigravity-post-tool-use.json', 'antigravity-post-tool-use-edit.json']) {
      const agyFixture = replayFixture(fixtureName, root, badRel);
      assert.equal('result' in agyFixture.payload, false);
      const agyBad = JSON.parse(invoke(root, badRel, { raw: agyFixture.raw }));
      assert.deepEqual(agyBad, { overwriteResult: claudeBad.trimEnd() });
      assert.equal(isPending(root), true);
      clearPending(root);
    }

    // A later version that drops fields the hook never reads is still recognized.
    const { conversationId, workspacePaths, toolCall } = replayFixture('antigravity-post-tool-use-edit.json', root, badRel).payload;
    const minimal = JSON.stringify({ conversationId, workspacePaths, toolCall });
    assert.deepEqual(JSON.parse(invoke(root, badRel, { raw: minimal })), { overwriteResult: claudeBad.trimEnd() });
    assert.equal(isPending(root), true);
  });
});

test('an Antigravity write in any workspace root checks and arms that root', () => {
  fixture((first) => fixture((second) => {
    const badRel = 'docs/specs/Bad_Name.md';
    write(second, badRel, source('review'));
    const { payload } = replayFixture('antigravity-post-tool-use.json', first, badRel, second);
    for (const path of [join(second, badRel), badRel]) {
      const raw = JSON.stringify({ ...payload, toolCall: { ...payload.toolCall, args: { ...payload.toolCall.args, Path: path } } });
      assert.match(JSON.parse(invoke(first, badRel, { raw })).overwriteResult, /specs\/Bad_Name\.md:\d+ - .*kebab-case/);
      assert.equal(isPending(second), true);
      assert.equal(isPending(first), false);
      clearPending(second);
    }
  }));
});

test('unrecognized PostToolUse payloads exit 0 with the host empty output or nothing', () => {
  fixture((root) => {
    write(root, 'docs/specs/Bad_Name.md', source('review'));
    const { payload: base } = replayFixture('antigravity-post-tool-use.json', root);
    for (const payload of [
      { ...base, toolCall: { name: 'run_command', args: { CommandLine: 'npm test' } } },
      { ...base, workspacePaths: [] },
      { ...base, toolCall: undefined },
    ]) {
      const output = invoke(root, '', { raw: JSON.stringify(payload) });
      assert.deepEqual(JSON.parse(output), {});
      assert.equal(isPending(root), false);
    }
    for (const payload of [
      { unknown: true },
      { conversationId: 'partial-antigravity' },
      { cwd: root, tool_name: 'Bash', tool_input: { command: 'echo hi' } },
    ]) {
      assert.equal(invoke(root, '', { raw: JSON.stringify(payload) }), '');
      assert.equal(isPending(root), false);
    }
  });
});

test('a host that never closes stdin gets a silent exit within the work budget, not a host kill', async () => {
  const started = Date.now();
  // stdin stays open: nothing is written to it and it is never ended.
  const child = spawn(process.execPath, [resolve('hooks/post-write-check.mjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const [code] = await once(child, 'exit');
  const elapsed = Date.now() - started;
  assert.equal(code, 0);
  assert.equal(output, '');
  assert.ok(elapsed < (HOOK_TIMEOUTS.PostToolUse - 1) * 1000, String(elapsed));
});
