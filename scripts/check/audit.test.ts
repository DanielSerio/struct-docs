import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { cleanAuditFiles, specSource } from '../../tests/utils/audit-fixtures.js';
import { leafSource, rootSource } from '../../tests/utils/roadmap-checks.js';
import { auditProject } from './audit.js';

test('audit composes document, reference, ownership and roadmap findings in source order', () => {
  const files = { ...cleanAuditFiles(), 'notes.txt': 'forbidden root artifact',
    'specs/auth.md': specSource('accounts', 'superseded-by: specs/deleted\n'),
    'specs/other.md': specSource('accounts').replace('purpose: Account behavior.\n', ''),
    'specs/broken.md': 'not frontmatter',
    'roadmaps/v1/index.md': rootSource('v1', leafSource('task', 'todo',
      'Deps: missing\nBlocked-on: later\n'), 'specs: [specs/auth]\n') };
  tempDocs(files, (root) => {
    const result = auditProject(root);
    assert.ok(result.ok);
    const rules = new Set(result.findings.map((finding) => finding.rule));
    for (const rule of ['schema', 'reference', 'ownership', 'roadmap-dependency', 'frontmatter', 'roadmap-body', 'layout']) {
      assert.equal(rules.has(rule), true, rule);
    }
    assert.equal(result.findings.find((finding) => finding.severity === 'error')?.file, 'notes.txt');
    assert.equal(result.findings.filter((finding) => finding.rule === 'roadmap-body').length, 1);
    const owners = result.findings.filter((finding) => finding.rule === 'ownership');
    assert.deepEqual(owners.map((finding) => finding.file), ['specs/auth.md', 'specs/other.md']);
    assert.equal(result.findings.find((finding) => finding.rule === 'reference')?.line, 7);
    for (let index = 1; index < result.findings.length; index += 1) {
      const previous = result.findings[index - 1]; const current = result.findings[index];
      assert.ok(previous && current);
      assert.ok(previous.file < current.file || (previous.file === current.file && previous.line <= current.line));
    }
    assert.deepEqual(auditProject(root).findings, result.findings);
  });
});

test('a structurally clean tree including a roadmap and an absent docs tree have no findings', () => {
  for (const files of [cleanAuditFiles(), {}]) tempDocs(files, (root) => {
    const result = auditProject(root);
    assert.ok(result.ok);
    assert.deepEqual(result.findings, []);
  });
});

test('malformed config returns findings without constructing a partially classified tree', () => {
  tempDocs({ 'specs/broken.md': 'not frontmatter' }, (root) => {
    writeFileSync(join(root, '.struct-docs.yml'), '# config\nunknown: true\n');
    const result = auditProject(root);
    assert.equal(result.ok, false);
    assert.equal('tree' in result, false);
    assert.equal(result.findings[0]?.file, '.struct-docs.yml');
    assert.equal(result.findings[0]?.line, 2);
  });
});

test('no-specs warnings follow the final registry and treat an empty list as no references', () => {
  for (const extra of ['', 'specs: []\n']) tempDocs({
    'roadmaps/v1/index.md': rootSource('v1', leafSource(), extra),
  }, (root) => {
    const warning = auditProject(root).findings.filter((finding) => finding.rule === 'roadmap-specs');
    assert.equal(warning.length, 1);
    writeFileSync(join(root, '.struct-docs.yml'), 'doctypes: {specs: null}\n');
    assert.deepEqual(auditProject(root).findings.filter((finding) => finding.rule === 'roadmap-specs'), []);
  });
});

test('unrouted documents warn once per directory and large roadmaps warn without a size cap', () => {
  const body = Array.from({ length: 13 }, (_, index) => leafSource(`task-${index}`)).join('\n');
  tempDocs(cleanAuditFiles({ 'guides/a.md': 'notes', 'guides/nested/b.markdown': 'notes',
    'decisions/old.md': 'legacy',
    'roadmaps/v1/index.md': rootSource('v1', body, 'specs: [specs/auth]\n'),
  }), (root) => {
    const findings = auditProject(root).findings;
    assert.equal(findings.length, 3);
    assert.ok(findings.every((finding) => finding.severity === 'warning'));
    assert.match(findings.find((finding) => finding.file === 'guides/')?.message ?? '', /2 unrouted.*`init`/);
    assert.match(findings.find((finding) => finding.file === 'decisions/')?.message ?? '', /`fold`/);
    assert.match(findings.find((finding) => finding.rule === 'roadmap-size')?.message ?? '', /13 children/);
  });
});
