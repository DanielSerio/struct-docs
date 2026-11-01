import { schemaMetadata } from '../../tests/utils/schema-metadata.js';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { defaultConfig } from '../policy/config-defaults.js';
import { loadConfig, parseConfig } from './config.js';

test('missing config loads independent defaults without findings', () => {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-config-'));
  try {
    const result = loadConfig(root);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(schemaMetadata(result.config), schemaMetadata(defaultConfig()));
    assert.ok(result.config);
    result.config.ignore.push('local/');
    assert.deepEqual(loadConfig(root).config?.ignore, []);
    writeFileSync(join(root, '.struct-docs.yml'), 'ignore: [generated/]');
    assert.deepEqual(loadConfig(root).config?.ignore, ['generated/']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed YAML and duplicate keys report exact file and line without a config', () => {
  for (const [source, line] of [
    ['ignore: [', 1], ['ignore: []\nignore: []', 2],
    ['doctypes:\n  specs:\n    type: spec\n    type: guide', 4],
  ] as const) {
    const result = parseConfig(source, 'fixture.yml');
    assert.equal(result.config, undefined);
    assert.ok(result.findings.length > 0);
    assert.equal(result.findings[0]?.file, 'fixture.yml');
    assert.equal(result.findings[0]?.line, line);
    assert.equal(result.findings[0]?.severity, 'error');
  }
});

test('unknown root, doctype and field options point at their keys', () => {
  const cases = [
    ['ignore: []\nunknown: true', 2],
    ['doctypes:\n  specs:\n    unexpected: true', 3],
    ['doctypes:\n  specs:\n    fields:\n      status:\n        kind: string\n        surprise: true', 6],
    ['living:\n  unexpected: false', 2],
  ] as const;
  for (const [source, line] of cases) {
    const result = parseConfig(source);
    assert.equal(result.config, undefined);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0]?.line, line);
    assert.match(result.findings[0]?.message ?? '', /unknown option/);
  }
});

test('all errors are collected but no valid portion is returned', () => {
  const result = parseConfig('ignore: [generated/]\nunknown: true\nliving:\n  gitignored: yes');
  assert.equal(result.config, undefined);
  assert.deepEqual(result.findings.map(({ line }) => line), [2, 4]);
});

test('root lists, scalars and explicit null are rejected while empty configs use defaults', () => {
  for (const source of ['[]', 'false', '42', 'null', '!!set {a: null}']) {
    const result = parseConfig(source);
    assert.equal(result.config, undefined, source);
    assert.ok(result.findings.length > 0, source);
  }
  for (const source of ['', '# Project defaults', '{}']) {
    assert.deepEqual(schemaMetadata(parseConfig(source).config), schemaMetadata(defaultConfig()));
    assert.deepEqual(parseConfig(source).findings, []);
  }
});

test('malformed nested options cannot reach normalization', () => {
  const cases = [
    'ignore: false', 'ignore: [42]', 'living: []', 'doctypes: null',
    'doctypes: {specs: false}', 'doctypes: {specs: {fields: []}}',
    'doctypes: {specs: {type: false}}', 'doctypes: {specs: {owns: yes}}',
    'doctypes: {specs: {fields: {status: false}}}',
    'doctypes: {specs: {fields: {status: {required: true}}}}',
    'doctypes: {specs: {fields: {status: {kind: enum, values: [42]}}}}',
  ];
  for (const source of cases) {
    const result = parseConfig(source);
    assert.equal(result.config, undefined, source);
    assert.ok(result.findings.every(({ line }) => line === 1), source);
  }
});

test('BOM, CRLF and flow YAML retain locations and ordinary YAML parsing', () => {
  const result = parseConfig('\uFEFF# comment\r\nignore: [generated/]\r\nliving: {gitignored: false}\r\n');
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.config?.ignore, ['generated/']);
  assert.equal(result.config?.living.gitignored, false);
  assert.equal(result.lineAt(['living', 'gitignored']), 3);
});

test('unknown YAML tags fail instead of being half interpreted', () => {
  const result = parseConfig('ignore: !unknown []');
  assert.equal(result.config, undefined);
  assert.equal(result.findings[0]?.line, 1);
});

test('the source locator supports sequence items for future ignore-policy findings', () => {
  const result = parseConfig('ignore:\n  - generated/\n  - vendor/\n');
  assert.deepEqual(result.findings, []);
  assert.equal(result.lineAt(['ignore', 0]), 2);
  assert.equal(result.lineAt(['ignore', 1]), 3);
});

test('numeric YAML keys keep semantic errors at the actual nested option', () => {
  for (const key of ['1', "'1'", '01']) {
    const source = `doctypes:\n  specs:\n    fields:\n      ${key}:\n        kind: invalid\n`;
    const result = parseConfig(source);
    assert.equal(result.config, undefined);
    assert.equal(result.findings[0]?.line, 5);
  }
});

test('loadConfig findings use a stable project-relative name', () => {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-config-path-'));
  try {
    writeFileSync(join(root, '.struct-docs.yml'), '# Config\nunknown: true\n');
    const result = loadConfig(root);
    assert.equal(result.config, undefined);
    assert.equal(result.findings[0]?.file, '.struct-docs.yml');
    assert.equal(result.findings[0]?.line, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
