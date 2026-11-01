import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { classify } from '../policy/classify.js';
import { defaultConfig } from '../policy/config-defaults.js';
import { parseDocument } from '../read/document.js';
import { roadmapFileRule } from './file-rule.js';
import { rootSource, leafSource } from '../../tests/utils/roadmap-checks.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';

const check = (source: string, path = 'roadmaps/v1/index.md') =>
  roadmapFileRule(parseDocument(path, source, classify(path, defaultConfig())));
const messages = (source: string, path?: string) => check(source, path).map((finding) => finding.message).join(' | ');

test('ported roadmap fixtures pass local file and body validation', () => {
  for (const path of ['roadmaps/v1/index.md', 'roadmaps/v1/billing.md', 'roadmaps/payments/index.md']) {
    assert.deepEqual(check(readFileSync(`tests/fixtures/${path}`, 'utf8'), path), [], path);
  }
});

test('roadmap frontmatter fields validate at their original lines', () => {
  const cases = [
    [rootSource().replace('title: v1\n', ''), /missing `title`/, 1],
    [rootSource().replace('status: todo', 'status: unknown'), /`status` must be one of/, 5],
    [rootSource().replace('intent: Ship', "intent: ''"), /`intent` must be a nonempty string/, 6],
    [rootSource().replace('intent: Ship', 'intent: Ship\npurpose: forbidden'), /do not take `purpose`/, 7],
    [rootSource().replace('intent: Ship', 'intent: Ship\nsurprise: unexpected'), /unknown field `surprise`/, 7],
    [rootSource().replace('type: roadmap', 'type: spec'), /`type` must be one of roadmap/, 4],
    [rootSource().replace('id: v1', 'id: Wrong'), /kebab-case id/, 2],
  ] as const;
  for (const [source, message, line] of cases) {
    assert.ok(check(source).some((finding) => message.test(finding.message) && finding.line === line), source);
  }
});

test('root and breakout identities obey their directories and filenames, including MD', () => {
  assert.match(messages(rootSource('wrong')), /must equal directory `v1`/);
  const breakout = rootSource('wrong').replace('type: roadmap', 'type: roadmap-node');
  assert.match(messages(breakout, 'roadmaps/v1/task.MD'), /must equal filename stem `task`/);
  assert.deepEqual(check(rootSource(), 'roadmaps/v1/index.MD'), []);
  assert.match(messages(rootSource(), 'roadmaps/v1/deeper/index.md'), /roadmap files must be/);
  assert.match(messages(rootSource('Bad').replace('type: roadmap', 'type: roadmap-node'),
    'roadmaps/v1/Bad.md'), /filename stem `Bad` is not kebab-case/);
});

test('root specs use document-reference lists while superseded-by is a qualified node reference', () => {
  assert.deepEqual(check(rootSource('v1', leafSource(), 'specs: [product/vision, roadmaps/next/index]\n')), []);
  assert.match(messages(rootSource('v1', leafSource(), 'specs: [bare]\n')), /bare id/);
  assert.match(messages(rootSource('v1', leafSource(), 'specs: product/vision\n')), /inline list/);
  assert.deepEqual(check(rootSource('v1', leafSource(), 'superseded-by: next:replacement\n')), []);
  for (const value of ['replacement', 'specs/replacement', '/next:replacement']) {
    assert.match(messages(rootSource('v1', leafSource(), `superseded-by: ${value}\n`)), /qualified/);
  }
  const breakout = rootSource('task', leafSource(), 'specs: [specs/api]\n').replace('type: roadmap', 'type: roadmap-node');
  assert.match(messages(breakout, 'roadmaps/v1/task.md'), /unknown field `specs` for type `roadmap-node`/);
});

test('authored leaves require acceptance and valid values at node field lines', () => {
  assert.match(messages(rootSource('v1', '### bare <!-- status: todo -->\nIntent: Deliver\n')), /leaf has no `Acceptance`/);
  const source = rootSource('v1', leafSource('Bad', 'unknown', 'Deps: invalid dep\n'));
  const findings = check(source);
  assert.ok(findings.some((finding) => /kebab-case/.test(finding.message) && finding.line === 11));
  assert.ok(findings.some((finding) => /`status`/.test(finding.message) && finding.line === 11));
  assert.ok(findings.some((finding) => /malformed dep/.test(finding.message) && finding.line === 15));
  assert.match(messages(rootSource('v1', '### task <!-- status: todo -->\nAcceptance:\n- [ ] Result\n')), /missing `Intent`/);
});

test('breakout routing forbids copied intent/title and anything other than exact sibling spelling', () => {
  const body = '### task <!-- status: todo -->\nBreakout: ./task.md\nTitle: Copy\nIntent: Copy\n';
  const findings = check(rootSource('v1', body));
  assert.ok(findings.some((finding) => /owns `title`/.test(finding.message) && finding.line === 13));
  assert.ok(findings.some((finding) => /owns `intent`/.test(finding.message) && finding.line === 14));
  assert.equal(findings.some((finding) => /Acceptance/.test(finding.message)), false);
  for (const path of ['task.md', './wrong.md', './nested/task.md', '../../outside.md']) {
    assert.match(messages(rootSource('v1', `### task <!-- status: todo -->\nBreakout: ${path}\n`)), /breakout must be `\.\/task\.md`/);
  }
});

test('a cut leaf needs a note or a qualified superseding node', () => {
  assert.match(messages(rootSource('v1', leafSource('cut-task', 'cut'))), /cut leaf has neither/);
  assert.doesNotMatch(messages(rootSource('v1', leafSource('cut-task', 'cut', 'Notes:\n- 2026-11-01 Replaced\n'))), /cut leaf/);
  assert.doesNotMatch(messages(rootSource('v1', leafSource('cut-task', 'cut', 'Superseded-by: next:replacement\n'))), /cut leaf/);
  assert.match(messages(rootSource('v1', leafSource('cut-task', 'cut', 'Superseded-by: replacement\n'))), /qualified/);
});

test('missing heading status and unknown body fields stay reader-owned, without duplicate rule errors', () => {
  const path = 'roadmaps/v1/index.md';
  const document = parseDocument(path, rootSource('v1', leafSource().replace(' <!-- status: todo -->', '') + 'Blocked-on: task\n'),
    classify(path, defaultConfig()));
  assert.equal(document.roadmap?.findings.length, 2);
  assert.deepEqual(roadmapFileRule(document), []);
});

test('roadmap rule closures import neither filesystem nor Commander', () => {
  assertPureRuleImports('scripts/roadmap/roadmap-rule.ts');
  assertPureRuleImports('scripts/roadmap/file-rule.ts');
});
