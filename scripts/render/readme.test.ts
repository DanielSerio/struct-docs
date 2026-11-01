import assert from 'node:assert/strict';
import { test } from 'node:test';
import { indexedFiles } from '../../tests/utils/index-fixtures.js';
import { specSource } from '../../tests/utils/audit-fixtures.js';
import { breakoutSource, leafSource, rootSource } from '../../tests/utils/roadmap-checks.js';
import { parseConfig } from '../read/config.js';

test('the index lists purposes with intended separators and deterministic directory order', () => {
  const config = parseConfig('doctypes: {guides: {type: guide}}').config;
  assert.ok(config);
  const files = indexedFiles({
    'guides/setup.MD': '---\ntitle: Setup\ntype: guide\npurpose: Getting started.\nowns: [setup]\n---\n',
    'specs/z.md': specSource('z'), 'specs/a.md': specSource('a'),
    'product/prd.md': '---\ntitle: Product\ntype: prd\npurpose: Product scope.\nowns: [product]\n---\n',
    'open-questions.md': '---\ntitle: Questions\ntype: questions\npurpose: Unknowns.\n---\n',
    'roadmaps/v1/index.MD': rootSource('v1', leafSource()), 'unknown/notes.markdown': 'notes',
  }, config);
  const index = files['README.md'];
  assert.ok(index);
  assert.ok(index.includes('- [a](specs/a.md) \u2014 Account behavior.'));
  assert.ok(index.indexOf('## product') < index.indexOf('## specs'));
  assert.ok(index.indexOf('specs/a.md') < index.indexOf('specs/z.md'));
  assert.ok(index.indexOf('## specs') < index.indexOf('## guides'));
  assert.ok(index.includes('[setup](guides/setup.MD)'));
  assert.ok(index.includes('[v1](roadmaps/v1/index.MD) \u2014 **todo** \u2014 Ship'));
  assert.ok(index.includes('[notes](unknown/notes.markdown)'));
});

test('local-only paths including nested unrouted files cannot change generated index bytes', () => {
  const config = parseConfig('ignore: [generated/]\ndoctypes: {notes: {type: note, gitignored: true}}').config;
  assert.ok(config);
  const shared = { 'specs/auth.md': specSource() };
  const local = { 'reviews/auth.md': 'local review', 'reviews/deep/old.md': 'nested local',
    'reviews/unrouted.markdown': 'local', 'notes/nested/local.md': 'local',
    'templates/review.md': 'template', 'living/draft.md': 'notes', 'generated/api.md': 'generated' };
  assert.equal(indexedFiles(shared, config)['README.md'], indexedFiles({ ...shared, ...local }, config)['README.md']);
});

test('standalone milestone links name actual files instead of inventing an absent root', () => {
  const index = indexedFiles({ 'roadmaps/v1/standalone.MD': breakoutSource('standalone') })['README.md'];
  assert.ok(index.includes('[v1/standalone](roadmaps/v1/standalone.MD)'));
  assert.equal(index.includes('(roadmaps/v1/index.md)'), false);
});


test('unrouted filenames retain usable links without injecting source line breaks into the index', () => {
  const index = indexedFiles({ 'unknown/odd name(1).md': 'notes', 'unknown/line\nbreak.md': 'notes' })['README.md'];
  assert.ok(index.includes('](unknown/odd%20name%281%29.md)'));
  assert.ok(index.includes('[line\\nbreak](unknown/line%0Abreak.md)'));
});
