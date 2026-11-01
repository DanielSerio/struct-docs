import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConfig } from './config.js';

const sourceFor = (target: string) => `doctypes:
  specs:
    fields:
      related:
        kind: reference
        to: ${target}
`;

test('reference restrictions reject unknown, reserved working and gitignored targets atomically', () => {
  for (const target of ['speks', 'living', 'constructor', 'reviews']) {
    const result = parseConfig(sourceFor(target), 'targets.yml');
    assert.equal(result.config, undefined, target);
    assert.equal(result.findings.length, 1, target);
    assert.equal(result.findings[0]?.file, 'targets.yml');
    assert.equal(result.findings[0]?.line, 6);
  }
});

test('reference restrictions resolve final registry removals and forward declarations', () => {
  const removed = parseConfig(sourceFor('product') + '  product: null\n');
  assert.equal(removed.config, undefined);
  assert.match(removed.findings[0]?.message ?? '', /not configured/);
  const custom = parseConfig(sourceFor('guides') + '  guides: {type: guide}\n');
  assert.deepEqual(custom.findings, []);
  assert.ok(custom.config);
  const restored = parseConfig(sourceFor('reviews') + '  reviews: {gitignored: false}\n');
  assert.deepEqual(restored.findings, []);
});

test('reserved reference directories and local-to-local references remain valid', () => {
  for (const target of ['templates', 'roadmaps', 'specs']) {
    assert.deepEqual(parseConfig(sourceFor(target)).findings, [], target);
  }
  const local = parseConfig(`doctypes:
  reviews:
    fields:
      related: {kind: reference, to: reviews}
`);
  assert.deepEqual(local.findings, []);
  assert.ok(local.config);
});
