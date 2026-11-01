import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkedRoadmaps, rootSource, breakoutSource, leafSource } from '../../tests/utils/roadmap-checks.js';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { defaultConfig } from '../policy/config-defaults.js';
import { loadTree } from '../read/tree.js';
import { createRoadmapContext } from './context.js';
import { createRoadmapCheckContext } from './check-context.js';
import { roadmapRule } from './roadmap-rule.js';

const parent = '### billing <!-- status: todo -->\nBreakout: ./billing.md\n';
const base = () => ({ 'roadmaps/v1/index.md': rootSource('v1', parent),
  'roadmaps/v1/billing.MD': breakoutSource('billing') });

test('a body node and its linked breakout share one tree-wide identity', () => {
  assert.deepEqual(checkedRoadmaps(base()).findings, []);
});

test('duplicate ids across files identify the other declaration at a source line', () => {
  const files = base();
  files['roadmaps/v1/billing.MD'] = breakoutSource('billing', leafSource('billing'));
  const result = checkedRoadmaps(files).findings;
  assert.ok(result.some((finding) => /duplicate id `billing`/.test(finding.message) &&
    /roadmaps\/v1\/index.md:11/.test(finding.message) && finding.file.endsWith('billing.MD') && finding.line === 11));
  const rootCollision = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1', leafSource('v1')) });
  assert.ok(rootCollision.findings.some((finding) => /duplicate id `v1`/.test(finding.message)));
});

test('missing and mismatched breakouts report the parent Breakout line', () => {
  const missing = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1', parent) });
  assert.ok(missing.findings.some((finding) => /not on disk/.test(finding.message) && finding.line === 12));
  const mismatch = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1', parent),
    'roadmaps/v1/billing.md': breakoutSource('wrong') });
  assert.ok(mismatch.findings.some((finding) => /target id is `wrong`/.test(finding.message) && finding.line === 12));
});

test('a present breakout with failed frontmatter is a parse error rather than missing on disk', () => {
  tempDocs({ 'roadmaps/v1/index.md': rootSource('v1', parent),
    'roadmaps/v1/billing.md': '---\nid: billing\n  invalid: nested\n---\n' }, (root) => {
    const config = defaultConfig();
    const tree = loadTree(root, config);
    const context = createRoadmapCheckContext({ ...createRoadmapContext(config, tree.documents), files: new Set(tree.files) });
    const findings = tree.documents.flatMap((document) => roadmapRule({ ...document, context }));
    assert.equal(findings.some((finding) => /not on disk/.test(finding.message)), false);
    assert.equal(tree.findings.filter((finding) => finding.file.endsWith('billing.md')).length, 1);
  });
});

test('missing dependencies report Deps source lines while qualified same-named targets resolve', () => {
  const files = { 'roadmaps/v1/index.md': rootSource('v1', leafSource('auth') + leafSource('use', 'todo', 'Deps: payments:auth\n')),
    'roadmaps/payments/index.md': rootSource('payments', leafSource('auth')) };
  assert.deepEqual(checkedRoadmaps(files).findings, []);
  const result = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1', leafSource('task', 'todo', 'Deps: missing\n')) });
  assert.ok(result.findings.some((finding) => /dep `missing` resolves to no node/.test(finding.message) && finding.line === 15));
});

test('a dependency cycle reports every involved roadmap for independent withholding', () => {
  const across = checkedRoadmaps({
    'roadmaps/v1/index.md': rootSource('v1', leafSource('auth', 'todo', 'Deps: next:auth\n')),
    'roadmaps/next/index.md': rootSource('next', leafSource('auth', 'todo', 'Deps: v1:auth\n')),
  }).findings.filter((finding) => finding.rule === 'roadmap-cycle');
  assert.deepEqual(new Set(across.map((finding) => finding.file)),
    new Set(['roadmaps/v1/index.md', 'roadmaps/next/index.md']));
  assert.ok(across.every((finding) => finding.line === 11 && /v1:auth/.test(finding.message) && /next:auth/.test(finding.message)));
  const local = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1',
    leafSource('one', 'todo', 'Deps: two\n') + leafSource('two', 'todo', 'Deps: one\n')) });
  assert.equal(local.findings.filter((finding) => finding.rule === 'roadmap-cycle').length, 1);
});

test('superseding node targets resolve for both file-level and body fields', () => {
  const next = { 'roadmaps/next/index.md': rootSource('next', leafSource('replacement')) };
  assert.deepEqual(checkedRoadmaps({ ...next, 'roadmaps/v1/index.md': rootSource('v1',
    leafSource('cut-task', 'cut', 'Superseded-by: next:replacement\n'), 'superseded-by: next:replacement\n') }).findings, []);
  const missing = checkedRoadmaps({ 'roadmaps/v1/index.md': rootSource('v1',
    leafSource('cut-task', 'cut', 'Superseded-by: next:missing\n'), 'superseded-by: next:missing\n') });
  const replacements = missing.findings.filter((finding) => finding.rule === 'roadmap-replacement');
  assert.deepEqual(replacements.map((finding) => finding.line), [7, 16]);
});
