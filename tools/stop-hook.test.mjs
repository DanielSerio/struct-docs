import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { clearPending, isPending, markPending } from '../hooks/pending.mjs';

const hook = resolve('hooks/stop-repair.mjs');
const markers = '<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->';
const rootSource = '---\nid: v1\ntitle: Version one\ntype: roadmap\nstatus: todo\nintent: Ship\n---\n\nAuthored introduction.\n\n## Milestones\n\n### billing <!-- status: done -->\nBreakout: ./billing.md\n';
const childSource = '---\nid: billing\ntitle: Billing\ntype: roadmap-node\nstatus: todo\nintent: Take payments\n---\n\n## Tasks\n\n### checkout <!-- status: done -->\nIntent: Charge cards\nAcceptance:\n- [x] Payment succeeds\n\n### webhooks <!-- status: todo -->\nIntent: Handle events\nAcceptance:\n- [ ] Events update state\nDeps: checkout\nNotes:\n- Keep this authored note.\n';

function write(root, path, source) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
  return target;
}

function fixture(run, readme = `# Guide\n\n${markers}\n\nAuthored footer.\n`) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-stop-'));
  write(root, 'docs/README.md', readme);
  write(root, 'docs/roadmaps/v1/index.md', rootSource);
  write(root, 'docs/roadmaps/v1/billing.md', childSource);
  try {
    run(root);
  } finally {
    clearPending(root);
    assert.ok(relative(tmpdir(), root).startsWith('struct-docs-stop-'));
    rmSync(root, { recursive: true, force: true });
  }
}

function invoke(root, options = {}) {
  const result = spawnSync(process.execPath, [...(options.flags ?? []), options.entry ?? hook], {
    input: options.raw ?? JSON.stringify({ cwd: root }), encoding: 'utf8', timeout: 19000,
    env: { ...process.env, NODE_PATH: '', CLAUDE_PLUGIN_ROOT: 'wrong-plugin', ...options.env },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

function copiedHook(root, cli) {
  for (const name of ['stop-repair.mjs', 'lib.mjs', 'pending.mjs']) {
    const target = join(root, 'plugin/hooks', name);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve('hooks', name), target);
  }
  const target = join(root, 'plugin/bin/docs-lint.mjs');
  mkdirSync(dirname(target), { recursive: true });
  if (cli === undefined) copyFileSync(resolve('bin/docs-lint.mjs'), target);
  else writeFileSync(target, cli);
  return join(root, 'plugin/hooks/stop-repair.mjs');
}

test('quiet Stop does not read adoption metadata or the docs tree and never invokes the CLI', () => {
  fixture((root) => {
    const entry = copiedHook(root, "import {writeFileSync} from 'node:fs'; writeFileSync('called', 'yes');");
    const preload = write(root, 'probe.mjs', `import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const read = fs.readFileSync;
fs.readFileSync = (path, ...args) => {
  if (String(path).startsWith(process.env.STOP_TEST_DOCS)) fs.writeFileSync(process.env.STOP_TEST_PROBE, 'read');
  return read(path, ...args);
};
syncBuiltinESMExports();`);
    assert.equal(isPending(root), false);
    invoke(root, { entry, flags: ['--import', pathToFileURL(preload).href],
      env: { STOP_TEST_DOCS: join(root, 'docs'), STOP_TEST_PROBE: join(root, 'read-attempt') } });
    assert.equal(existsSync(join(root, 'called')), false);
    assert.equal(existsSync(join(root, 'read-attempt')), false);
    assert.equal(readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8'), rootSource);
  });
});

test('a copied hook and real bundle repair only derived fields and index, then clear pending work', () => {
  fixture((root) => {
    const authored = '---\ntitle: Rules\ntype: spec\nstatus: active\npurpose: Explain rules\nowns: [rules]\n---\n\nAuthored content stays.\n';
    write(root, 'docs/specs/rules.md', authored);
    const entry = copiedHook(root);
    markPending(root);
    invoke(root, { entry });
    assert.equal(isPending(root), false);
    const actualRoot = readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8');
    assert.equal(actualRoot, rootSource.replace('status: todo', 'status: in-progress')
      .replace('billing <!-- status: done -->', 'billing <!-- status: in-progress -->'));
    assert.equal(readFileSync(join(root, 'docs/roadmaps/v1/billing.md'), 'utf8'),
      childSource.replace('status: todo', 'status: in-progress'));
    assert.equal(readFileSync(join(root, 'docs/specs/rules.md'), 'utf8'), authored);
    const index = readFileSync(join(root, 'docs/README.md'), 'utf8');
    assert.ok(index.startsWith('# Guide\n\n'));
    assert.ok(index.endsWith('\n\nAuthored footer.\n'));
    assert.match(index, /roadmaps\/v1\/index.md/);
    assert.equal(existsSync(join(root, 'plugin/node_modules')), false);
    invoke(root, { entry });
    assert.equal(readFileSync(join(root, 'docs/README.md'), 'utf8'), index);
  });
});

test('PostToolUse and Stop agree on the repository sentinel and consume it after repair', () => {
  fixture((root) => {
    invoke(root, { entry: resolve('hooks/post-write-check.mjs'),
      raw: JSON.stringify({ cwd: root, tool_name: 'Write', tool_input: { file_path: 'docs/roadmaps/v1/index.md' } }) });
    assert.equal(isPending(root), true);
    invoke(root);
    assert.equal(isPending(root), false);
    assert.match(readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8'), /^status: in-progress$/m);
  });
});

test('pending work never adopts a project with absent, old, partial or ambiguous markers', () => {
  for (const readme of ['', '<!-- manage-docs:index -->\n<!-- /manage-docs:index -->',
    '<!-- struct-docs:index -->', `inline ${markers}`, `${markers}\n${markers}`]) {
    fixture((root) => {
      markPending(root);
      invoke(root);
      assert.equal(isPending(root), true);
      assert.equal(readFileSync(join(root, 'docs/roadmaps/v1/index.md'), 'utf8'), rootSource);
      assert.equal(readFileSync(join(root, 'docs/README.md'), 'utf8'), readme);
    }, readme);
  }
});

test('repair failures and malformed payloads stay silent and retain the sentinel for a retry', () => {
  fixture((root) => {
    markPending(root);
    for (const raw of ['', 'not JSON', 'null', '[]', '{}', '{"cwd":4}']) {
      invoke(root, { raw });
      assert.equal(isPending(root), true);
    }
    write(root, '.struct-docs.yml', 'unknown: true\n');
    invoke(root);
    assert.equal(isPending(root), true);
    const entry = copiedHook(root, "console.log('must stay silent'); console.error('also silent'); process.exitCode=2;");
    invoke(root, { entry });
    assert.equal(isPending(root), true);
    rmSync(join(root, 'plugin/bin/docs-lint.mjs'));
    invoke(root, { entry });
    assert.equal(isPending(root), true);
    write(root, 'plugin/bin/docs-lint.mjs', "if(process.argv[2] !== 'repair') process.exit(3); console.log('hidden'); console.error('hidden');");
    invoke(root, { entry });
    assert.equal(isPending(root), false);
  });
});

test('a timed-out repair exits zero silently and leaves pending work intact', () => {
  fixture((root) => {
    const preload = write(root, 'timeout.mjs', `import childProcess from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
childProcess.spawnSync = (command, args, options) => {
  writeFileSync(process.env.STOP_TEST_PROBE, JSON.stringify({args, timeout:options.timeout}));
  return {status:null, error:Object.assign(new Error('timeout'), {code:'ETIMEDOUT'})};
};
syncBuiltinESMExports();`);
    markPending(root);
    const probe = join(root, 'attempt');
    invoke(root, { flags: ['--import', pathToFileURL(preload).href], env: { STOP_TEST_PROBE: probe } });
    assert.equal(isPending(root), true);
    assert.deepEqual(JSON.parse(readFileSync(probe, 'utf8')), {
      args: [resolve('bin/docs-lint.mjs'), 'repair'], timeout: 14000,
    });
  });
});
