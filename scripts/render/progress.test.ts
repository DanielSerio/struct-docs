import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextReady, ProgressScope } from '../policy/progress.js';
import { bodyNode, modelFile } from '../../tests/utils/roadmaps.js';
import { createRoadmapModel } from '../roadmap/model.js';
import { createProgressView } from '../roadmap/progress.js';
import { formatProgress } from './progress.js';

const scope: ProgressScope = {
  ...createProgressView('v1', createRoadmapModel([modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('done', 'done'), bodyNode('cut', 'cut'), bodyNode('working', 'in-progress'),
    bodyNode('stuck', 'blocked'), bodyNode('todo', 'todo', { deps: ['done', 'other:ship'] }),
  ])])), ancestors: [],
};

test('progress renders familiar status marks and declared dependency labels', () => {
  const output = formatProgress(scope, { kind: 'open' });
  assert.match(output, /^v1 \[in-progress\]\n {2}\[x\] done\n {2}\[-\] cut\n {2}\[>\] working\n {2}\[!\] stuck\n {2}\[ \] todo {2}\(needs done, other:ship\)/);
});

test('every next-ready outcome names the offered leaf or the reason no leaf is offered', () => {
  const ready = scope.root.children[0];
  assert.ok(ready);
  const cases: [NextReady, RegExp][] = [
    [{ kind: 'ready', node: ready }, /next: done$/],
    [{ kind: 'finished' }, /every node is done or cut$/],
    [{ kind: 'gated', blockers: ['other:ship'] }, /gated on other:ship$/],
    [{ kind: 'open' }, /no todo leaves, but work remains open$/],
    [{ kind: 'cyclic', cycles: [['v1:a', 'other:b', 'v1:a']] }, /cyclic - v1:a -> other:b -> v1:a$/],
  ];
  for (const [next, expected] of cases) assert.match(formatProgress(scope, next), expected);
});
