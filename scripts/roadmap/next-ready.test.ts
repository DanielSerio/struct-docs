import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyNode, modelFile } from '../../tests/utils/roadmaps.js';
import type { ProgressScope } from '../policy/progress.js';
import type { RoadmapFile } from './files.js';
import { indexRoadmaps } from './deps.js';
import { createRoadmapModel } from './model.js';
import { nextReady } from './next-ready.js';
import { createProgressView } from './progress.js';
import { scopeProgress } from './progress-scope.js';

function setup(files: readonly RoadmapFile[], others: readonly RoadmapFile[] = []) {
  const roadmaps = new Map([['v1', files], ['payments', others]]);
  const models = new Map([...roadmaps].map(([name, entries]) => [name, createRoadmapModel(entries)]));
  const model = models.get('v1');
  assert.ok(model);
  const view = createProgressView('v1', model);
  const scope = scopeProgress(view);
  assert.ok(scope);
  return { view, scope, index: indexRoadmaps(roadmaps, models) };
}

test('the first ready leaf is inside an in-progress breakout before a later milestone', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('billing', 'todo', { breakout: './billing.md' }), bodyNode('later'),
  ]);
  const billing = modelFile('roadmaps/v1/billing.md', 'billing', 'todo', [
    bodyNode('checkout', 'done'), bodyNode('webhooks', 'todo', { deps: ['checkout'] }),
  ]);
  const { scope, index } = setup([root, billing]);
  const result = nextReady(scope, index);
  assert.equal(scope.root.children[0]?.status, 'in-progress');
  assert.equal(result.kind, 'ready');
  if (result.kind === 'ready') assert.equal(result.node.id, 'webhooks');
});

test('ancestor gates skip a subtree while qualified deps never resolve to a local same-name node', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('auth', 'done'),
    bodyNode('billing', 'todo', { breakout: './billing.md', deps: ['payments:auth'] }),
    bodyNode('later', 'todo', { deps: ['auth'] }),
  ]);
  const billing = modelFile('roadmaps/v1/billing.md', 'billing', 'todo', [bodyNode('invoice')]);
  const payments = modelFile('roadmaps/payments/index.md', 'payments', 'todo', [bodyNode('auth')]);
  const { scope, index } = setup([root, billing], [payments]);
  const result = nextReady(scope, index);
  assert.equal(result.kind, 'ready');
  if (result.kind === 'ready') assert.equal(result.node.id, 'later');
});

test('scoped file descendants retain every ancestor gate and a satisfied cut dep permits work', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('billing', 'todo', { breakout: './billing.md', deps: ['payments:auth'] }),
  ]);
  const billing = modelFile('roadmaps/v1/billing.md', 'billing', 'todo', [
    bodyNode('invoices', 'todo', { breakout: './invoices.md', deps: ['missing'] }),
  ]);
  const invoices = modelFile('roadmaps/v1/invoices.md', 'invoices', 'todo', [bodyNode('send')]);
  const payments = modelFile('roadmaps/payments/index.md', 'payments', 'todo', [bodyNode('auth')]);
  const { view, index } = setup([root, billing, invoices], [payments]);
  const scope = scopeProgress(view, invoices.rel);
  assert.ok(scope);
  assert.deepEqual(scope.ancestors.map((node) => node.id), ['v1', 'billing']);
  assert.deepEqual(nextReady(scope, index), { kind: 'gated', blockers: ['payments:auth', 'missing'] });
  const paid = setup([root, billing, invoices], [
    modelFile(payments.rel, 'payments', 'todo', [bodyNode('auth', 'cut')]),
  ]);
  assert.deepEqual(nextReady(scope, paid.index), { kind: 'gated', blockers: ['missing'] });
  const ungated: ProgressScope = { ...scope, root: { ...scope.root, deps: [] } };
  const result = nextReady(ungated, paid.index);
  assert.equal(result.kind, 'ready');
  if (result.kind === 'ready') assert.equal(result.node.id, 'send');
  assert.equal(scopeProgress(view, 'roadmaps/v1/absent.md'), undefined);
});

test('finished, open and gated outcomes name different situations and deduplicate blockers', () => {
  for (const [nodes, expected] of [
    [[bodyNode('done', 'done'), bodyNode('cut', 'cut')], { kind: 'finished' }],
    [[bodyNode('working', 'in-progress'), bodyNode('stuck', 'blocked')], { kind: 'open' }],
    [[bodyNode('a', 'todo', { deps: ['missing', 'payments:missing'] }),
      bodyNode('b', 'todo', { deps: ['missing'] })], { kind: 'gated', blockers: ['missing', 'payments:missing'] }],
  ] as const) {
    const { scope, index } = setup([modelFile('roadmaps/v1/index.md', 'v1', 'todo', nodes)]);
    assert.deepEqual(nextReady(scope, index), expected);
  }
});

test('empty derived files are open work and are never offered as ready leaves', () => {
  const { scope, index } = setup([modelFile('roadmaps/v1/index.md', 'v1', 'done')]);
  assert.deepEqual(nextReady(scope, index), { kind: 'open' });
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('empty', 'done', { breakout: './empty.md' }),
  ]);
  const empty = modelFile('roadmaps/v1/empty.md', 'empty', 'done');
  const linked = setup([root, empty]);
  assert.deepEqual(nextReady(linked.scope, linked.index), { kind: 'open' });
});

test('a local cycle is reported by its qualified closed path before gated selection', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('a', 'todo', { deps: ['b'] }), bodyNode('b', 'todo', { deps: ['a'] }),
  ]);
  const { scope, index } = setup([root]);
  assert.deepEqual(nextReady(scope, index), { kind: 'cyclic', cycles: [['v1:a', 'v1:b', 'v1:a']] });
});

test('cross-roadmap cycles retain qualifiers but an unrelated cyclic roadmap does not hijack a view', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [bodyNode('a', 'todo', { deps: ['payments:a'] })]);
  const payments = modelFile('roadmaps/payments/index.md', 'payments', 'todo', [
    bodyNode('a', 'todo', { deps: ['v1:a'] }),
  ]);
  const { scope, index } = setup([root], [payments]);
  assert.deepEqual(nextReady(scope, index), { kind: 'cyclic', cycles: [['v1:a', 'payments:a', 'v1:a']] });
  const unrelated = setup([modelFile(root.rel, 'v1', 'todo', [bodyNode('start')])], [
    modelFile(payments.rel, 'payments', 'todo', [bodyNode('a', 'todo', { deps: ['a'] })]),
  ]);
  const result = nextReady(unrelated.scope, unrelated.index);
  assert.equal(result.kind, 'ready');
  if (result.kind === 'ready') assert.equal(result.node.id, 'start');
});
