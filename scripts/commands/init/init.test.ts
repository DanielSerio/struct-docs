import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { defaultConfig } from '../../policy/config-defaults.js';
import { loadConfig } from '../../read/config.js';
import { surveyInit } from '../../read/init-survey.js';
import { readReviewTemplate } from '../../read/review-template.js';
import { tempDocs } from '../../../tests/utils/temp-docs.js';
import { applyInit } from './apply.js';
import { planInit } from './plan.js';

const survey = (root: string) => surveyInit(root, defaultConfig());

test('survey and pure plan adopt absent docs without creating placeholders or files', () => {
  tempDocs({}, (root) => {
    const found = survey(root);
    const plan = planInit(found);
    assert.deepEqual(plan.actions.map((action) => action.kind), ['index', 'template', 'gitignore']);
    assert.equal(plan.missing.length, 2);
    assert.deepEqual(readdirSync(root), []);
    assert.equal(found.tree.documents.length, 0);
  });
});

test('apply creates useful empty index and verbatim asset, then becomes a byte and mtime no-op', () => {
  tempDocs({}, (root) => {
    const found = survey(root);
    const written = applyInit(found, planInit(found));
    assert.deepEqual(written, ['docs/README.md', 'docs/templates/code-review-v1.md', '.gitignore']);
    assert.deepEqual(readdirSync(join(root, 'docs')).sort(), ['README.md', 'templates']);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /struct-docs:index/);
    assert.deepEqual(readFileSync(join(root, 'docs/templates/code-review-v1.md')), readFileSync(resolve('assets/code-review-v1.md')));
    const before = written.map((path) => ({ bytes: readFileSync(join(root, path)), mtime: statSync(join(root, path)).mtimeMs }));
    const again = survey(root);
    assert.deepEqual(applyInit(again, planInit(again)), []);
    assert.deepEqual(written.map((path) => ({ bytes: readFileSync(join(root, path)), mtime: statSync(join(root, path)).mtimeMs })), before);
  });
});

test('existing authored docs and custom template are preserved, without inferred owns', () => {
  const authored = '---\ntype: prd\n---\n# Authored\n';
  tempDocs({ 'product/example.md': authored, 'templates/code-review-v1.md': 'custom template', 'README.md': '# Team guide\n' }, (root) => {
    const found = survey(root);
    applyInit(found, planInit(found), () => { throw new Error('asset must stay lazy'); });
    assert.equal(readFileSync(join(root, 'docs/product/example.md'), 'utf8'), authored);
    assert.equal(readFileSync(join(root, 'docs/templates/code-review-v1.md'), 'utf8'), 'custom template');
    assert.ok(readFileSync(join(root, 'docs/README.md'), 'utf8').startsWith('# Team guide\n'));
  });
});

test('missing asset fails before even creating docs and changed survey fails before writes', () => {
  tempDocs({}, (root) => {
    const found = survey(root);
    assert.throws(() => applyInit(found, planInit(found), () => { throw new Error('missing asset'); }), /missing asset/);
    assert.equal(existsSync(join(root, 'docs')), false);
    writeFileSync(join(root, '.gitignore'), 'new user content');
    assert.throws(() => applyInit(found, planInit(found)), /inputs changed/);
    assert.equal(existsSync(join(root, 'docs')), false);
  });
});

test('a newly created empty template invalidates the plan before index or gitignore writes', () => {
  tempDocs({}, (root) => {
    const found = survey(root);
    const plan = planInit(found);
    mkdirSync(join(root, 'docs/templates'), { recursive: true });
    writeFileSync(join(root, 'docs/templates/code-review-v1.md'), '');
    assert.throws(() => applyInit(found, plan), /template changed/);
    assert.equal(existsSync(join(root, 'docs/README.md')), false);
    assert.equal(existsSync(join(root, '.gitignore')), false);
    assert.equal(readFileSync(join(root, 'docs/templates/code-review-v1.md'), 'utf8'), '');
  });
});

test('legacy configuration, roadmap trees and old markers require the init skill', () => {
  for (const files of [{ '.doctypes': 'prd' }, { '.docsignore': 'private/' },
    { 'roadmap/v1/task.md': '# Task' }, { 'README.md': '<!-- manage-docs:index -->\n<!-- /manage-docs:index -->' }]) {
    tempDocs(files, (root) => {
      const found = survey(root);
      const plan = planInit(found);
      assert.ok(plan.refusals.length);
      assert.match(plan.refusals[0]!.message, /init skill/);
      assert.throws(() => applyInit(found, plan), /refused/);
      assert.equal(existsSync(join(root, 'docs/templates')), false);
    });
  }
});

test('foreign files are reported without a move plan, and plugin asset lookup follows module location', () => {
  tempDocs({ 'notes.md': '# Notes' }, (root) => {
    const found = survey(root);
    assert.deepEqual(planInit(found).foreign, ['notes.md']);
    const plugin = join(root, 'plugin');
    mkdirSync(join(plugin, 'assets'), { recursive: true });
    writeFileSync(join(plugin, 'assets/code-review-v1.md'), 'installed asset');
    assert.equal(readReviewTemplate(pathToFileURL(join(plugin, 'bin/docs-lint.mjs')).href).toString(), 'installed asset');
  });
});

test('gitignore planning follows normalized registry policy and preserves existing user patterns', () => {
  tempDocs({}, (root) => {
    writeFileSync(join(root, '.gitignore'), '# user-owned\n/docs/reviews/\n');
    const config = defaultConfig();
    config.living.gitignored = false;
    config.doctypes.reviews!.gitignored = false;
    config.doctypes.private = { type: 'private', owns: false, gitignored: true, fields: {} };
    const found = surveyInit(root, config);
    const planned = planInit(found);
    const ignore = planned.actions.find((action) => action.kind === 'gitignore')?.content;
    assert.ok(ignore?.startsWith('# user-owned\n/docs/reviews/\n'));
    assert.ok(ignore?.includes('/docs/private/'));
    assert.ok(!ignore?.includes('/docs/living/'));
    assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), '# user-owned\n/docs/reviews/\n');
  });
});

test('committed documents are never gitignored by a default, only by a written choice', () => {
  tempDocs({ 'reviews/auth.md': '# Auth review' }, (root) => {
    const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root });
    git('init', '-q');
    git('add', '.');
    git('commit', '-qm', 'reviews');
    const refusal = () => planInit(surveyInit(root, loadConfig(root).config!)).refusals
      .find((finding) => finding.rule === 'init-gitignore');
    assert.match(refusal()?.message ?? '', /docs\/reviews\/ has committed files but is gitignored by default/);
    for (const choice of ['true', 'false']) {
      writeFileSync(join(root, '.struct-docs.yml'), `doctypes:\n  reviews:\n    gitignored: ${choice}\n`);
      assert.equal(refusal(), undefined, `gitignored: ${choice} is a written choice`);
    }
  });
});
