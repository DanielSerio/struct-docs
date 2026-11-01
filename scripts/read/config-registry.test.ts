import { schemaMetadata } from '../../tests/utils/schema-metadata.js';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultConfig } from '../policy/config-defaults.js';
import { loadConfig, parseConfig } from './config.js';

// Locate source fixtures whether this test runs from source or compiled dist output.
function repoRoot() {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(directory, '.struct-docs.yml'))) {
    const parent = dirname(directory);
    assert.notEqual(parent, directory, 'repository config was not found');
    directory = parent;
  }
  return directory;
}

test('fixture changes a default, adds a custom doctype and removes an inherited doctype', () => {
  const file = join(repoRoot(), 'tests/fixtures/config/registry.yml');
  const { config, findings } = parseConfig(readFileSync(file, 'utf8'), file);
  assert.deepEqual(findings, []);
  assert.ok(config);
  assert.equal(Object.hasOwn(config.doctypes, 'product'), false);
  assert.equal(config.doctypes.specs?.type, 'requirement');
  assert.equal(config.doctypes.specs?.owns, false);
  assert.equal(config.doctypes.specs?.gitignored, false);
  assert.deepEqual(schemaMetadata(config.doctypes.guides), {
    type: 'guide', owns: true, gitignored: false,
    fields: { audience: { kind: 'string', required: true } },
  });
});

test('field null removes an inherited field while omitted entries and fields survive', () => {
  const file = join(repoRoot(), 'tests/fixtures/config/registry.yml');
  const { config } = parseConfig(readFileSync(file, 'utf8'));
  assert.ok(config);
  assert.equal(Object.hasOwn(config.doctypes.specs?.fields ?? {}, 'superseded-by'), false);
  assert.deepEqual(schemaMetadata(config.doctypes.specs?.fields.status), schemaMetadata(defaultConfig().doctypes.specs?.fields.status));
  assert.deepEqual(schemaMetadata(config.doctypes.reviews), schemaMetadata(defaultConfig().doctypes.reviews));
  assert.deepEqual(schemaMetadata(config.doctypes.specs?.fields.audience), { kind: 'string', required: false });
});

test('field replacements do not retain options from the prior kind', () => {
  const { config, findings } = parseConfig('doctypes: {specs: {fields: {status: {kind: string}}}}');
  assert.deepEqual(findings, []);
  assert.deepEqual(schemaMetadata(config?.doctypes.specs?.fields.status), { kind: 'string', required: false });
});

test('a partial default doctype inherits its type, flags and fields', () => {
  const { config, findings } = parseConfig('doctypes: {specs: {owns: false}}');
  assert.deepEqual(findings, []);
  assert.deepEqual(schemaMetadata(config?.doctypes.specs), schemaMetadata({ ...defaultConfig().doctypes.specs, owns: false }));
  assert.deepEqual(schemaMetadata(parseConfig('doctypes: {}').config), schemaMetadata(defaultConfig()));
});

test('gitignored doctypes automatically own no topics, including inherited ownership', () => {
  const { config, findings } = parseConfig('doctypes: {specs: {gitignored: true}, notes: {type: note, gitignored: true}}');
  assert.deepEqual(findings, []);
  assert.equal(config?.doctypes.specs?.owns, false);
  assert.equal(config?.doctypes.notes?.owns, false);
});

test('invalid registry identities return source-located errors without partial config', () => {
  const cases = [
    ['doctypes:\n  Guides: {type: guide}', 2, /directory/],
    ['doctypes:\n  guides:\n    type: Guide', 3, /type/],
    ['doctypes:\n  guides: {}', 2, /requires/],
    ['doctypes:\n  specs:\n    fields:\n      Bad: {kind: string}', 4, /field name/],
  ] as const;
  for (const [source, line, message] of cases) {
    const result = parseConfig(source, 'registry.yml');
    assert.equal(result.config, undefined);
    assert.ok(result.findings.some((finding) => finding.file === 'registry.yml' &&
      finding.line === line && message.test(finding.message)), source);
  }
});

test('parsing is independent and same type names can be routed by different directories', () => {
  const source = 'doctypes: {guides: {type: guide}, runbooks: {type: guide}, constructor: {type: guide}}';
  const first = parseConfig(source).config;
  assert.ok(first?.doctypes.specs?.fields.status?.values);
  first.doctypes.specs.fields.status.values.push('local');
  const second = parseConfig(source).config;
  assert.deepEqual(second?.doctypes.specs?.fields.status?.values, ['draft', 'active', 'superseded']);
  assert.equal(second?.doctypes.guides?.type, 'guide');
  assert.equal(second?.doctypes.runbooks?.type, 'guide');
  assert.equal(Object.entries(second?.doctypes ?? {}).find(([name]) => name === 'constructor')?.[1].type, 'guide');
});

test('the repository config loads as a complete normalized registry without findings', () => {
  const { config, findings } = loadConfig(repoRoot());
  assert.deepEqual(findings, []);
  assert.ok(config);
  assert.equal(config.doctypes.product?.type, 'prd');
  assert.equal(config.doctypes.specs?.fields.status?.required, true);
  assert.equal(config.doctypes.reviews?.gitignored, true);
  assert.equal(config.doctypes.reviews?.owns, false);
});

test('null removals reject misspelled doctypes and fields at the offending name', () => {
  const cases = [
    ['doctypes:\n  speks: null', 2],
    ['doctypes:\n  specs:\n    fields:\n      statsu: null', 4],
    ['doctypes:\n  guides:\n    type: guide\n    fields:\n      audience: null', 5],
  ] as const;
  for (const [source, line] of cases) {
    const result = parseConfig(source, 'null-removal.yml');
    assert.equal(result.config, undefined);
    assert.ok(result.findings.some((finding) => finding.file === 'null-removal.yml' &&
      finding.line === line && /cannot remove/.test(finding.message)));
  }
});
