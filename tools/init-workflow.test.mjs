import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));
const fixture = join(repository, 'tests/fixtures/workflows/init');
const entry = join(repository, 'bin/docs-lint.mjs');

function snapshot(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const path = join(root, item.name);
    return item.isDirectory() ? snapshot(path) : [[path, statSync(path, { bigint: true }).mtimeNs, readFileSync(path)]];
  });
}

function invoke(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, expected, result.stderr + result.stdout);
  assert.equal(result.stderr, '');
  return result.stdout;
}

function assertTemporary(root) {
  assert.ok(relative(tmpdir(), root).startsWith('struct-docs-init-workflow-'));
}

/** This is the fixed approved fixture plan, not an inference or a general migration engine. */
function applyApprovedPlan(root) {
  assertTemporary(root);
  const plan = readFileSync(join(fixture, 'approved-plan.md'), 'utf8');
  const config = plan.match(/```yaml\r?\n([\s\S]*?)```/)?.[1];
  assert.ok(config);
  const readme = join(root, 'docs/README.md');
  writeFileSync(readme, readFileSync(readme, 'utf8').replace(/<!-- manage-docs:index -->[\s\S]*?<!-- \/manage-docs:index -->/, ''));
  writeFileSync(join(root, '.struct-docs.yml'), config);
  // The check command validates root config before either legacy config file is removed.
  assert.equal(invoke(root, ['check', 'docs/guides/setup.md']), '');
  for (const path of ['docs/.doctypes', 'docs/.docsignore']) rmSync(join(root, path));
  for (const [path, topic] of [['docs/guides/setup.md', 'operator-setup'], ['docs/specs/service.md', 'service-startup']]) {
    const target = join(root, path);
    writeFileSync(target, readFileSync(target, 'utf8').replace(/(purpose: [^\r\n]*\r?\n)/, `$1owns: [${topic}]\n`));
  }
  for (const [old, destination] of [['docs/scratch/session.md', 'docs/living/session.md'],
    ['docs/roadmap/index.md', 'docs/roadmaps/release/index.md']]) {
    const target = join(root, destination);
    mkdirSync(dirname(target), { recursive: true });
    renameSync(join(root, old), target);
    rmdirSync(dirname(join(root, old)));
  }
  const rootReadme = join(root, 'README.md');
  writeFileSync(rootReadme, readFileSync(rootReadme, 'utf8').replace('docs/roadmap/index.md', 'docs/roadmaps/release/index.md'));
}

function assertNoEmptyDirectories(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  assert.ok(entries.length, `empty directory: ${root}`);
  for (const item of entries) if (item.isDirectory()) assertNoEmptyDirectories(join(root, item.name));
}

test('legacy init stays read-only until its approved fixture plan, then seeds safely and repeats without changes', () => {
  const original = snapshot(join(fixture, 'project'));
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-init-workflow-'));
  try {
    cpSync(join(fixture, 'project'), root, { recursive: true });
    const before = snapshot(root);
    for (const args of [['init'], ['init', '--apply']]) {
      assert.match(invoke(root, args, 1), /approve migration first/);
      assert.deepEqual(snapshot(root), before, 'legacy setup cannot be changed before the plan');
    }
    const roadmap = readFileSync(join(root, 'docs/roadmap/index.md'));
    const notes = readFileSync(join(root, 'docs/scratch/session.md'));
    applyApprovedPlan(root);
    assert.match(invoke(root, ['init', '--apply']), /wrote docs\/templates\/code-review-v1.md/);
    assert.deepEqual(readFileSync(join(root, 'docs/templates/code-review-v1.md')),
      readFileSync(join(repository, 'assets/code-review-v1.md')));
    assert.deepEqual(readFileSync(join(root, 'docs/roadmaps/release/index.md')), roadmap);
    assert.deepEqual(readFileSync(join(root, 'docs/living/session.md')), notes);
    const config = readFileSync(join(root, '.struct-docs.yml'), 'utf8');
    assert.match(config, /type: guide/);
    assert.match(config, /Generated API reference; regenerated from the service schema/);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /Authored introduction remains/);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /Authored footer remains/);
    assert.match(readFileSync(join(root, 'README.md'), 'utf8'), /docs\/roadmaps\/release\/index.md/);
    for (const legacy of ['docs/.doctypes', 'docs/.docsignore', 'docs/roadmap', 'docs/scratch']) {
      assert.equal(existsSync(join(root, legacy)), false);
    }
    assertNoEmptyDirectories(root);
    assert.deepEqual(snapshot(join(root, 'docs')).map(([path]) => relative(join(root, 'docs'), path).replaceAll('\\', '/')).sort(), [
      'README.md', 'generated/api.md', 'guides/setup.md', 'living/session.md',
      'roadmaps/release/index.md', 'specs/service.md', 'templates/code-review-v1.md',
    ], 'initialization adds no placeholder documents');
    assert.equal(invoke(root, ['audit']), '');
    const initialized = snapshot(root);
    for (const args of [['init', '--apply'], ['repair'], ['audit']]) {
      assert.equal(invoke(root, args), '');
      assert.deepEqual(snapshot(root), initialized);
    }
    assert.deepEqual(snapshot(join(fixture, 'project')), original, 'the original fixture is never migrated');
  } finally {
    assertTemporary(root);
    rmSync(root, { recursive: true, force: true });
  }
});
