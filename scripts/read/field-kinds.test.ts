import type { FieldDefinition } from '../policy/config-types.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { defaultConfig } from '../policy/config-defaults.js';
import { parseConfig } from './config.js';

const fixture = readFileSync('tests/fixtures/config/field-kinds.yml', 'utf8');

test('all four configured kinds store callable grammars accepting and rejecting values', () => {
  const { config, findings } = parseConfig(fixture);
  assert.deepEqual(findings, []);
  const fields = config?.doctypes.guides?.fields;
  assert.ok(fields);
  const cases = [
    ['audience', 'developers', [' ', '', 42, true, ['developers']]],
    ['stage', 'active', ['unknown', '', 42, ['active']]],
    ['tags', ['api', 'setup'], ['api', ['', 'api'], [42], null]],
    ['related', 'roadmaps/v1/index', ['accounts', '/specs/accounts', '../specs/accounts', 42]],
  ] as const;
  for (const [name, accepted, rejected] of cases) {
    const field: FieldDefinition | undefined = fields[name];
    assert.ok(field);
    assert.equal(typeof field.validate, 'function');
    assert.equal(field.validate(accepted), null, name);
    for (const value of rejected) assert.equal(typeof field.validate(value), 'string', name);
  }
  assert.equal(fields.audience?.required, true);
  assert.equal(fields.stage?.required, false);
  assert.equal(fields.tags?.validate([]), null);
  assert.equal(fields.tags?.validate(['api', 'api']), null);
});

test('reference grammars preserve directory restrictions and reject unsafe or malformed paths', () => {
  const fields = parseConfig(fixture).config?.doctypes.guides?.fields;
  assert.equal(fields?.template?.validate('templates/code-review-v1'), null);
  assert.match(fields?.template?.validate('specs/code-review-v1') ?? '', /templates/);
  for (const value of ['specs/a.md', 'specs/../a', 'specs/./a', 'specs//a',
    'specs/a/', 'C:/specs/a', 'specs\\a', 'specs/Account', 'specs/a_b', ' specs/a']) {
    assert.equal(typeof fields?.related?.validate(value), 'string', value);
  }
});

test('default and inherited fields are compiled without sharing mutable enum inputs', () => {
  const config = defaultConfig();
  assert.equal(config.doctypes.specs?.fields.status?.validate('active'), null);
  assert.equal(config.doctypes.reviews?.fields.subject?.validate(''), 'must be a nonempty string');
  assert.equal(config.doctypes.reviews?.fields.template?.validate('templates/code-review-v1'), null);
  config.doctypes.specs?.fields.status?.values?.push('local');
  assert.equal(typeof config.doctypes.specs?.fields.status?.validate('local'), 'string');
  assert.equal(typeof defaultConfig().doctypes.specs?.fields.status?.validate('local'), 'string');
  assert.equal(parseConfig('doctypes: {specs: {owns: false}}').config?.doctypes.specs?.fields.status?.validate('draft'), null);
});

test('invalid field definitions fail atomically at their offending option lines', () => {
  const cases = [
    ['kind: number', 5, /unsupported field kind/],
    ['kind: string\n        values: [active]', 6, /only supported for enum/],
    ['kind: list\n        to: specs', 6, /only supported for reference/],
    ['kind: string\n        required: yes', 6, /must be boolean/],
    ['kind: enum', 4, /requires `values`/],
    ['kind: enum\n        values: []', 6, /nonempty list/],
    ['kind: enum\n        values: [active, active]', 6, /unique/],
    ["kind: enum\n        values: [' ']", 6, /nonempty strings/],
    ['kind: reference\n        to: specs/nested', 6, /one kebab-case/],
    ['kind: reference\n        to: ../specs', 6, /one kebab-case/],
  ] as const;
  for (const [options, line, message] of cases) {
    const source = `doctypes:\n  specs:\n    fields:\n      custom:\n        ${options}\n`;
    const result = parseConfig(source, 'field-options.yml');
    assert.equal(result.config, undefined, options);
    assert.ok(result.findings.some((finding) => finding.file === 'field-options.yml' &&
      finding.line === line && message.test(finding.message)), options);
  }
});
