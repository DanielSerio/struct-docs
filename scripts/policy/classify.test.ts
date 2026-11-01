import assert from 'node:assert/strict';
import { globSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { parseConfig, loadConfig } from '../read/config.js';
import { classify, createClassifier, isUnrouted } from './classify.js';
import { defaultConfig } from './config-defaults.js';

const loaded = parseConfig(readFileSync('tests/fixtures/config/classifier.yml', 'utf8'));
assert.deepEqual(loaded.findings, []);
assert.ok(loaded.config);
const config = loaded.config;
const classifier = createClassifier(config);

// Ported from manage-docs' classifier suite, adjusted for configurable types and no archive.
test('fixture routes immediate children using its normalized doctype registry', () => {
  for (const [path, type, owns, gitignored] of [
    ['specs/cli.md', 'requirement', true, false],
    ['guides/setup.md', 'guide', true, false],
    ['notes/local.md', 'note', false, true],
    ['reviews/auth.md', 'review', false, true],
    ['open-questions.md', 'questions', false, false],
  ] as const) {
    assert.deepEqual(classifier.classify(path), { cls: 'live', type, owns, gitignored });
  }
  for (const path of ['product/prd.md', 'guides/deep/setup.md', 'specs/drafts/wip.md',
    'unknown/setup.md', 'constructor/setup.md', 'archive/specs/old.md', 'scratch/notes.md']) {
    assert.deepEqual(classifier.classify(path), { cls: 'ungoverned' }, path);
    assert.equal(classifier.isUnrouted(path), true, path);
    assert.equal(isUnrouted(path, config), true, path);
  }
});

test('root file policy precedes ignores, extensions and hidden-path exclusions', () => {
  const broad = { ...config, ignore: ['**'] };
  assert.deepEqual(classify('README.md', broad), { cls: 'ungoverned', excluded: true });
  assert.equal(classify('open-questions.md', broad).cls, 'live');
  for (const path of ['prompt.md', 'diagram.svg', '.doctypes', 'readme.md']) {
    const result = classify(path, broad);
    assert.equal(result.cls, 'forbidden', path);
    assert.ok(result.cls === 'forbidden' && result.reason.includes('subdirectory'));
    assert.equal(isUnrouted(path, broad), false, path);
  }
});

test('excluded directories, assets, dot paths and configured ignores stay excluded', () => {
  for (const path of ['living/notes.md', 'living/deep/notes.md', 'templates/review.md',
    'templates/deep/review.md', '.obsidian/config.md', 'specs/.draft.md', 'specs/diagram.png',
    'unknown/image.svg', 'vendor/api.md', 'vendor/deep/api.md', 'specs/api.generated.md']) {
    assert.deepEqual(classifier.classify(path), { cls: 'ungoverned', excluded: true }, path);
    assert.equal(classifier.isUnrouted(path), false, path);
  }
});

test('roadmap paths retain locked structure even when an ignore would match', () => {
  const broad = { ...config, ignore: ['**'] };
  for (const path of ['roadmaps/v1/index.md', 'roadmaps/v1/billing.md',
    'roadmaps/future/deeper/task.md']) {
    assert.deepEqual(classify(path, broad),
      { cls: 'live', type: 'roadmap-tree', owns: false, gitignored: false }, path);
  }
  assert.deepEqual(classify('roadmaps/stray.md', broad), { cls: 'ungoverned' });
  assert.deepEqual(classify('roadmaps/v1/diagram.png', broad), { cls: 'ungoverned', excluded: true });
  assert.deepEqual(classify('roadmaps/.draft/index.md', broad), { cls: 'ungoverned', excluded: true });
});

test('Windows separators and explicit relative prefixes normalize consistently', () => {
  const expected = classifier.classify('specs/cli.md');
  for (const path of ['specs\\cli.md', './specs/cli.md', '.\\specs\\cli.md', '././specs/cli.md']) {
    assert.deepEqual(classifier.classify(path), expected, path);
  }
});

test('prototype names never create phantom types but can be explicitly configured', () => {
  assert.equal(classify('constructor/file.md', defaultConfig()).cls, 'ungoverned');
  const explicit = parseConfig('doctypes: {constructor: {type: guide}}');
  assert.ok(explicit.config);
  assert.equal(classify('constructor/file.md', explicit.config).cls, 'live');
});

test('this repository dogfoods the same config and classifier used by future commands', () => {
  const own = loadConfig(process.cwd());
  assert.deepEqual(own.findings, []);
  assert.ok(own.config);
  const ownClassifier = createClassifier(own.config);
  const files = [...globSync('docs/**/*')].filter((path) => statSync(path).isFile());
  let live = 0;
  for (const file of files) {
    const path = file.replaceAll('\\', '/').replace(/^docs\//, '');
    const result = ownClassifier.classify(path);
    assert.notEqual(result.cls, 'forbidden', path);
    assert.equal(ownClassifier.isUnrouted(path), false, path);
    if (result.cls === 'live') live += 1;
  }
  assert.equal(live > 0, true);
  assert.equal(ownClassifier.classify('roadmaps/v1/configurable-schema.md').cls, 'live');
  assert.deepEqual(ownClassifier.classify('living/starting-prompt.md'), { cls: 'ungoverned', excluded: true });
});
