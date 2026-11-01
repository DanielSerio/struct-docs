import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesRoadmapPath } from '../policy/locked-policy.js';
import { parseConfig } from './config.js';

function rejected(source: string, line: number, message: RegExp) {
  const result = parseConfig(source, 'locked-policy.yml');
  assert.equal(result.config, undefined, source);
  assert.ok(result.findings.some((finding) => finding.file === 'locked-policy.yml' &&
    finding.line === line && message.test(finding.message)), source);
}

test('system fields cannot be replaced or removed, including ownership as a custom field', () => {
  for (const name of ['title', 'type', 'purpose', 'owns']) {
    for (const definition of ['null', '{kind: string}']) {
      rejected(`doctypes:\n  specs:\n    fields:\n      ${name}: ${definition}\n`,
        4, /system-owned field/);
    }
  }
});

test('roadmap directory and types cannot be changed, removed or routed elsewhere', () => {
  for (const definition of ['null', '{type: guide}', '{type: roadmap}', '{gitignored: true}']) {
    rejected(`doctypes:\n  roadmaps: ${definition}\n`, 2, /reserved/);
  }
  for (const type of ['roadmap', 'roadmap-node']) {
    rejected(`doctypes:\n  plans:\n    type: ${type}\n`, 3, /locked roadmap type/);
  }
});

test('templates and living remain reserved even when an entry tries to remove them', () => {
  for (const directory of ['templates', 'living']) {
    for (const definition of ['null', '{type: guide}']) {
      rejected(`doctypes:\n  ${directory}: ${definition}\n`, 2, /reserved/);
    }
  }
});

test('all patterns that can reach roadmaps fail at their ignore item line', () => {
  const patterns = ['roadmaps', '/roadmaps/', 'roadmaps/**', 'roadmaps/future/unknown.md',
    '**', '**/unknown.md', '**/deep/unknown.md', '*/unknown.md', 'r*/future/*.md',
    '/road*/*/index.md', '*', '*/roadmaps.md', 'roadmaps/**/arbitrary/deeper/document.md'];
  for (const pattern of patterns) {
    assert.equal(matchesRoadmapPath(pattern), true, pattern);
    rejected(`ignore:\n  - generated/\n  - '${pattern}'\n`, 3, /locked `roadmaps\/` paths/);
  }
});

test('literal near misses and patterns anchored in other directories remain configurable', () => {
  for (const pattern of ['roadmap/', 'roadmaps-old/**', 'roadmaps.md', 'roadmap?/**',
    'roadmaps[1]/**', 'generated/**', 'vendor/**/roadmaps/**']) {
    assert.equal(matchesRoadmapPath(pattern), false, pattern);
    assert.deepEqual(parseConfig(`ignore: ['${pattern}']`).findings, [], pattern);
  }
});

test('gitignored documents cannot explicitly claim ownership, including inherited defaults', () => {
  rejected('doctypes:\n  guides:\n    type: guide\n    gitignored: true\n    owns: true\n',
    5, /cannot be combined/);
  rejected('doctypes:\n  reviews:\n    owns: true\n', 3, /cannot be combined/);
});

test('project customization and automatic ownership disabling remain available', () => {
  const result = parseConfig(`living: {gitignored: false}
doctypes:
  product: null
  specs: {type: guideline, fields: {status: null, audience: {kind: string}}}
  reviews: {gitignored: false, owns: true}
  guides: {type: guide, gitignored: true}
  local: {type: note, gitignored: true, owns: false}
`);
  assert.deepEqual(result.findings, []);
  assert.ok(result.config);
  assert.equal(result.config.doctypes.product, undefined);
  assert.equal(result.config.doctypes.specs?.type, 'guideline');
  assert.equal(result.config.doctypes.specs?.fields.status, undefined);
  assert.equal(result.config.doctypes.reviews?.owns, true);
  assert.equal(result.config.doctypes.guides?.owns, false);
  assert.equal(result.config.doctypes.local?.owns, false);
});
