import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from '../policy/classify.js';
import { defaultConfig } from '../policy/config-defaults.js';
import type { Config } from '../policy/config-types.js';
import type { FrontmatterValue, ParsedDocument } from '../policy/document.js';
import { createOwnershipContext, ownershipValue } from '../policy/ownership-context.js';
import { parseConfig } from '../read/config.js';
import { loadTree } from '../read/tree.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { ownershipRule } from './ownership-rule.js';

function document(path: string, owns?: FrontmatterValue, config = defaultConfig(), line = 6): ParsedDocument {
  const data = { title: 'Rules', type: 'spec', purpose: 'Rules and reasons', status: 'active',
    ...(owns === undefined ? {} : { owns }) };
  return { path, source: '', lines: [], classification: classify(path, config),
    frontmatter: { ok: true, data, locations: owns === undefined ? {} : {
      owns: { line, start: 6, end: 20 },
    }, endLine: line + 1 } };
}
function check(documents: readonly ParsedDocument[], config: Config = defaultConfig()) {
  const context = createOwnershipContext(config, documents);
  return documents.flatMap((doc) => ownershipRule({ ...doc, context }));
}
const source = (type = 'spec') => `---
title: Rules
type: ${type}
purpose: Rules and reasons
owns: [auth]
---
`;

test('a duplicate topic reports both documents at their own source lines and names the other owner', () => {
  const documents = [document('specs/b.md', ['auth'], undefined, 11),
    document('specs/a.md', ['auth'], undefined, 7)];
  const result = check(documents);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(({ file, line }) => [file, line]), [['specs/b.md', 11], ['specs/a.md', 7]]);
  assert.match(result[0]?.message ?? '', /`auth`.*specs\/a\.md:7/);
  assert.match(result[1]?.message ?? '', /`auth`.*specs\/b\.md:11/);
  assert.ok(result.every((finding) => finding.severity === 'error' && finding.rule === 'ownership'));
});

test('multiple competing owners are sorted and each file claims only once', () => {
  const a = document('specs/a.md', ['auth']);
  const b = document('specs/b.md', ['auth']);
  const c = document('specs/c.md', ['auth']);
  const context = createOwnershipContext(defaultConfig(), [c, a, a, b]);
  assert.equal(context.topicOwners.get('auth')?.length, 3);
  const result = ownershipRule({ ...c, context });
  assert.equal(result.length, 1);
  assert.match(result[0]?.message ?? '', /specs\/a\.md:6, specs\/b\.md:6$/);
});

test('shared docs require a nonempty list of kebab topics, with no implicit topics elsewhere', () => {
  const missing = check([document('specs/auth.md')]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0]?.line, 1);
  assert.equal(missing[0]?.message, 'missing `owns`');
  for (const value of ['', 'auth', [], ['Auth'], ['has space'], ['under_score'], [''], ['-auth']]) {
    const result = check([document('specs/auth.md', value)]);
    assert.equal(result.length, 1, JSON.stringify(value));
    assert.equal(result[0]?.line, 6);
    assert.match(result[0]?.message ?? '', /`owns`/);
  }
  assert.deepEqual(check([document('specs/auth.md', ['brand-new-topic'])]), []);
  assert.deepEqual(check([]), []);
  for (const value of [null, true, [42], ['auth', 42]]) assert.equal(typeof ownershipValue(value), 'string');
});

test('repeating one topic is an invalid value, never a duplicate owner against itself', () => {
  const doc = document('specs/auth.md', ['auth', 'auth']);
  const result = check([doc]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.line, 6);
  assert.match(result[0]?.message ?? '', /must not repeat a topic/);
  assert.equal(createOwnershipContext(defaultConfig(), [doc]).topicOwners.get('auth')?.length, 1);
});

test('custom ownership policy and removal are decided by config, not type name', () => {
  const config = parseConfig(`doctypes:
  specs: null
  guides: {type: guide}
  notes: {type: note, owns: false}
`).config;
  assert.ok(config);
  const guide = document('guides/setup.md', ['auth'], config);
  const notes = document('notes/setup.md', undefined, config);
  const removed = document('specs/auth.md', ['auth'], config);
  assert.deepEqual(check([guide, notes, removed], config), []);
  const missing = check([document('guides/setup.md', undefined, config)], config);
  assert.equal(missing[0]?.message, 'missing `owns`');
});

test('disabled and gitignored metadata never claims or satisfies ownership', () => {
  const config = parseConfig('doctypes: {notes: {type: note, owns: false}}').config;
  assert.ok(config);
  const local = [document('reviews/auth.md', ['auth'], config),
    document('notes/auth.md', ['auth'], config), document('open-questions.md', ['auth'], config)];
  assert.deepEqual(check(local, config), []);
  assert.equal(createOwnershipContext(config, local).topicOwners.size, 0);
  const shared = document('specs/auth.md', ['auth'], config);
  assert.deepEqual(check([...local, shared], config), []);
  assert.equal(check([...local, document('specs/auth.md', undefined, config)], config).length, 1);
});

test('excluded and local-only paths cannot become owners through forged classification metadata', () => {
  const config = { ...defaultConfig(), ignore: ['generated/'] };
  const paths = ['living/notes.md', 'templates/review.md', 'generated/api.md', 'unknown/auth.md',
    'roadmaps/v1/index.md', 'reviews/auth.md'];
  const forged = paths.map((path): ParsedDocument => ({ ...document(path, ['auth'], config),
    classification: { cls: 'live', type: 'spec', owns: true, gitignored: false } }));
  assert.equal(createOwnershipContext(config, forged).topicOwners.size, 0);
  assert.deepEqual(check(forged, config), []);
  assert.deepEqual(check([...forged, document('specs/auth.md', ['auth'], config)], config), []);
});

test('tree fixtures include only shared owners even when local and excluded files contain the topic', () => {
  tempDocs({ 'specs/auth.md': source(), 'reviews/auth.md': source('review'),
    'living/notes.md': source(), 'templates/review.md': source(), 'generated/api.md': source(),
  }, (root) => {
    const config = { ...defaultConfig(), ignore: ['generated/'] };
    const tree = loadTree(root, config);
    const context = createOwnershipContext(config, tree.documents);
    assert.deepEqual(context.topicOwners.get('auth'), [{ file: 'specs/auth.md', line: 5 }]);
    assert.deepEqual(tree.documents.flatMap((doc) => ownershipRule({ ...doc, context })), []);
  });
});

test('failed parses and missing prepared context never masquerade as valid competing owners', () => {
  const good = document('specs/auth.md', ['auth']);
  const failed: ParsedDocument = { ...document('specs/broken.md', ['auth']),
    frontmatter: { ok: false, line: 3, reason: 'broken syntax' } };
  assert.deepEqual(check([good, failed]), []);
  const { context, ...withoutContext } = good;
  assert.equal(context, undefined);
  assert.throws(() => ownershipRule(withoutContext), /prepared ownership context/);
});

test('ownership rule and its prepared context have no filesystem or Commander imports', () => {
  assertPureRuleImports('scripts/check/ownership-rule.ts');
});

test('an internally repeated topic still reports competing owners once in each document', () => {
  const result = check([document('specs/a.md', ['auth', 'auth']), document('specs/b.md', ['auth'])]);
  assert.equal(result.length, 3);
  assert.equal(result.filter((finding) => /also owned/.test(finding.message)).length, 2);
  assert.ok(result.some((finding) => finding.file === 'specs/a.md' && /specs\/b\.md:6/.test(finding.message)));
  assert.ok(result.some((finding) => finding.file === 'specs/b.md' && /specs\/a\.md:6/.test(finding.message)));
});
