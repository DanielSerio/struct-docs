import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyNode, fixtureRoadmaps, modelFile } from '../../tests/utils/roadmaps.js';
import { findCycles, indexRoadmaps, resolveDep, resolverFor, unresolvedDeps } from './deps.js';
import { splitDep, depReference } from './dependency.js';

// Ported fixture intentionally gives two roadmaps their own different auth statuses.
test('bare and qualified deps resolve only in their specified roadmap', () => {
  const roadmaps = fixtureRoadmaps();
  const index = indexRoadmaps(roadmaps);
  assert.equal(resolveDep(index, 'payments', 'auth')?.status, 'todo');
  assert.equal(resolveDep(index, 'payments', 'v1:auth')?.status, 'done');
  assert.equal(resolverFor(index, 'payments')('v1:auth')?.status, 'done');
  assert.equal(resolveDep(index, 'payments', 'v1:billing')?.status, 'in-progress');
  assert.equal(resolveDep(index, 'v1', 'v1:checkout')?.status, 'done');
  assert.equal(resolveDep(index, 'v1', 'other:auth'), null);
  assert.deepEqual(unresolvedDeps(roadmaps, index), []);
  assert.deepEqual(findCycles(index), []);
});

test('unresolved deps retain the actual Deps field line and skip malformed syntax', () => {
  const node = bodyNode('a', 'todo', { deps: ['ghost', 'other:a', '../bad'],
    locations: { deps: { line: 19, start: 6, end: 20 } } });
  const roadmaps = new Map([['v1', [modelFile('roadmaps/v1/index.md', 'v1', 'todo', [node])]]]);
  const findings = unresolvedDeps(roadmaps, indexRoadmaps(roadmaps));
  assert.equal(findings.length, 2);
  assert.ok(findings.every((finding) => finding.file === 'roadmaps/v1/index.md' && finding.line === 19));
  assert.match(findings[0]?.message ?? '', /dep `ghost` resolves to no node/);
  assert.match(findings[1]?.message ?? '', /other:a/);
});

test('cycles are found within and across roadmaps without merging equal local ids', () => {
  const local = new Map([['v1', [modelFile('roadmaps/v1/index.md', 'v1', 'todo', [
    bodyNode('a', 'todo', { deps: ['b'] }), bodyNode('b', 'todo', { deps: ['a'] }),
  ])]]]);
  assert.deepEqual([...new Set(findCycles(indexRoadmaps(local))[0])].sort(), ['v1:a', 'v1:b']);
  const cross = new Map([
    ['v1', [modelFile('roadmaps/v1/index.md', 'v1', 'todo', [bodyNode('auth', 'todo', { deps: ['other:auth'] })])]],
    ['other', [modelFile('roadmaps/other/index.md', 'other', 'todo', [bodyNode('auth', 'todo', { deps: ['v1:auth'] })])]],
  ]);
  assert.deepEqual([...new Set(findCycles(indexRoadmaps(cross))[0])].sort(), ['other:auth', 'v1:auth']);
  cross.set('other', [modelFile('roadmaps/other/index.md', 'other', 'todo', [bodyNode('auth', 'done')])]);
  assert.deepEqual(findCycles(indexRoadmaps(cross)), []);
});

test('dependency grammar rejects path references and malformed qualifiers', () => {
  assert.deepEqual(splitDep('auth'), { roadmap: null, id: 'auth' });
  assert.deepEqual(splitDep('v1:auth'), { roadmap: 'v1', id: 'auth' });
  for (const value of ['', 'v1:', ':auth', 'a:b:c', '../auth', 'v1/auth', ['auth']]) {
    assert.equal(splitDep(value), null);
    assert.equal(typeof depReference(value), 'string');
  }
  assert.equal(depReference('v1:auth'), null);
});
