import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../../tests/utils/temp-docs.js';
import { statusFiles } from '../../../tests/utils/status-fixtures.js';
import { breakoutSource, leafSource, rootSource } from '../../../tests/utils/roadmap-checks.js';
import { run } from './status.js';

test('status prints all roadmap roots in stable order and nests effective breakout progress', () => {
  tempDocs(statusFiles(), (root) => {
    const result = run({ root });
    assert.deepEqual(result.findings, []);
    assert.match(result.stdout ?? '', /^payments \[done\]/);
    assert.match(result.stdout ?? '', /v1 \[in-progress\]\n {2}\[>\] billing {2}\(needs payments:auth\)\n {4}\[x\] checkout\n {4}\[ \] webhooks/);
    assert.match(result.stdout ?? '', /next: webhooks\n$/);
    assert.equal(run({ root }).stdout, result.stdout);
  });
});

test('a file-scoped report preserves hidden ancestor gates and resolves qualified external deps', () => {
  const base = statusFiles();
  const { 'roadmaps/v1/billing.md': billing, ...files } = base;
  const fixtures = { ...files, 'roadmaps/v1/billing.MD': billing };
  fixtures['roadmaps/payments/index.md'] = rootSource('payments', leafSource('auth'));
  tempDocs(fixtures, (root) => {
    for (const file of ['docs/roadmaps/v1/billing.md', 'docs\\roadmaps\\v1\\billing.MD', join(root, 'docs/roadmaps/v1/billing.md')]) {
      const result = run({ root, file });
      assert.deepEqual(result.findings, []);
      assert.match(result.stdout ?? '', /^billing \[in-progress\]/);
      assert.doesNotMatch(result.stdout ?? '', /\] later|^payments \[/m);
      assert.match(result.stdout ?? '', /gated on payments:auth/);
    }
  });
});

test('status rejects model errors with source findings and an audit remedy', () => {
  const cases: Record<string, string>[] = [
    { 'roadmaps/v1/index.md': '---\nid: [broken\n---\n' },
    { 'roadmaps/v1/index.md': rootSource('v1', '### malformed heading\n') },
    { 'roadmaps/v1/index.md': rootSource().replace('type: roadmap', 'type: spec') },
    { 'roadmaps/v1/index.md': rootSource('v1', leafSource('same') + leafSource('same')) },
    { 'roadmaps/v1/index.md': rootSource('v1', '### missing <!-- status: todo -->\nBreakout: ./missing.md\n') },
    { 'roadmaps/v1/index.md': rootSource('v1', leafSource('a', 'todo', 'Deps: missing\n')) },
    { 'roadmaps/v1/only.md': breakoutSource('only') },
  ];
  for (const files of cases) tempDocs(files, (root) => {
    const result = run({ root });
    assert.equal(result.stdout, undefined);
    assert.ok(result.findings.length);
    assert.ok(result.findings.every((finding) => finding.severity === 'error' && /docs-lint audit/.test(finding.message)));
  });
});

test('cycles render qualified paths while unrelated document and index findings do not hide status', () => {
  tempDocs({
    'roadmaps/v1/index.md': rootSource('v1', leafSource('a', 'todo', 'Deps: b\n') + leafSource('b', 'todo', 'Deps: a\n')),
    'specs/broken.md': '---\nbad: [unclosed\n---\n',
    'README.md': 'An uninitialized index.\n',
  }, (root) => {
    const result = run({ root });
    assert.deepEqual(result.findings, []);
    assert.match(result.stdout ?? '', /next: cyclic - v1:a -> v1:b -> v1:a/);
  });
});

test('outside paths are usage errors even with bad config; missing scoped files point at audit', () => {
  tempDocs({}, (root) => {
    writeFileSync(join(root, '.struct-docs.yml'), 'unknown: true\n');
    for (const file of ['', 'docs/specs/a.md', '../outside.md', 'docs/roadmaps/../../outside.md']) {
      assert.throws(() => run({ root, file }), /inside docs\/roadmaps/);
    }
  });
  tempDocs(statusFiles(), (root) => {
    for (const file of ['docs/roadmaps/v1/missing.md', 'docs/roadmaps/v1/index']) {
      const result = run({ root, file });
      assert.match(result.findings[0]?.message ?? '', /not a modeled.*docs-lint audit/);
    }
  });
});

test('scoped status refuses directory symlinks rather than following an outside tree', () => {
  tempDocs(statusFiles(), (root) => {
    const outside = join(root, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(root, 'docs/roadmaps/linked'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => run({ root, file: 'docs/roadmaps/linked/index.md' }), /symbolic links/);
  });
});

test('an absent docs tree produces an explicit read-only status response', () => {
  tempDocs({}, (root) => assert.deepEqual(run({ root }), { findings: [], stdout: 'No roadmaps found.\n' }));
});
