import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Finding } from '../policy/findings.js';
import { findingsExitCode, formatReport } from './report.js';

const warning: Finding = { file: 'specs/a.md', line: 4, rule: 'scope', severity: 'warning', message: 'unrouted' };
const error: Finding = { ...warning, severity: 'error', message: 'missing purpose' };
const repair: Finding = { ...warning, severity: 'repairable', message: 'status is stale',
  repair: { field: 'status', actual: 'todo', expected: 'done' } };

test('clean output is empty and errors retain source locations', () => {
  assert.equal(formatReport([]), '');
  assert.equal(formatReport([error]), 'specs/a.md:4 - missing purpose\n');
  assert.equal(findingsExitCode([error]), 1);
});

test('warning detail is opt-in and warning-only findings never fail', () => {
  assert.equal(formatReport([warning]), '1 warning (--verbose to list)\n');
  assert.equal(formatReport([warning, warning]), '2 warnings (--verbose to list)\n');
  assert.equal(formatReport([warning], { verbose: true }), 'specs/a.md:4 - unrouted\n');
  assert.equal(findingsExitCode([warning]), 0);
});

test('repair labels are per finding and never change exit status', () => {
  assert.match(formatReport([repair]), /repairable with --fix/);
  assert.equal(findingsExitCode([repair]), 0);
  assert.match(formatReport([{ ...repair, repair: { ...repair.repair, withheld: true } }]), /withheld/);
  assert.match(formatReport([{ ...repair, repair: { ...repair.repair, applied: true } }]), /repaired/);
  assert.equal(findingsExitCode([warning, repair, error]), 1);
});


test('embedded source line breaks remain escaped inside one diagnostic line', () => {
  const report = formatReport([{ file: 'specs/bad\nname.md', line: 4, rule: 'fixture', severity: 'error',
    message: 'status is \r\n, should be todo' }]);
  assert.equal(report, 'specs/bad\\nname.md:4 - status is \\r\\n, should be todo\n');
  assert.equal(report.split('\n').length, 2);
});
