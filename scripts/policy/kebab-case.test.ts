import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isKebabCase } from './kebab-case.js';

test('slugs accept kebab-case and reject ambiguous names', () => {
  for (const value of ['spec', 'test-case', 'v1']) assert.equal(isKebabCase(value), true);
  for (const value of ['', 'Test', 'a_b', '-a', 'a-', 'a--b', 'a/b']) {
    assert.equal(isKebabCase(value), false, value);
  }
});
