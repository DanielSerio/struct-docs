import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderGitignore } from './gitignore.js';

test('managed gitignore preserves independent canonical patterns and comments', () => {
  const original = '# team reason\r\n/docs/reviews/\r\nnode_modules/\r\n';
  const rendered = renderGitignore(original, ['/docs/living/', '/docs/reviews/']);
  assert.ok(rendered?.startsWith(original));
  assert.equal(rendered?.match(/\/docs\/reviews\//g)?.length, 1);
  assert.equal(renderGitignore(rendered, ['/docs/living/', '/docs/reviews/']), rendered);
  const cleared = renderGitignore(rendered, []);
  assert.ok(cleared?.startsWith(original));
  assert.ok(!cleared?.includes('/docs/living/'));
});

test('managed gitignore reconciles only owned entries and refuses ambiguous markers', () => {
  const rendered = renderGitignore(null, ['/docs/living/', '/docs/reviews/']);
  const changed = renderGitignore(rendered, ['/docs/living/']);
  assert.ok(!changed?.includes('/docs/reviews/'));
  assert.equal(renderGitignore('user-pattern\n', []), 'user-pattern\n');
  assert.throws(() => renderGitignore('# struct-docs:ignore\n', []), /ambiguous/);
});
