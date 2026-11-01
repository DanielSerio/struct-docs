import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureRoadmaps } from '../../tests/utils/roadmaps.js';
import { parseBody } from './roadmap-body.js';
import { rollupOf } from '../roadmap/rollup.js';

// Ported from manage-docs' body-parser fixture tests.
test('fixture parses statuses, acceptance, deps, breakouts and dated notes', () => {
  const files = fixtureRoadmaps().get('v1');
  const root = files?.find((file) => file.rel.endsWith('index.md'));
  const child = files?.find((file) => file.rel.endsWith('billing.md'));
  assert.ok(root && child);
  assert.deepEqual(root.nodes.map((node) => [node.id, node.status]), [
    ['auth', 'done'], ['billing', 'in-progress'], ['reporting', 'todo'], ['mobile-app', 'cut'], ['exports', 'todo'],
  ]);
  assert.deepEqual(root.nodes[0]?.acceptance.map((entry) => entry.done), [true, true]);
  assert.equal(root.nodes[2]?.acceptance[0]?.done, false);
  assert.deepEqual(root.nodes[2]?.deps, ['billing']);
  assert.equal(root.nodes[1]?.breakout, './billing.md');
  assert.equal(root.nodes[1]?.intent, undefined);
  assert.equal(child.data.intent, 'Stripe checkout plus webhook.');
  assert.match(root.nodes[3]?.notes[0] ?? '', /cut, web is enough/);
  assert.ok(root.nodes.every((node) => node.line > 0));
  assert.equal(rollupOf(root.nodes), root.data.status);
  assert.equal(rollupOf(child.nodes), child.data.status);
  assert.equal(root.document.roadmap?.nodes, root.nodes, 'reader body parse is reused by model preparation');
});

test('source locations cover exact heading, field and acceptance tokens with CRLF and body offsets', () => {
  const source = '---\r\nid: x\r\n---\r\n### task <!--status:  todo  -->\r\nDeps:   a, v2:b\r\nAcceptance:\r\n- [x] works\r\n';
  const { nodes, findings } = parseBody(source, 3);
  assert.deepEqual(findings, []);
  const node = nodes[0];
  assert.ok(node?.statusLoc);
  const lines = source.split(/\r?\n/);
  assert.equal(lines[node.statusLoc.line - 1]?.slice(node.statusLoc.start, node.statusLoc.end), 'todo');
  assert.equal(node.line, 4);
  assert.equal(node.locations.deps?.line, 5);
  assert.equal(lines[4]?.slice(node.locations.deps?.start, node.locations.deps?.end), 'a, v2:b');
  assert.equal(node.acceptance[0]?.line, 7);
});

test('missing status, malformed headings and unknown hyphenated fields remain findings', () => {
  const missing = parseBody('## Milestones\n\n### orphan\nIntent: x\n');
  assert.equal(missing.findings[0]?.line, 3);
  assert.match(missing.findings[0]?.message ?? '', /no `<!-- status/);
  const bad = parseBody('### malformed heading text\nIntent: ignored\n');
  assert.equal(bad.nodes.length, 0);
  assert.match(bad.findings[0]?.message ?? '', /malformed/);
  for (const key of ['Owner', 'Blocked-on']) {
    const result = parseBody(`### a <!-- status: todo -->\n${key}: someone\n`);
    assert.equal(result.findings[0]?.line, 2);
    assert.match(result.findings[0]?.message ?? '', new RegExp(key));
  }
});

test('hyphenated superseded-by is stored and a section heading closes the previous node', () => {
  const parsed = parseBody('### a <!-- status: cut -->\nIntent: x\nSuperseded-by: v2:beta\n\n## Notes\nIntent: stray\n');
  assert.deepEqual(parsed.findings, []);
  assert.equal(parsed.nodes.length, 1);
  assert.equal(parsed.nodes[0]?.['superseded-by'], 'v2:beta');
  assert.equal(parsed.nodes[0]?.locations['superseded-by']?.line, 3);
  assert.equal(parsed.nodes[0]?.intent, 'x');
});
