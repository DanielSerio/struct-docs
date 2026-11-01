// Matching cases ported from manage-docs' docsignore and classifier tests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileIgnores, patternToRegExp } from './ignore-patterns.js';

const matches = (pattern: string, path: string) => patternToRegExp(pattern).test(path);

test('directory patterns include descendants without bleeding into sibling names', () => {
  for (const path of ['guides', 'guides/setup.md', 'guides/deep/nested.md']) {
    assert.equal(matches('guides/', path), true, path);
  }
  for (const path of ['guidespost/setup.md', 'other/guides/setup.md', 'guides.md']) {
    assert.equal(matches('guides/', path), false, path);
  }
});

test('patterns anchor at docs root; explicit double-star permits any depth', () => {
  assert.equal(matches('notes.md', 'notes.md'), true);
  assert.equal(matches('notes.md', 'sub/notes.md'), false);
  for (const path of ['notes.md', 'sub/notes.md', 'sub/deeper/notes.md']) {
    assert.equal(matches('**/notes.md', path), true, path);
  }
  assert.equal(matches('a/**/b.md', 'a/b.md'), true);
  assert.equal(matches('a/**/b.md', 'a/deep/nested/b.md'), true);
  assert.equal(matches('a/**/b.md', 'other/a/b.md'), false);
});

test('single-star stays in a segment while double-star crosses segments', () => {
  assert.equal(matches('*.tmp.md', 'draft.tmp.md'), true);
  assert.equal(matches('*.tmp.md', 'sub/draft.tmp.md'), false);
  assert.equal(matches('vendor/*', 'vendor/a.md'), true);
  assert.equal(matches('vendor/*', 'vendor/deep/a.md'), false);
  assert.equal(matches('vendor/**', 'vendor/a.md'), true);
  assert.equal(matches('vendor/**', 'vendor/deep/a.md'), true);
  assert.equal(matches('**', 'any/depth/file.md'), true);
});

test('a leading slash preserves the existing root anchoring', () => {
  for (const pattern of ['guides/', '*.md', '**/notes.md', 'vendor/**']) {
    assert.deepEqual(patternToRegExp(`/${pattern}`), patternToRegExp(pattern));
  }
});

test('question marks and regex metacharacters are literal outside the wildcard subset', () => {
  assert.equal(matches('*.tmp?.md', 'x.tmp?.md'), true);
  assert.equal(matches('*.tmp?.md', 'x.tmp1.md'), false);
  for (const literal of ['[draft].md', 'a+b.md', '(a).md', '^a$.md', 'a{2}.md', 'a|b.md', 'a\\b.md']) {
    assert.equal(matches(literal, literal), true, literal);
    assert.equal(matches(literal, 'unrelated.md'), false, literal);
  }
  assert.equal(matches('[draft].md', 'd.md'), false);
  assert.equal(matches('a+b.md', 'aaab.md'), false);
  assert.equal(matches('a|b.md', 'a'), false);
});

test('config ignore lists compile without interpreting YAML values as legacy comments', () => {
  assert.deepEqual(compileIgnores([]), []);
  const patterns = ['guides/', 'vendor/**', '#literal.md'];
  const ignores = compileIgnores(patterns);
  assert.equal(ignores.length, 3);
  for (const path of ['guides/setup.md', 'vendor/deep/lib.md', '#literal.md']) {
    assert.equal(ignores.some((regex) => regex.test(path)), true, path);
  }
  assert.equal(ignores.some((regex) => regex.test('specs/cli.md')), false);
  assert.deepEqual(patterns, ['guides/', 'vendor/**', '#literal.md']);
});
