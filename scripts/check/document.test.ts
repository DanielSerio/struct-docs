import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from '../policy/classify.js';
import { defaultConfig } from '../policy/config-defaults.js';
import type { Config } from '../policy/config-types.js';
import type { ParsedDocument, FrontmatterValue } from '../policy/document.js';
import { parseConfig } from '../read/config.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import { documentRule } from './document.js';
import { filingRule } from './document-filing.js';
import { schemaRule } from './document-schema.js';

const spec = { title: 'Auth', type: 'spec', purpose: 'How sign-in works', status: 'active' };
function document(path: string, data: Record<string, FrontmatterValue>, config: Config = defaultConfig()): ParsedDocument {
  const locations = Object.fromEntries(Object.keys(data).map((name, index) =>
    [name, { line: index + 2, start: name.length + 2, end: name.length + 3 }]));
  return { path, source: '', lines: [], classification: classify(path, config), context: { config },
    frontmatter: { ok: true, data, locations, endLine: Object.keys(data).length + 2 } };
}
const messages = (value: ParsedDocument) => documentRule(value).map((finding) => finding.message).join(' | ');

test('ported valid types and stable review names pass without per-type filename branches', () => {
  assert.deepEqual(documentRule(document('specs/auth.md', spec)), []);
  assert.deepEqual(documentRule(document('product/vision.md', { title: 'Vision', type: 'prd', purpose: 'Why this exists' })), []);
  assert.deepEqual(documentRule(document('reviews/auth.md', { title: 'Review', type: 'review', purpose: 'Check auth',
    subject: 'src/some/deep/path', template: 'templates/code-review-v1' })), []);
});

test('missing base and configured fields are findings at the missing-field fallback line', () => {
  const result = documentRule(document('specs/auth.md', { type: 'spec' }));
  for (const field of ['title', 'purpose', 'status']) {
    assert.ok(result.some((finding) => finding.line === 1 && finding.message.includes(`missing \`${field}\``)));
  }
  assert.equal(documentRule(document('specs/auth.md', {})).filter((finding) => finding.message === 'missing `type`').length, 1);
});

test('type mismatch, filename and invalid fields retain their independent source locations', () => {
  const value = document('specs/My_Auth.MD', { ...spec, type: 'review', status: 'wip', purpose: [] });
  const result = documentRule(value);
  assert.ok(result.some((finding) => finding.rule === 'filename' && finding.line === 1));
  assert.ok(result.some((finding) => finding.rule === 'type' && finding.line === 3 && /expected `spec`/.test(finding.message)));
  assert.ok(result.some((finding) => finding.rule === 'schema' && finding.line === 4 && /purpose/.test(finding.message)));
  assert.ok(result.some((finding) => finding.rule === 'schema' && finding.line === 5 && /draft.*active.*superseded/.test(finding.message)));
});

test('unknown fields and legacy decisions have one actionable finding at their field', () => {
  const unknown = documentRule(document('specs/auth.md', { ...spec, affects: 'specs/other' }));
  assert.equal(unknown.length, 1);
  assert.match(unknown[0]?.message ?? '', /unknown field `affects`/);
  assert.equal(unknown[0]?.line, 6);
  const legacy = documentRule(document('specs/auth.md', { ...spec, decisions: ['decisions/old'] }));
  assert.equal(legacy.length, 1);
  assert.match(legacy[0]?.message ?? '', /`decisions` is retired - `fold`/);
  assert.equal(legacy[0]?.line, 6);
});

test('compiled reference grammars reject bare ids and directory mismatches without filesystem reads', () => {
  assert.match(messages(document('specs/auth.md', { ...spec, 'superseded-by': 'auth' })), /bare id/);
  assert.match(messages(document('reviews/auth.md', { title: 'Review', type: 'review', purpose: 'Check',
    subject: 'src/x', template: 'specs/other' })), /templates/);
  assert.deepEqual(documentRule(document('specs/auth.md', { ...spec, 'superseded-by': 'specs/other' })), []);
});

test('custom doctype schema needs only its declared fields, not an implicit status', () => {
  const { config } = parseConfig('doctypes: {guides: {type: guide, fields: {audience: {kind: string, required: true}}}}');
  assert.ok(config);
  const data = { title: 'Setup', type: 'guide', purpose: 'Install', audience: 'developers' };
  assert.deepEqual(documentRule(document('guides/setup.md', data, config)), []);
  assert.match(messages(document('guides/setup.md', { ...data, audience: [] }, config)), /audience/);
});

test('filing rule stays narrower than full schema and supports roadmap type placement', () => {
  assert.deepEqual(filingRule(document('specs/auth.md', { type: 'spec' })), []);
  assert.ok(schemaRule(document('specs/auth.md', { type: 'spec' })).length > 0);
  assert.deepEqual(filingRule(document('roadmaps/v1/index.MD', { type: 'roadmap' })), []);
  assert.match(messages(document('roadmaps/v1/auth.md', { type: 'roadmap' })), /roadmap-node/);
});

test('production rule import closures have no filesystem or Commander dependency', () => {
  for (const file of ['document.ts', 'document-filing.ts', 'document-schema.ts']) {
    assertPureRuleImports(`scripts/check/${file}`);
  }
});

test('purity guard rejects direct, re-exported, dynamic and transitive forbidden imports', () => {
  for (const source of ["import 'node:fs';", "export * from 'commander';", "import('fs/promises');", "require('fs');",
    "import type { Command } from 'commander';"]) {
    assert.throws(() => assertPureRuleImports('probe.ts', () => source), /not pure/);
  }
  assert.throws(() => assertPureRuleImports('probe.ts', (path) =>
    path.endsWith('probe.ts') ? "import './helper.js';" : "import 'commander';"), /not pure/);
});
