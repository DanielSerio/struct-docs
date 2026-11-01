import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLeaf, isSatisfied, rollupOf } from './rollup.js';

// Ported from manage-docs: every ordered rule is observable, especially cut and empty.
test('ordered rollup covers every rule and precedence', () => {
  const cases = [
    [[], 'todo'], [['cut', 'cut'], 'cut'], [['blocked', 'in-progress'], 'in-progress'],
    [['todo', 'blocked'], 'blocked'], [['done', 'done'], 'done'], [['todo', 'todo'], 'todo'],
    [['done', 'todo'], 'in-progress'], [['done', 'cut'], 'done'], [['todo', 'cut'], 'todo'],
    [['cut', 'in-progress'], 'in-progress'],
  ] as const;
  for (const [statuses, expected] of cases) {
    assert.equal(rollupOf(statuses.map((status) => ({ status }))), expected, statuses.join(','));
  }
});

test('authored leaves are distinct from derived file-level nodes, even empty files', () => {
  assert.equal(isLeaf({}), true);
  assert.equal(isLeaf({ breakout: './x.md' }), false);
  assert.equal(isLeaf({ children: [{ status: 'todo' }] }), false);
  assert.equal(isLeaf({ fileLevel: true }), false);
  assert.equal(rollupOf([]), 'todo');
});

test('only done or cut satisfies a dependency', () => {
  for (const status of ['done', 'cut']) assert.equal(isSatisfied(status), true);
  for (const status of ['todo', 'in-progress', 'blocked', undefined]) assert.equal(isSatisfied(status), false);
});
