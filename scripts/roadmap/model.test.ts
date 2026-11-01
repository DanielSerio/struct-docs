import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyNode, modelFile } from '../../tests/utils/roadmaps.js';
import { createRoadmapModel } from './model.js';
import { resolveDep, indexRoadmaps } from './deps.js';

const breakout = (id: string, path = `./${id}.md`) => bodyNode(id, 'todo', { breakout: path });

test('breakouts resolve by path and matching frontmatter id, with extension case preserved', () => {
  const node = breakout('billing');
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [node]);
  const child = modelFile('roadmaps/v1/billing.MD', 'billing');
  const model = createRoadmapModel([root, child]);
  assert.equal(model.resolveBreakout(root.rel, node), child);
  assert.equal(model.byRel.get(child.rel), child);
  const wrong = modelFile(child.rel, 'other');
  assert.equal(createRoadmapModel([root, wrong]).resolveBreakout(root.rel, node), null);
  assert.equal(createRoadmapModel([root]).resolveBreakout(root.rel, node), null);
});

test('nested stale breakouts converge to one fixed point independent of file order', () => {
  const files = [
    modelFile('roadmaps/v1/index.md', 'v1', 'done', [breakout('a')]),
    modelFile('roadmaps/v1/a.md', 'a', 'done', [breakout('b')]),
    modelFile('roadmaps/v1/b.md', 'b', 'done', [bodyNode('leaf', 'todo')]),
  ];
  for (const ordered of [files, [...files].reverse()]) {
    const model = createRoadmapModel(ordered);
    assert.equal(model.root?.rel, 'roadmaps/v1/index.md');
    for (const id of ['v1', 'a', 'b']) assert.equal(model.effectiveStatus(id), 'todo');
    assert.equal(model.byId.get('a')?.status, 'todo');
    assert.equal(model.byId.get('b')?.status, 'todo');
  }
  assert.equal(files[0]?.data.status, 'done', 'model does not mutate authored/stored input');
});

test('rollup and dependency addressing substitute the same effective breakout status', () => {
  const parent = breakout('billing');
  const root = modelFile('roadmaps/v1/index.md', 'v1', 'todo', [parent]);
  const child = modelFile('roadmaps/v1/billing.md', 'billing', 'todo', [bodyNode('invoice', 'done')]);
  const roadmaps = new Map([['v1', [root, child]]]);
  const model = createRoadmapModel([root, child]);
  const index = indexRoadmaps(roadmaps, new Map([['v1', model]]));
  assert.equal(model.effectiveStatus('v1'), 'done');
  assert.equal(model.byId.get('billing')?.status, 'done');
  assert.equal(resolveDep(index, 'v1', 'billing')?.status, 'done');
  assert.equal(resolveDep(index, 'v1', 'invoice')?.status, 'done');
  assert.equal(model.effectiveStatus('missing', 'blocked'), 'blocked');
});
