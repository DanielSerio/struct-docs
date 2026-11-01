import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { cleanAuditFiles, specSource } from '../../tests/utils/audit-fixtures.js';
import { INDEX_OPEN } from '../policy/index.js';
import { applyRepairs } from '../repair/apply.js';
import { auditProject } from './audit.js';

const localReview = '---\ntitle: Review\ntype: review\npurpose: Check\nsubject: src/auth\ntemplate: templates/review\n---\n';

test('absent, empty and unadopted local-only trees do not invent a missing index', () => {
  for (const files of [{}, { 'templates/review.md': 'rubric' },
    { 'living/notes.md': 'scratch' }, { 'reviews/local.md': localReview, 'templates/review.md': 'rubric' }]) {
    tempDocs(files, (root) => {
      mkdirSync(join(root, 'docs'), { recursive: true });
      const audit = auditProject(root); assert.ok(audit.ok);
      assert.deepEqual(audit.findings, []);
      assert.equal(applyRepairs(audit.tree, audit.findings), 0);
    });
  }
});

test('an adopted empty index remains maintainable, while shared docs enable missing-index generation', () => {
  for (const files of [{ 'README.md': '# Existing documentation' }, { 'specs/auth.md': specSource() }]) {
    tempDocs(files, (root) => {
      const audit = auditProject(root); assert.ok(audit.ok);
      assert.ok(audit.findings.some((finding) => finding.rule === 'index' && finding.severity === 'repairable'));
      assert.equal(applyRepairs(audit.tree, audit.findings), 1);
      assert.deepEqual(auditProject(root).findings, []);
    });
  }
});

test('ambiguous index markers produce a source finding and never delete authored bytes', () => {
  const source = `# Authored\n${INDEX_OPEN}\nThese bytes have no known closing ownership boundary.\nFooter`;
  tempDocs({ ...cleanAuditFiles(), 'README.md': source }, (root) => {
    const audit = auditProject(root); assert.ok(audit.ok);
    assert.ok(audit.findings.some((finding) => finding.rule === 'index' && finding.severity === 'error'));
    assert.equal(applyRepairs(audit.tree, audit.findings), 0);
    assert.equal(readFileSync(join(root, 'docs/README.md'), 'utf8'), source);
  });
});

test('a shared index is byte-identical with local review files present or absent', () => {
  tempDocs(cleanAuditFiles(), (root) => {
    const original = readFileSync(join(root, 'docs/README.md'), 'utf8');
    mkdirSync(join(root, 'docs/reviews/deep'), { recursive: true });
    mkdirSync(join(root, 'docs/templates'), { recursive: true });
    writeFileSync(join(root, 'docs/reviews/local.md'), localReview);
    writeFileSync(join(root, 'docs/templates/review.md'), 'rubric');
    writeFileSync(join(root, 'docs/reviews/deep/unrouted.markdown'), 'local');
    const audit = auditProject(root); assert.ok(audit.ok);
    assert.equal(audit.findings.filter((finding) => finding.rule === 'index').length, 0);
    assert.equal(applyRepairs(audit.tree, audit.findings), 0);
    assert.equal(readFileSync(join(root, 'docs/README.md'), 'utf8'), original);
  });
});
