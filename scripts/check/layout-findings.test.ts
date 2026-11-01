import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPureRuleImports } from '../../tests/utils/rule-imports.js';
import { layoutFindings } from './layout-findings.js';

test('layout collection uses classifier outcomes instead of inventing a second path policy', () => {
  const result = layoutFindings([
    { path: 'anything.bin', classification: { cls: 'forbidden', reason: 'classifier reason' } },
    { path: 'vendor/ignored.md', classification: { cls: 'ungoverned', excluded: true } },
    { path: 'guides/a.md', classification: { cls: 'ungoverned' } },
    { path: 'guides/b.md', classification: { cls: 'ungoverned' } },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0]?.message, 'classifier reason');
  assert.equal(result[1]?.file, 'guides/');
  assert.match(result[1]?.message ?? '', /2 unrouted/);
  assertPureRuleImports('scripts/check/layout-findings.ts');
  assertPureRuleImports('scripts/check/roadmap-warnings.ts');
});
