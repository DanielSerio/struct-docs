import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from '../policy/classify.js';
import { defaultConfig } from '../policy/config-defaults.js';
import type { Config } from '../policy/config-types.js';
import type { FrontmatterValue, ParsedDocument } from '../policy/document.js';
import { documentReferences } from '../policy/document-references.js';
import { createReferenceContext } from '../policy/reference-context.js';
import type { ReferenceContext } from '../policy/reference-context.js';
import { parseConfig } from '../read/config.js';
import { loadTree } from '../read/tree.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { documentRule } from './document.js';
import { referenceRule } from './reference-rule.js';

const base = { title: 'Auth', type: 'spec', purpose: 'Sign-in behavior', status: 'active' };
function document(data: Record<string, FrontmatterValue>, files: string[] = [],
  path = 'specs/auth.md', config: Config = defaultConfig()): ParsedDocument<ReferenceContext> {
  const locations = Object.fromEntries(Object.keys(data).map((field, index) =>
    [field, { line: index + 2, start: 0, end: 1 }]));
  return { path, source: '', lines: [], classification: classify(path, config),
    context: createReferenceContext(config, files),
    frontmatter: { ok: true, data, locations, endLine: Object.keys(data).length + 2 } };
}

test('ported resolution accepts live targets and reports deleted targets at the referring field', () => {
  const data = { ...base, 'superseded-by': 'specs/replacement' };
  assert.deepEqual(referenceRule(document(data, ['specs/replacement.md'])), []);
  const result = referenceRule(document(data, ['specs/other.md']));
  assert.equal(result.length, 1);
  assert.equal(result[0]?.file, 'specs/auth.md');
  assert.equal(result[0]?.line, 6);
  assert.match(result[0]?.message ?? '', /superseded-by.*specs\/replacement.*no document/);
});

test('no archive overlay survives, but explicitly named paths remain ordinary files', () => {
  const files = ['archive/specs/replacement.md'];
  assert.equal(referenceRule(document({ ...base, 'superseded-by': 'specs/replacement' }, files)).length, 1);
  assert.deepEqual(referenceRule(document({ ...base, 'superseded-by': 'archive/specs/replacement' }, files)), []);
  assert.deepEqual(referenceRule(document({ ...base, 'superseded-by': 'specs/replacement' },
    [...files, 'specs/replacement.md'])), []);
});

test('existence index preserves target case, normalizes separators and accepts .MD extensions', () => {
  const context = createReferenceContext(defaultConfig(), ['specs\\replacement.MD', 'specs/image.svg']);
  assert.equal(context.referenceTargets.get('specs/replacement'), 'specs/replacement.MD');
  assert.equal(context.referenceTargets.has('specs/image'), false);
  assert.deepEqual(referenceRule(document({ ...base, 'superseded-by': 'specs/replacement' },
    ['specs/replacement.MD'])), []);
});

test('invalid reference grammar is reported once by schema and never resolved', () => {
  for (const value of ['replacement', '/specs/replacement', '../outside', 'specs/../outside',
    'C:/specs/replacement', 'specs\\replacement', 'specs/replacement.md']) {
    const doc = document({ ...base, 'superseded-by': value });
    assert.equal(documentRule(doc).length, 1, value);
    assert.deepEqual(documentReferences(doc), [], value);
    assert.deepEqual(referenceRule(doc), [], value);
  }
});

test('configured directory restrictions reject a different target without duplicate resolution findings', () => {
  const { config, findings } = parseConfig(`doctypes:
  guides:
    type: guide
    fields:
      related: {kind: reference, to: guides}
`);
  assert.deepEqual(findings, []); assert.ok(config);
  const data = { title: 'Setup', type: 'guide', purpose: 'Install', related: 'specs/target' };
  const wrong = document(data, ['specs/target.md'], 'guides/setup.md', config);
  assert.equal(documentRule(wrong).length, 1);
  assert.match(documentRule(wrong)[0]?.message ?? '', /guides/);
  assert.deepEqual(referenceRule(wrong), []);
  assert.deepEqual(referenceRule(document({ ...data, related: 'guides/target' },
    ['guides/target.md'], 'guides/setup.md', config)), []);
});

test('tracked references to gitignored doctypes are stable with targets present, absent or ignored', () => {
  const data = { ...base, 'superseded-by': 'reviews/auth' };
  for (const config of [defaultConfig(), { ...defaultConfig(), ignore: ['reviews/'] }]) {
    const absent = referenceRule(document(data, [], 'specs/auth.md', config));
    const present = referenceRule(document(data, ['reviews/auth.md'], 'specs/auth.md', config));
    assert.deepEqual(present, absent);
    assert.equal(absent[0]?.line, 6);
    assert.match(absent[0]?.message ?? '', /gitignored target `reviews\/auth`/);
  }
});

test('gitignored sources may reference any existing document but still report their own missing targets', () => {
  const { config } = parseConfig(`doctypes:
  reviews:
    fields:
      related: {kind: reference}
`);
  assert.ok(config);
  const data = { title: 'Review', type: 'review', purpose: 'Check', subject: 'src/auth',
    template: 'templates/review', related: 'reviews/other' };
  const files = ['templates/review.md', 'reviews/other.md'];
  assert.deepEqual(referenceRule(document(data, files, 'reviews/auth.md', config)), []);
  assert.equal(referenceRule(document(data, ['templates/review.md'], 'reviews/auth.md', config)).length, 1);
});

test('living references obey the configured local-only policy independently of presence', () => {
  const data = { ...base, 'superseded-by': 'living/notes' };
  const missing = referenceRule(document(data));
  assert.deepEqual(referenceRule(document(data, ['living/notes.md'])), missing);
  assert.match(missing[0]?.message ?? '', /gitignored/);
  const config = { ...defaultConfig(), living: { gitignored: false } };
  assert.deepEqual(referenceRule(document(data, ['living/notes.md'], 'specs/auth.md', config)), []);
});

test('root roadmap specs reference any document; node deps and superseded-by are not document references', () => {
  const root = { id: 'v1', title: 'V1', type: 'roadmap', status: 'todo', intent: 'Ship',
    specs: ['product/vision', 'roadmaps/v2/index'], 'superseded-by': 'v2:next' };
  assert.deepEqual(referenceRule(document(root, ['product/vision.md', 'roadmaps/v2/index.MD'],
    'roadmaps/v1/index.md')), []);
  const result = referenceRule(document(root, [], 'roadmaps/v1/index.md'));
  assert.equal(result.length, 2);
  assert.ok(result.every((finding) => finding.line === 7));
  assert.deepEqual(documentReferences(document({ ...root, specs: ['../outside'] }, [],
    'roadmaps/v1/index.md')), []);
  assert.deepEqual(documentReferences(document(root, [], 'roadmaps/v1/tasks.md')), []);
});

test('file inventory resolves a template without reading or validating its arbitrary body', () => {
  tempDocs({
    'reviews/auth.md': '---\ntitle: Review\ntype: review\npurpose: Check\nsubject: src/auth\ntemplate: templates/review\n---\n',
    'templates/review.MD': 'Not frontmatter, a review rubric can be anything.',
  }, (root) => {
    const config = defaultConfig();
    const tree = loadTree(root, config);
    assert.equal(tree.documents.length, 1);
    const context = createReferenceContext(config, tree.files);
    assert.deepEqual(tree.documents.flatMap((doc) => referenceRule({ ...doc, context })), []);
  });
});

test('reference rule import closure stays pure and a missing prepared context fails explicitly', () => {
  assertPureRuleImports('scripts/check/reference-rule.ts');
  const doc = document({ ...base, 'superseded-by': 'specs/replacement' });
  const withoutContext = { path: doc.path, source: doc.source, lines: doc.lines,
    classification: doc.classification, frontmatter: doc.frontmatter };
  assert.throws(() => referenceRule(withoutContext), /prepared reference context/);
});


test('local-only classification follows custom registry changes rather than hardcoded type names', () => {
  const { config } = parseConfig(`doctypes:
  reviews: null
  notes: {type: note, gitignored: true}
`);
  assert.ok(config);
  const local = document({ ...base, 'superseded-by': 'notes/private' }, [], 'specs/auth.md', config);
  assert.match(referenceRule(local)[0]?.message ?? '', /gitignored target/);
  const ordinary = document({ ...base, 'superseded-by': 'reviews/shared' },
    ['reviews/shared.md'], 'specs/auth.md', config);
  assert.deepEqual(referenceRule(ordinary), []);
  const sharedReviews = parseConfig('doctypes: {reviews: {gitignored: false}}').config;
  assert.ok(sharedReviews);
  assert.deepEqual(referenceRule(document({ ...base, 'superseded-by': 'reviews/shared' },
    ['reviews/shared.md'], 'specs/auth.md', sharedReviews)), []);
});

test('failed document parsing creates no second reference diagnostic', () => {
  const doc = document(base);
  assert.deepEqual(referenceRule({ ...doc, frontmatter: { ok: false, line: 2, reason: 'invalid' } }), []);
});
