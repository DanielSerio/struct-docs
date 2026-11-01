import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { staleRoadmapFiles } from '../../tests/utils/repair-fixtures.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import { cleanAuditFiles } from '../../tests/utils/audit-fixtures.js';
import { leafSource, rootSource } from '../../tests/utils/roadmap-checks.js';
import { auditProject } from '../check/audit.js';
import { applyRepairs } from './apply.js';

const read = (root: string, path: string) => readFileSync(join(root, 'docs', path), 'utf8');

test('one repair rolls up nested statuses, preserves quotes/comments/EOLs and refreshes a current-old index', () => {
  const files = staleRoadmapFiles();
  tempDocs(files, (root) => {
    const before = auditProject(root); assert.ok(before.ok);
    assert.equal(before.findings.filter((finding) => finding.severity === 'error').length, 0);
    assert.equal(before.findings.filter((finding) => finding.severity === 'repairable').length, 4);
    assert.ok(read(root, 'README.md').includes('**todo**'));
    assert.equal(applyRepairs(before.tree, before.findings), 4);
    const expectedRoot = files['roadmaps/v1/index.md']?.replace('status: "todo" # stored', 'status: "done" # stored')
      .replace('### milestone <!-- status: todo -->', '### milestone <!-- status: done -->');
    assert.equal(read(root, 'roadmaps/v1/index.md'), expectedRoot);
    assert.equal(read(root, 'roadmaps/v1/milestone.MD'), files['roadmaps/v1/milestone.MD']?.replace("status: 'todo'", "status: 'done'"));
    assert.ok(read(root, 'README.md').includes('**done**'));
    const paths = ['README.md', 'roadmaps/v1/index.md', 'roadmaps/v1/milestone.MD'];
    const mtimes = paths.map((path) => statSync(join(root, 'docs', path), { bigint: true }).mtimeNs);
    const clean = auditProject(root); assert.ok(clean.ok);
    assert.deepEqual(clean.findings, []);
    assert.equal(applyRepairs(clean.tree, clean.findings), 0);
    assert.deepEqual(paths.map((path) => statSync(join(root, 'docs', path), { bigint: true }).mtimeNs), mtimes);
    assert.ok(before.findings.filter((finding) => finding.severity === 'repairable').every((finding) => finding.repair.applied));
  });
});

test('a changed audited source is not overwritten even when the old status token still matches', () => {
  tempDocs(staleRoadmapFiles(), (root) => {
    const audited = auditProject(root); assert.ok(audited.ok);
    const path = 'roadmaps/v1/index.md';
    const changed = read(root, path).replace('intent: Ship', 'intent: Author changed this');
    writeFileSync(join(root, 'docs', path), changed);
    applyRepairs(audited.tree, audited.findings);
    assert.equal(read(root, path), changed);
    const statuses = audited.findings.filter((finding) => finding.file === path && finding.severity === 'repairable');
    assert.ok(statuses.every((finding) => finding.severity === 'repairable' && !finding.repair.applied));
    assert.ok(read(root, 'README.md').includes('Author changed this'));
  });
});

test('failed descendant parses withhold their whole roadmap while other roadmaps and index repair', () => {
  const files = cleanAuditFiles({
    'roadmaps/v1/index.md': rootSource('v1', '### broken <!-- status: todo -->\nBreakout: ./broken.md\n',
      'specs: [specs/auth]\n').replace('status: todo', 'status: done'),
    'roadmaps/v1/broken.md': '---\nid: broken\n  malformed: value\n---\n',
    'roadmaps/other/index.md': rootSource('other', leafSource('other-task'), 'specs: [specs/auth]\n')
      .replace('status: todo', 'status: done'),
  });
  tempDocs(files, (root) => {
    const audit = auditProject(root); assert.ok(audit.ok);
    const withheld = audit.findings.filter((finding) => finding.file === 'roadmaps/v1/index.md' && finding.severity === 'repairable');
    assert.ok(withheld.length > 0 && withheld.every((finding) => finding.severity === 'repairable' && finding.repair.withheld));
    applyRepairs(audit.tree, audit.findings);
    assert.equal(read(root, 'roadmaps/v1/index.md'), files['roadmaps/v1/index.md']);
    assert.equal(read(root, 'roadmaps/v1/broken.md'), files['roadmaps/v1/broken.md']);
    assert.match(read(root, 'roadmaps/other/index.md'), /^status: todo$/m);
    const next = auditProject(root); assert.ok(next.ok);
    assert.equal(applyRepairs(next.tree, next.findings), 0);
  });
});

test('missing authored fields and parent copies are errors, never repair instructions', () => {
  const files = staleRoadmapFiles();
  files['specs/auth.md'] = (files['specs/auth.md'] ?? '').replace('purpose: Account behavior.\n', '').replace('owns: [accounts]\n', '');
  files['roadmaps/v1/index.md'] = (files['roadmaps/v1/index.md'] ?? '').replace('Breakout:', 'Title: Duplicate\nIntent: Duplicate\nBreakout:');
  tempDocs(files, (root) => {
    const audit = auditProject(root); assert.ok(audit.ok);
    applyRepairs(audit.tree, audit.findings);
    assert.equal(read(root, 'specs/auth.md'), files['specs/auth.md']);
    assert.equal(read(root, 'roadmaps/v1/index.md'), files['roadmaps/v1/index.md']);
    assert.ok(read(root, 'roadmaps/v1/milestone.MD').includes('- [ ] Observable result'));
  });
});


test('dependency cycles withhold every involved roadmap while an unrelated roadmap repairs', () => {
  const source = (name: string, id: string, dep = '') => rootSource(name, leafSource(id, 'todo', dep),
    'specs: [specs/auth]\n').replace('status: todo', 'status: done');
  const files = cleanAuditFiles({
    'roadmaps/v1/index.md': source('v1', 'a', 'Deps: v2:b\n'),
    'roadmaps/v2/index.md': source('v2', 'b', 'Deps: v1:a\n'),
    'roadmaps/other/index.md': source('other', 'unrelated'),
  });
  tempDocs(files, (root) => {
    const audit = auditProject(root); assert.ok(audit.ok);
    for (const name of ['v1', 'v2']) {
      assert.ok(audit.findings.some((finding) => finding.file === `roadmaps/${name}/index.md` &&
        finding.severity === 'repairable' && finding.repair.withheld));
    }
    applyRepairs(audit.tree, audit.findings);
    assert.equal(read(root, 'roadmaps/v1/index.md'), files['roadmaps/v1/index.md']);
    assert.equal(read(root, 'roadmaps/v2/index.md'), files['roadmaps/v2/index.md']);
    assert.match(read(root, 'roadmaps/other/index.md'), /^status: todo$/m);
  });
});


test('derived-status rule imports remain pure', () => {
  assertPureRuleImports('scripts/roadmap/derived-status.ts');
});
