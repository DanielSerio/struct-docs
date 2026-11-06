import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { clearPending } from '../hooks/pending.mjs';

/** Shared setup for the PostToolUse hook tests. */
export const hook = resolve('hooks/post-write-check.mjs');
export const markers = '<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->\n';
export const source = (type = 'spec') => `---\ntitle: Example\ntype: ${type}\npurpose: Describe something.\n---\n`;

export function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

/** An adopted temporary project, removed (with its sentinel) afterwards. */
export function fixture(run, readme = markers) {
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

/** Run the hook on a Claude-shaped Write payload (or `options.raw`); it must exit 0 quietly. */
export function invoke(root, file, options = {}) {
  const payload = { cwd: root, tool_name: 'Write', tool_input: { file_path: file } };
  const result = spawnSync(process.execPath, [...(options.flags ?? []), options.entry ?? hook], {
    input: options.raw ?? JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '', CLAUDE_PLUGIN_ROOT: 'not-the-plugin', ...options.env },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}
