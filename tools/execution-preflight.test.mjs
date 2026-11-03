import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { createRehearsal } from './rehearsal/create.mjs';
import { git } from './rehearsal/git.mjs';
import { projectState, preflightReports } from './rehearsal/observe.mjs';
import { assertRehearsalRoot } from './rehearsal/paths.mjs';
import { arrangePreflight } from './rehearsal/preflight-cases.mjs';

function scenario(name, inspect) {
  const rehearsal = createRehearsal();
  try {
    arrangePreflight(rehearsal, name);
    const before = projectState(rehearsal);
    const reports = preflightReports(rehearsal);
    assert.deepEqual(projectState(rehearsal), before, 'preflight commands leave files, staging and refs intact');
    assert.equal(before.branch, 'main');
    assert.equal(before.main, rehearsal.baseline);
    assert.ok(reports.every((report) => report.stderr === ''));
    inspect(rehearsal, before, reports);
  } finally {
    rmSync(assertRehearsalRoot(rehearsal.root), { recursive: true, force: true });
  }
}

// These tests validate CLI/Git observations used by the skill; they do not pretend to execute an LLM.
test('malformed and cyclic preflight inputs have read-only rejection evidence before branch changes', () => {
  scenario('malformed', (_rehearsal, _before, reports) => {
    assert.equal(reports[0].status, 1);
    assert.match(reports[0].stdout, /frontmatter/);
    assert.equal(reports[2].status, 1);
    assert.match(reports[2].stdout, /run docs-lint audit/);
  });
  scenario('cycle', (_rehearsal, _before, reports) => {
    assert.equal(reports[0].status, 1);
    assert.match(reports[0].stdout, /dependency cycle/);
    assert.equal(reports[2].status, 0);
    assert.match(reports[2].stdout, /next: cyclic - release:named-greeting -> release:emphasis -> release:named-greeting/);
  });
});

test('full and scoped reports expose pending external ancestor and later-task gates without mutations', () => {
  for (const name of ['external-ancestor', 'external-later']) scenario(name, (_rehearsal, _before, reports) => {
    assert.ok(reports.every((report) => report.status === 0));
    assert.match(reports[1].stdout, /prerequisite \[todo\]/);
    assert.match(reports[1].stdout, /\[ \] approve/);
    assert.match(reports[1].stdout, /needs [^\n]*prerequisite:approve/);
    assert.match(reports[2].stdout, /\[>\] named-greeting/);
    assert.match(reports[2].stdout, /gated on [^\n]*prerequisite:approve/);
  });
});

test('overlapping dirty work remains observable and intact during read-only preflight', () => {
  scenario('dirty-overlap', (_rehearsal, before, reports) => {
    assert.ok(reports.every((report) => report.status === 0));
    assert.match(before.status, /M src\/greeting.mjs/);
  });
});

test('after read-only gates, a dedicated branch can be created and reused without changing staged unrelated work', () => {
  scenario('safe-unrelated', (rehearsal, before, reports) => {
    assert.ok(reports.every((report) => report.status === 0));
    assert.match(before.status, /^A {2}personal-notes.txt$/);
    git(rehearsal.project, 'switch', '-c', 'work/release-greeting');
    const isolated = projectState(rehearsal);
    assert.deepEqual(isolated.files, before.files);
    assert.equal(isolated.status, before.status);
    assert.equal(isolated.main, before.main);
    assert.equal(isolated.remote, before.remote);
    assert.equal(isolated.head, before.head);
    assert.equal(isolated.branch, 'work/release-greeting');
    assert.equal(git(rehearsal.project, 'branch', '--show-current'), isolated.branch, 'reuse the current dedicated branch');
    assert.deepEqual(projectState(rehearsal), isolated);
  });
});
