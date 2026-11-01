import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFrontmatter } from './frontmatter.js';

const fm = (...lines: string[]) => ['---', ...lines, '---', '', 'body'].join('\n');
function rejected(source: string, pattern: RegExp, line?: number) {
  const result = parseFrontmatter(source);
  assert.equal(result.ok, false, source);
  assert.ok(!result.ok);
  assert.match(result.reason, pattern);
  if (line !== undefined) assert.equal(result.line, line);
}

// Ported rejection cases; every unsupported shape rejects the entire frontmatter.
test('rejects nested mappings and block lists at the relevant source line', () => {
  rejected(fm('scores:', '  correctness: 4'), /nesting/, 3);
  rejected(fm('decisions:', '- decisions/a'), /inline/, 3);
  rejected(fm('scores: {correctness: 4}'), /nested/, 2);
  rejected(fm('scores: nested: value'), /nested/, 2);
  rejected(fm('decisions: - decisions/a'), /inline/, 2);
});

test('rejects every multiline scalar spelling and anchors or aliases, including in lists', () => {
  for (const value of ['|', '>', '|-', '|+', '>2-', '|2', '>+2']) {
    rejected(fm(`purpose: ${value}`), /multi-line/, 2);
  }
  for (const value of ['&anchor x', '*anchor', '[&anchor x]', '[*anchor]']) {
    rejected(fm(`title: ${value}`), /anchor/, 2);
  }
  rejected(fm('title: !!str value'), /tags/, 2);
});

test('rejects nested or unclosed inline sequences instead of a partial read', () => {
  rejected(fm('a: [x, [y]]'), /nested/, 2);
  rejected(fm('a: [{x: y}]'), /nested/, 2);
  rejected(fm('a: [x, y'), /unclosed/, 2);
  rejected(fm('a: [x,,y]'), /empty/, 2);
  rejected(fm('a: [,x]'), /no value/, 2);
});

test('rejects duplicate keys, missing values and non-field lines', () => {
  rejected(fm('type: spec', 'type: review'), /duplicate/, 3);
  rejected(fm('title:'), /no value/, 2);
  rejected(fm('title: # no value'), /no value/, 2);
  rejected(fm('just some prose'), /key: value/, 2);
});

test('rejects absent, unterminated and empty frontmatter', () => {
  rejected('# Just markdown\n', /no frontmatter/, 1);
  rejected('---\ntype: spec\n', /unterminated/, 3);
  rejected('---\n---\n', /empty/, 2);
});

test('rejects malformed quoted tokens rather than quietly stripping their contents', () => {
  rejected(fm('title: "unterminated'), /unclosed/, 2);
  rejected(fm('title: "quoted" trailing'), /unexpected/, 2);
  rejected(fm('title: "quoted"#comment'), /unexpected/, 2);
  rejected(fm('title: "\\q"'), /escape/, 2);
  rejected(fm('title: "\\uZZZZ"'), /escape/, 2);
});
