import assert from 'node:assert/strict';
import { test } from 'node:test';
import { greet } from '../src/greeting.mjs';

test('an unnamed greeting retains its existing output', () => {
  assert.equal(greet(), 'Hello');
});
