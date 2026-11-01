import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INDEX_OPEN, INDEX_CLOSE } from '../policy/index.js';
import { inspectIndex, spliceIndex } from './index-block.js';

test('index splicing preserves authored prefix/suffix bytes and mixed line endings', () => {
  const prefix = '\uFEFF# Authored\r\n  trailing spaces  \n\r\n';
  const suffix = '  \r\nFooter with LF\nlast spaces  ';
  const existing = `${prefix}${INDEX_OPEN}\r\nold index\n${INDEX_CLOSE}${suffix}`;
  const next = spliceIndex(existing, '## specs\n\n- [auth](specs/auth.md)');
  assert.ok(next.startsWith(prefix));
  assert.ok(next.endsWith(suffix));
  assert.ok(next.includes('## specs\r\n\r\n- [auth]'));
  assert.equal(spliceIndex(next, '## specs\n\n- [auth](specs/auth.md)'), next);
});

test('a BOM directly before the first marker and outside marker whitespace survive', () => {
  const prefix = '\uFEFF  ';
  const suffix = '  \r\nFooter';
  const existing = `${prefix}${INDEX_OPEN}\r\nold\r\n${INDEX_CLOSE}${suffix}`;
  const next = spliceIndex(existing, 'new');
  assert.ok(next.startsWith(prefix + INDEX_OPEN));
  assert.ok(next.endsWith(suffix));
  assert.equal(next.charCodeAt(0), 0xfeff);
});

test('absent markers append a block without trimming authored content', () => {
  const existing = '# Notes\nUnrelated prose and spaces   ';
  const next = spliceIndex(existing, 'routing');
  assert.ok(next.startsWith(existing));
  assert.equal(spliceIndex(next, 'routing'), next);
  assert.match(spliceIndex(null, 'routing'), /^# Documentation\n/);
  assert.ok(inspectIndex('inline `<!-- struct-docs:index -->` is prose').ok);
});

test('orphan, repeated and reversed markers are never guessed into a rewrite range', () => {
  for (const source of [INDEX_OPEN, INDEX_CLOSE, `${INDEX_CLOSE}\n${INDEX_OPEN}`,
    `${INDEX_OPEN}\n${INDEX_OPEN}\n${INDEX_CLOSE}`, `${INDEX_OPEN}\n${INDEX_CLOSE}\n${INDEX_CLOSE}`]) {
    const state = inspectIndex(source);
    assert.equal(state.ok, false, source);
    assert.throws(() => spliceIndex(source, 'new'), /ambiguous/);
  }
});
