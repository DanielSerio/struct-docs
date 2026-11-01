import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultConfig } from '../policy/config-defaults.js';
import { parseFrontmatter } from './frontmatter.js';
import { loadTree } from './tree.js';

const fm = (...lines: string[]) => ['---', ...lines, '---', '', 'body'].join('\n');
function accepted(source: string) {
  const result = parseFrontmatter(source);
  assert.ok(result.ok, JSON.stringify(result));
  return result;
}

// Ported acceptance cases from manage-docs' frontmatter suite.
test('reads flat scalar fields and prototype-named keys without inventing duplicates', () => {
  const parsed = accepted(fm('title: Example', 'type: spec', 'constructor: x', 'toString: y'));
  assert.deepEqual({ ...parsed.data }, { title: 'Example', type: 'spec', constructor: 'x', toString: 'y' });
});

test('reads inline sequences, including an empty list and quoted commas', () => {
  assert.deepEqual(accepted(fm('owns: [sign-in, sessions]')).data.owns, ['sign-in', 'sessions']);
  assert.deepEqual(accepted(fm('specs: []')).data.specs, []);
  assert.deepEqual(accepted(fm(`tags: ["a, b", 'c # d', e] # comment`)).data.tags, ['a, b', 'c # d', 'e']);
  assert.deepEqual(accepted(fm('tags: [a,]')).data.tags, ['a']);
});

test('unquoted hashes follow YAML whitespace comments while quoted hashes stay literal', () => {
  assert.equal(accepted(fm('type: review  # comment')).data.type, 'review');
  assert.equal(accepted(fm('purpose: Colors like #fff work')).data.purpose, 'Colors like');
  assert.equal(accepted(fm('purpose: issue#42 is fixed')).data.purpose, 'issue#42 is fixed');
  assert.equal(accepted(fm('title: "a # b" # comment')).data.title, 'a # b');
  assert.equal(accepted(fm('purpose: ordinary  ')).data.purpose, 'ordinary');
});

test('quoted scalars preserve escapes and single-quote doubling', () => {
  assert.equal(accepted(fm(`title: 'don''t split, please'`)).data.title, "don't split, please");
  assert.equal(accepted(fm('title: "line\\nquoted \\"word\\""')).data.title, 'line\nquoted "word"');
  assert.equal(accepted(fm('title: "\\u0041\\x42\\U00000043"')).data.title, 'ABC');
});

test('BOM, CRLF, blank lines and comments preserve the closing delimiter line', () => {
  const source = '\uFEFF---\r\ntitle: Example\r\n\r\n# comment\r\n---\r\nbody';
  const parsed = accepted(source);
  assert.equal(parsed.endLine, 5);
  assert.equal(parsed.data.title, 'Example');
});

test('repair spans cover exact raw tokens while excluding trailing comments and whitespace', () => {
  for (const token of ['todo', '"todo"', "'todo'", '[todo, done]']) {
    const source = `---\nstatus:   ${token}  # leave this alone\n---\n`;
    const parsed = accepted(source);
    const span = parsed.locations.status;
    assert.ok(span);
    assert.deepEqual(span, { line: 2, start: 10, end: 10 + token.length });
    assert.equal(source.split('\n')[span.line - 1]?.slice(span.start, span.end), token);
  }
});

test('every governed document in the repository satisfies the frontmatter subset', () => {
  const tree = loadTree(process.cwd(), defaultConfig());
  assert.ok(tree.documents.length >= 12);
  assert.deepEqual(tree.findings, []);
});

test('configured numeric-leading field names remain writable and source-located', () => {
  const parsed = accepted(fm('1: numeric', '2fa-method: totp'));
  assert.equal(parsed.data['1'], 'numeric');
  assert.equal(parsed.data['2fa-method'], 'totp');
  assert.deepEqual(parsed.locations['1'], { line: 2, start: 3, end: 10 });
  assert.deepEqual(parsed.locations['2fa-method'], { line: 3, start: 12, end: 16 });
});
