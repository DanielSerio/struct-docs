import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkedRoadmaps, leafSource, rootSource } from '../../tests/utils/roadmap-checks.js';
import { parseConfig } from '../read/config.js';

const spec = (status: string) => `---\ntitle: API\ntype: spec\npurpose: Contract\nstatus: ${status}\nowns: [api]\n---\n`;
const gate = (leafStatus: string, specStatus: string) => checkedRoadmaps({
  'roadmaps/v1/index.md': rootSource('v1', leafSource('task', leafStatus), 'specs: [specs/api]\n'),
  'specs/api.md': spec(specStatus),
}).findings.filter((finding) => finding.rule === 'roadmap-spec');

test('draft-spec gate uses effective roadmap status, not the stored frontmatter status', () => {
  for (const status of ['in-progress', 'done']) {
    const findings = gate(status, 'draft');
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.line, 7);
    assert.match(findings[0]?.message ?? '', /still `draft`/);
  }
  assert.deepEqual(gate('todo', 'draft'), []);
  assert.deepEqual(gate('cut', 'draft'), []);
});

test('superseded specs fail even for planned work; active specs never gate progress', () => {
  for (const status of ['todo', 'in-progress', 'done']) {
    assert.match(gate(status, 'superseded')[0]?.message ?? '', /is `superseded`/);
    assert.deepEqual(gate(status, 'active'), []);
  }
});

test('custom documents without status are not draft specs, even when the roadmap is done', () => {
  const config = parseConfig('doctypes: {guides: {type: guide}, contracts: {type: spec}}').config;
  assert.ok(config);
  const result = checkedRoadmaps({
    'roadmaps/v1/index.md': rootSource('v1', leafSource('task', 'done'), 'specs: [guides/setup, contracts/api]\n'),
    'guides/setup.md': '---\ntitle: Setup\ntype: guide\npurpose: Help\nowns: [setup]\n---\n',
    'contracts/api.md': '---\ntitle: API\ntype: spec\npurpose: Contract\nowns: [api]\n---\n',
  }, config);
  assert.deepEqual(result.findings, []);
});

test('local-only spec documents never change another roadmap finding when present or absent', () => {
  const config = parseConfig('doctypes: {local: {type: spec, gitignored: true}}').config;
  assert.ok(config);
  const root = { 'roadmaps/v1/index.md': rootSource('v1', leafSource('task', 'done'), 'specs: [local/api]\n') };
  const absent = checkedRoadmaps(root, config).findings;
  const present = checkedRoadmaps({ ...root, 'local/api.md': spec('draft') }, config).findings;
  assert.deepEqual(absent, present);
  assert.deepEqual(present, []);
});
