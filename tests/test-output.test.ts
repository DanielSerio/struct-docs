import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('test builds discard their own dist from any working directory and nothing else', () => {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-test-output-'));
  try {
    mkdirSync(join(root, 'tools'));
    copyFileSync(resolve('tools/clean-test-output.mjs'), join(root, 'tools/clean-test-output.mjs'));
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist/removed.test.js'), 'throw new Error("stale test ran");');
    mkdirSync(join(root, 'elsewhere/dist'), { recursive: true });
    for (let run = 0; run < 2; run += 1) {
      const result = spawnSync(process.execPath, [join(root, 'tools/clean-test-output.mjs')],
        { cwd: join(root, 'elsewhere'), encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(join(root, 'dist')), false);
      assert.equal(existsSync(join(root, 'elsewhere/dist')), true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
