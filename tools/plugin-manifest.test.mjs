import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { clearPending, isPending } from '../hooks/pending.mjs';
import { validatePlugin } from './plugin-manifest.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));

function copiedPlugin(run) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-plugin-'));
  const install = join(root, 'install');
  mkdirSync(install);
  for (const path of ['.claude-plugin', 'skills', 'hooks', 'README.md', 'bin/docs-lint.mjs', 'assets/code-review-v1.md']) {
    mkdirSync(dirname(join(install, path)), { recursive: true });
    cpSync(join(repository, path), join(install, path), { recursive: true });
  }
  try {
    run(install, root);
  } finally {
    clearPending(join(root, 'project'));
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-plugin-'));
    rmSync(root, { recursive: true, force: true });
  }
}

function changeManifest(root, mutate) {
  const path = join(root, '.claude-plugin/plugin.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  mutate(manifest);
  writeFileSync(path, JSON.stringify(manifest));
}

test('the real plugin and its five auto-discovered skills reference existing bundled commands and assets', () => {
  assert.deepEqual(validatePlugin(repository), []);
});

test('missing referenced bundle, asset and imported hook helper fail plugin validation', () => {
  for (const path of ['bin/docs-lint.mjs', 'assets/code-review-v1.md', 'hooks/pending.mjs']) {
    copiedPlugin((root) => {
      rmSync(join(root, path));
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing referenced file: ${path}`)));
    });
  }
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => { manifest.hooks.Stop[0].hooks[0].command = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/missing.mjs"'; });
    assert.ok(validatePlugin(root).some((message) => message.includes('hooks/missing.mjs')));
  });
});

test('a missing skill file or a name that differs from its directory fails validation', () => {
  copiedPlugin((root) => {
    const path = join(root, 'skills/review/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('name: review', 'name: another-review'));
    assert.ok(validatePlugin(root).some((message) => message.includes('skill directory/name mismatch')));
    rmSync(path);
    assert.ok(validatePlugin(root).some((message) => message.includes('skills/review/SKILL.md')));
  });
});

test('both hook events and the Write|Edit matcher are required', () => {
  for (const event of ['PostToolUse', 'Stop']) copiedPlugin((root) => {
    changeManifest(root, (manifest) => { delete manifest.hooks[event]; });
    assert.ok(validatePlugin(root).some((message) => message.includes(`missing or invalid ${event} hook`)));
  });
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => { manifest.hooks.PostToolUse[0].matcher = 'Read'; });
    assert.ok(validatePlugin(root).some((message) => message.includes('must match Write|Edit')));
  });
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => {
      manifest.hooks.PostToolUse[0].matcher = 'Read';
      manifest.hooks.PostToolUse.push({ matcher: 'Write|Edit', hooks: [] }, null, { hooks: [null] });
    });
    assert.ok(validatePlugin(root).some((message) => message.includes('missing or invalid PostToolUse hook')));
  });
});

test('skill invocations of commands absent from the shipped bundle fail validation', () => {
  for (const replacement of ['/bin/docs-lint.mjs" invented-command', '/scripts/commands/manage-docs.mjs" audit']) copiedPlugin((root) => {
    const path = join(root, 'skills/audit/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('/bin/docs-lint.mjs" audit', replacement));
    assert.ok(validatePlugin(root).some((message) => message.includes('unknown bundled command')));
  });
  copiedPlugin((root) => {
    const path = join(root, 'skills/audit/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs', 'C:/old-plugin/docs-lint.mjs'));
    assert.ok(validatePlugin(root).some((message) => message.includes('unknown bundled command')));
  });
});

test('a git-style copy runs both real hooks and the bundle without node_modules', () => {
  copiedPlugin((install, container) => {
    assert.deepEqual(validatePlugin(install), []);
    assert.equal(existsSync(join(install, 'node_modules')), false);
    const root = join(container, 'project');
    mkdirSync(join(root, 'docs/specs'), { recursive: true });
    writeFileSync(join(root, 'docs/README.md'), '# Docs\n\n<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->\n');
    writeFileSync(join(root, 'docs/specs/Bad_Name.md'), '---\ntitle: Example\ntype: spec\nstatus: active\npurpose: Explain policy\nowns: [policy]\n---\n');
    const env = { ...process.env, NODE_PATH: '', CLAUDE_PLUGIN_ROOT: install };
    const post = spawnSync(process.execPath, [join(install, 'hooks/post-write-check.mjs')], {
      cwd: root, env, encoding: 'utf8',
      input: JSON.stringify({ cwd: root, tool_name: 'Write', tool_input: { file_path: 'docs/specs/Bad_Name.md' } }),
    });
    assert.ifError(post.error);
    assert.equal(post.status, 0, post.stderr);
    assert.equal(post.stderr, '');
    assert.match(post.stdout, /specs\/Bad_Name.md:\d+ - .*kebab-case/);
    assert.equal(isPending(root), true);
    const stop = spawnSync(process.execPath, [join(install, 'hooks/stop-repair.mjs')], {
      cwd: root, env, encoding: 'utf8', input: JSON.stringify({ cwd: root }),
    });
    assert.ifError(stop.error);
    assert.equal(stop.status, 0, stop.stderr);
    assert.equal(stop.stdout, '');
    assert.equal(stop.stderr, '');
    assert.equal(isPending(root), false);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /specs\/Bad_Name.md/);
  });
});
