import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ProgressNode } from '../policy/progress.js';
import { bodyNode, modelFile } from '../../tests/utils/roadmaps.js';
import { createRoadmapModel } from './model.js';
import { createProgressView, createProgressViews } from './progress.js';

const order = (node: ProgressNode): string[] => [node.id, ...node.children.flatMap(order)];

test('progress follows nested breakouts in document order with effective model statuses', () => {
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'done', [
    bodyNode('billing', 'done', { breakout: './billing.md', deps: ['payments:ready'] }),
    bodyNode('later', 'todo'),
  ]);
  const billing = modelFile('roadmaps/v1/billing.md', 'billing', 'done', [
    bodyNode('invoices', 'done', { breakout: './invoices.md' }), bodyNode('taxes', 'todo'),
  ]);
  const invoices = modelFile('roadmaps/v1/invoices.md', 'invoices', 'done', [
    bodyNode('format', 'done'), bodyNode('send', 'in-progress'),
  ]);
  const model = createRoadmapModel([invoices, root, billing]);
  const view = createProgressView('v1', model);
  assert.deepEqual(order(view.root), ['v1', 'billing', 'invoices', 'format', 'send', 'taxes', 'later']);
  assert.equal(view.root.status, 'in-progress');
  const milestone = view.root.children[0];
  assert.ok(milestone);
  assert.equal(milestone.status, model.byId.get('billing')?.status);
  assert.equal(milestone.status, 'in-progress');
  assert.equal(milestone.file, root.rel);
  assert.equal(milestone.line, 12);
  assert.equal(milestone.breakout, billing.rel);
  assert.deepEqual(milestone.deps, ['payments:ready']);
  assert.equal(milestone.leaf, false);
  assert.equal(milestone.children[1]?.leaf, true);
  assert.equal(root.nodes[0]?.status, 'done', 'authored source remains unchanged');
});

test('each roadmap gets its own root identity and rolled-up status, including empty files', () => {
  const models = new Map([
    ['v1', createRoadmapModel([modelFile('roadmaps/v1/index.md', 'v1', 'todo', [bodyNode('ship', 'done')])])],
    ['v2', createRoadmapModel([modelFile('roadmaps/v2/index.md', 'v2', 'done')])],
  ]);
  const views = createProgressViews(models);
  assert.deepEqual(views.map(({ roadmap, root }) => [roadmap, root.id, root.status]), [
    ['v1', 'v1', 'done'], ['v2', 'v2', 'todo'],
  ]);
  assert.equal(views[1]?.root.leaf, false, 'an empty file aggregate is never an authored leaf');
});

test('malformed missing roots, unresolved breakouts and recursive links fail without hanging', () => {
  assert.throws(() => createProgressView('v1', createRoadmapModel([])), /no modeled root/);
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [bodyNode('a', 'todo', { breakout: './a.md' })]);
  assert.throws(() => createProgressView('v1', createRoadmapModel([root])), /Unresolved breakout/);
  const child = modelFile('roadmaps/v1/a.md', 'a', 'todo', [bodyNode('v1', 'todo', { breakout: './index.md' })]);
  assert.throws(() => createProgressView('v1', createRoadmapModel([root, child])), /Cyclic breakout/);
});
