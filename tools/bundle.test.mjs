import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { buildBundle, buildProjectCliAssets, projectCliEntries, repositoryRoot } from './build-bundle.mjs';

const committedBundle = join(repositoryRoot, 'bin/docs-lint.mjs');
const committedProjectCliDir = join(repositoryRoot, 'assets/project-cli');
const regeneration = 'Bundle or project-cli asset is missing or stale; run npm run build';

function assertFresh(candidate, rebuilt) {
  assert.ok(existsSync(candidate), regeneration);
  assert.ok(readFileSync(candidate).equals(readFileSync(rebuilt)), regeneration);
}

async function temporary(run) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-bundle-'));
  try {
    await run(root);
  } finally {
    const location = relative(tmpdir(), root);
    assert.ok(location.startsWith('struct-docs-bundle-') && !location.includes('..'));
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, file, source) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function invoke(entry, cwd, ...args) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.stderr, '');
  return result.stdout;
}

test('committed bundle is byte-fresh, with only Node builtins external and inline runtime licenses', async () => {
  await temporary(async (root) => {
    const rebuilt = join(root, 'docs-lint.mjs');
    const { metafile } = await buildBundle(rebuilt);
    assertFresh(committedBundle, rebuilt);
    const external = Object.values(metafile.outputs).flatMap((output) => output.imports)
      .filter((dependency) => dependency.external);
    assert.ok(external.every(({ path }) => /^(?:node:)?(?:assert|buffer|child_process|events|fs|module|os|path|process|stream|string_decoder|tty|url|util)(?:\/|$)/.test(path)));
    const source = readFileSync(rebuilt, 'utf8');
    assert.ok(source.startsWith('#!/usr/bin/env node\n'));
    assert.match(source, /Copyright \(c\) 2011 TJ Holowaychuk/);
    assert.match(source, /Copyright Eemeli Aro/);
    const stale = join(root, 'stale.mjs');
    writeFileSync(stale, 'stale');
    assert.throws(() => assertFresh(stale, rebuilt), /npm run build/);
    assert.throws(() => assertFresh(join(root, 'missing.mjs'), rebuilt), /npm run build/);
  });
});

test('emitted project-cli assets are byte-fresh and import only each other, Commander and Node builtins', async () => {
  await temporary(async (root) => {
    const rebuiltDir = join(root, 'project-cli');
    const results = await buildProjectCliAssets(rebuiltDir);
    const names = projectCliEntries.map(([name]) => name);
    for (const name of names) {
      const committed = join(committedProjectCliDir, name);
      const rebuilt = join(rebuiltDir, name);
      assertFresh(committed, rebuilt);
      const imports = Object.values(results[name].metafile.outputs)
        .flatMap((output) => output.imports)
        .map((dependency) => dependency.path);
      for (const spec of imports) {
        const validSibling = spec.startsWith('./') && names.includes(spec.slice(2));
        const validExternal = spec === 'commander' || /^node:(?:fs|os|path|child_process|url)$/.test(spec);
        assert.ok(validSibling || validExternal, `unexpected import ${spec} in ${name}`);
      }
      const mutated = join(root, `mutated-${name}`);
      const bytes = Buffer.from(readFileSync(rebuilt));
      bytes[0] ^= 1;
      writeFileSync(mutated, bytes);
      assert.throws(() => assertFresh(mutated, rebuilt), /npm run build/);
    }
  });
});

test('emitted reader and reporter print the same file:line - problem lines and exit status as the bundle', async () => {
  await temporary(async (root) => {
    const readerUrl = pathToFileURL(join(committedProjectCliDir, 'read-document.mjs')).href;
    const reporterUrl = pathToFileURL(join(committedProjectCliDir, 'report.mjs')).href;
    const { frontmatterFindings, readProjectDocument } = await import(readerUrl);
    const { findingsExitCode, formatReport } = await import(reporterUrl);

    write(root, 'docs/specs/bad.md', '---\ntitle: Bad\n  indented: nope\n---\n');
    const bundleBad = spawnSync(process.execPath, [committedBundle, 'check', 'docs/specs/bad.md'], {
      cwd: root, encoding: 'utf8',
    });
    const docBad = readProjectDocument(root, 'docs/specs/bad.md');
    assert.ok(docBad);
    const badFindings = frontmatterFindings(docBad);
    assert.equal(formatReport(badFindings), bundleBad.stdout);
    assert.equal(findingsExitCode(badFindings), bundleBad.status);
    assert.match(bundleBad.stdout, /^specs\/bad\.md:3 - frontmatter:/);
    assert.equal(bundleBad.status, 1);

    write(root, 'docs/specs/clean.md', '---\ntitle: Clean\ntype: spec\nstatus: active\npurpose: Clean spec.\nowns: [clean-spec]\n---\n');
    const bundleClean = spawnSync(process.execPath, [committedBundle, 'check', 'docs/specs/clean.md'], {
      cwd: root, encoding: 'utf8',
    });
    const docClean = readProjectDocument(root, 'docs/specs/clean.md');
    assert.ok(docClean);
    const cleanFindings = frontmatterFindings(docClean);
    assert.equal(formatReport(cleanFindings), bundleClean.stdout);
    assert.equal(findingsExitCode(cleanFindings), bundleClean.status);
    assert.equal(bundleClean.stdout, '');
    assert.equal(bundleClean.status, 0);
  });
});

test('bundle alone supports custom YAML schema, repair, check and silent idempotent audit without dependencies or assets', async () => {
  await temporary((root) => {
    const entry = join(root, 'plugin/bin/docs-lint.mjs');
    mkdirSync(dirname(entry), { recursive: true });
    copyFileSync(committedBundle, entry);
    const project = join(root, 'project');
    write(project, '.struct-docs.yml', 'doctypes:\n  guides:\n    type: guide\n    owns: false\n    fields:\n      audience: { kind: string, required: true }\n');
    write(project, 'docs/guides/start.md', '---\ntitle: Start\ntype: guide\npurpose: Help developers.\naudience: "Developers: all"\n---\n');
    write(project, 'docs/roadmaps/v1/index.md', '---\nid: v1\ntitle: Version one\ntype: roadmap\nstatus: todo\nintent: Ship\nspecs: [guides/start]\n---\n\n### first <!-- status: todo -->\nIntent: Deliver\nAcceptance:\n- [ ] Observable result\n');
    assert.match(invoke(entry, project, 'status'), /next: first\n$/);
    assert.match(invoke(entry, project, 'status', 'docs/roadmaps/v1/index.md'), /^v1 \[todo\]/);
    assert.equal(invoke(entry, project, 'check', 'docs/guides/start.md'), '');
    invoke(entry, project, 'repair');
    assert.equal(invoke(entry, project, 'audit'), '');
    const index = readFileSync(join(project, 'docs/README.md'));
    assert.equal(invoke(entry, project, 'repair'), '');
    assert.deepEqual(readFileSync(join(project, 'docs/README.md')), index);
    assert.equal(invoke(entry, project, 'audit'), '');
    assert.equal(existsSync(join(root, 'node_modules')), false);
    assert.equal(existsSync(join(root, 'plugin/assets')), false);
  });
});

test('bundled init resolves the template beside the plugin and is silent on repeated apply', async () => {
  await temporary((root) => {
    const entry = join(root, 'plugin/bin/docs-lint.mjs');
    mkdirSync(dirname(entry), { recursive: true });
    copyFileSync(committedBundle, entry);
    const template = readFileSync(join(repositoryRoot, 'assets/code-review-v1.md'));
    write(root, 'plugin/assets/code-review-v1.md', template);
    const project = join(root, 'project');
    mkdirSync(project);
    assert.match(invoke(entry, project, 'init', '--apply'), /wrote docs\/README.md/);
    assert.deepEqual(readFileSync(join(project, 'docs/templates/code-review-v1.md')), template);
    assert.equal(invoke(entry, project, 'init', '--apply'), '');
    assert.equal(invoke(entry, project, 'audit'), '');
  });
});
