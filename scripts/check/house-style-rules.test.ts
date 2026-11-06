import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classify } from '../policy/classify.js';
import { defaultConfig } from '../policy/config-defaults.js';
import { parseDocument } from '../read/document.js';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import {
  fileSizeRule,
  headingGapRule,
  houseStyleRule,
  lineLengthRule,
  stalePointerRule,
} from './house-style-rules.js';
import type { HouseStyleDocument } from './house-style-rules.js';
import { inHouseStyleScope } from './house-style-scope.js';

function lintSpecContent(content: string, relPath = 'docs/specs/example.md') {
  const normalized = relPath.replaceAll('\\', '/').replace(/^docs\//, '');
  const parsed = parseDocument(relPath, content, classify(normalized, defaultConfig()));
  // Pass only path, source, lines and frontmatter so tests prove rules read nothing else.
  const doc: HouseStyleDocument = {
    path: parsed.path,
    source: parsed.source,
    lines: parsed.lines,
    frontmatter: parsed.frontmatter,
  };
  return houseStyleRule(doc);
}

describe('house-style rules — line-length', () => {
  it('passes a line of exactly 100 characters', () => {
    const line = 'x'.repeat(100);
    assert.deepEqual(lintSpecContent(line), []);
  });

  it('flags a prose line over 100 characters', () => {
    const line = 'x'.repeat(101);
    const findings = lintSpecContent(line);
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.rule, 'line-length');
    assert.equal(findings[0]?.severity, 'error');
    assert.equal(findings[0]?.line, 1);
    assert.match(findings[0]?.message ?? '', /101 characters \(max 100\)/);
  });

  it('ignores long lines inside YAML front-matter', () => {
    const longFmValue = `summary: ${'x'.repeat(120)}`;
    const content = ['---', longFmValue, '---', '', 'Short body line.'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('ignores long lines inside fenced code blocks', () => {
    const longCode = 'x'.repeat(140);
    const content = ['```ts', longCode, '```'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('ignores long table rows and long headings', () => {
    const longRow = `| ${'cell '.repeat(25)}|`;
    const longHeading = `# ${'Heading word '.repeat(10)}`;
    const content = [longHeading, '', longRow].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });
});

describe('house-style rules — heading-gap', () => {
  it('passes a heading followed by a blank line', () => {
    const content = ['# Title', '', 'Body paragraph.'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('passes a heading on the last line of the file', () => {
    const content = ['Body paragraph.', '', '## Trailing Heading'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('flags a heading immediately followed by prose', () => {
    const content = ['## Section', 'No blank line before this.'].join('\n');
    const findings = lintSpecContent(content);
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.rule, 'heading-gap');
    assert.equal(findings[0]?.severity, 'error');
    assert.equal(findings[0]?.line, 1);
  });

  it('ignores `#` comment lines inside code blocks', () => {
    const content = ['```sh', '# shell comment', 'echo hi', '```'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('ignores `#` comments inside YAML front-matter', () => {
    const content = ['---', '# yaml comment', 'title: Example', '---', '', 'Body.'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });
});

describe('house-style rules — stale-pointer', () => {
  for (const [sample, expectedLabel] of [
    ['This will be built in the first milestone.', 'first milestone'],
    ['The exact format will be decided later.', 'decided later'],
    ['Details will be added here later.', 'added here later'],
    ['Timeout value is TBD.', 'TBD'],
    ['TODO: write this section.', 'TODO'],
  ] as const) {
    it(`flags "${expectedLabel}" in prose`, () => {
      const findings = lintSpecContent(sample);
      assert.equal(findings.length, 1);
      assert.equal(findings[0]?.rule, 'stale-pointer');
      assert.equal(findings[0]?.severity, 'error');
      assert.match(findings[0]?.message ?? '', new RegExp(`"${expectedLabel}"`));
    });
  }

  it('does not match "TBD" or "TODO" inside longer words', () => {
    assert.deepEqual(lintSpecContent('Tokenize STBDATA and AUTODOC identifiers.'), []);
  });

  it('exempts lines that mention the rule name `stale-pointer`', () => {
    const selfDoc = 'The `stale-pointer` rule rejects TBD and TODO markers.';
    assert.deepEqual(lintSpecContent(selfDoc), []);
  });

  it('ignores stale-pointer phrases inside fenced code blocks', () => {
    const content = ['```md', 'TODO: example inside a code fence', '```'].join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });
});

describe('house-style rules — file-size', () => {
  it('passes a 400-line spec that is under 0.05 MB', () => {
    const content = Array.from({ length: 400 }, (_, i) => `Short line ${i}.`).join('\n');
    assert.deepEqual(lintSpecContent(content), []);
  });

  it('warns when a spec exceeds 0.05 MB (50,000 bytes)', () => {
    const line = 'x'.repeat(80);
    const content = Array.from({ length: 650 }, () => line).join('\n');
    const findings = lintSpecContent(content);
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.rule, 'file-size');
    assert.equal(findings[0]?.severity, 'warning');
    assert.equal(findings[0]?.line, 1);
    assert.match(findings[0]?.message ?? '', /over the 0\.05 MB guide/);
  });
});

describe('house-style rules — scope and purity', () => {
  it('covers only immediate Markdown files under docs/specs/ by default', () => {
    const violating = ['## Heading', 'TODO: ' + 'x'.repeat(120)].join('\n');
    assert.equal(lintSpecContent(violating, 'docs/specs/auth.md').length, 3);
    assert.equal(lintSpecContent(violating, 'specs/auth.md').length, 3);
    assert.deepEqual(lintSpecContent(violating, 'docs/roadmaps/v1/independent-project-gate.md'), []);
    assert.deepEqual(lintSpecContent(violating, 'roadmaps/v1/independent-project-gate.md'), []);
    assert.deepEqual(lintSpecContent(violating, 'docs/notes/scratch.md'), []);
    assert.deepEqual(lintSpecContent(violating, 'docs/specs/nested/auth.md'), []);
  });

  it('reads every spelling of a directory, including the docs root, the same way', () => {
    for (const dir of ['docs', 'docs/', '.', '']) {
      assert.equal(inHouseStyleScope('README.md', [dir]), true, dir);
      assert.equal(inHouseStyleScope('docs/README.md', [dir]), true, dir);
      assert.equal(inHouseStyleScope('specs/auth.md', [dir]), false, dir);
    }
    assert.equal(inHouseStyleScope('docs/specs/auth.md', ['specs']), true);
    assert.equal(inHouseStyleScope('specs/auth.md', ['./docs/specs/']), true);
    assert.equal(inHouseStyleScope('specs/auth.md', ['../specs']), false);
  });

  it('keeps each rule pure without filesystem or Commander imports', () => {
    for (const file of [
      'house-style-scope.ts',
      'line-length-rule.ts',
      'heading-gap-rule.ts',
      'stale-pointer-rule.ts',
      'file-size-rule.ts',
      'house-style-rules.ts',
    ]) {
      assertPureRuleImports(`scripts/check/${file}`);
    }
    assert.equal( typeof lineLengthRule, 'function');
    assert.equal( typeof headingGapRule, 'function');
    assert.equal( typeof stalePointerRule, 'function');
    assert.equal( typeof fileSizeRule, 'function');
  });
});
