import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { defaultConfig } from '../policy/config-defaults.js';
import { readDocument } from './document.js';
import { loadTree } from './tree.js';

const source = '---\r\ntitle: Auth\r\ntype: spec\r\n---\r\nBody is retained, not interpreted.\r\n';

test('a parsed document retains its path, source, lines, fields, locations and classification', () => {
  tempDocs({ 'specs/Auth.MD': source }, (root) => {
    const document = readDocument(root, 'specs/Auth.MD', defaultConfig());
    assert.ok(document);
    assert.equal(document.path, 'specs/Auth.MD');
    assert.equal(document.source, source);
    assert.equal(document.lines[1], 'title: Auth');
    assert.equal(document.classification.cls, 'live');
    assert.ok(document.frontmatter.ok);
    assert.equal(document.frontmatter.data.title, 'Auth');
    assert.equal(document.frontmatter.locations.type?.line, 3);
  });
});

test('the tree inventories only files and preserves Markdown extension case', () => {
  tempDocs({ 'specs/Auth.MD': source, 'specs/second.md': source, 'specs/image.svg': 'svg' }, (root) => {
    mkdirSync(join(root, 'docs/specs/not-a-file.MD'));
    const tree = loadTree(root, defaultConfig());
    assert.deepEqual(tree.files, ['specs/Auth.MD', 'specs/image.svg', 'specs/second.md']);
    assert.deepEqual(tree.documents.map((document) => document.path), ['specs/Auth.MD', 'specs/second.md']);
    assert.ok(tree.documents.every((document) => document.context?.files?.has('specs/image.svg')));
  });
});

test('excluded and legacy archive paths remain in the inventory without parsing their prose', () => {
  tempDocs({
    'templates/review.md': 'not frontmatter', 'living/notes.md': 'not frontmatter',
    'generated/api.md': 'not frontmatter', 'archive/specs/old.md': 'not frontmatter',
    'README.md': '# Index', 'specs/auth.md': source,
  }, (root) => {
    const config = { ...defaultConfig(), ignore: ['generated/'] };
    const tree = loadTree(root, config);
    assert.equal(tree.files.length, 6);
    assert.deepEqual(tree.documents.map((document) => document.path), ['specs/auth.md']);
    assert.deepEqual(tree.findings, []);
    assert.deepEqual(tree.entries.find((entry) => entry.path === 'archive/specs/old.md')?.classification,
      { cls: 'ungoverned' });
    assert.equal('archived' in tree, false);
  });
});

test('failed roadmap frontmatter remains addressable for withholding later derived repairs', () => {
  tempDocs({ 'roadmaps/v1/broken.md': '---\nid: broken\n  invalid: value\n---\n' }, (root) => {
    const tree = loadTree(root, defaultConfig());
    assert.equal(tree.documents[0]?.path, 'roadmaps/v1/broken.md');
    assert.equal(tree.documents[0]?.classification.cls, 'roadmap');
    assert.equal(tree.documents[0]?.frontmatter.ok, false);
    assert.equal(tree.findings[0]?.file, 'roadmaps/v1/broken.md');
    assert.equal(tree.findings[0]?.line, 3);
  });
});

test('missing docs and absent single documents are silent, and excluded files are never opened', () => {
  tempDocs({}, (root) => {
    assert.deepEqual(loadTree(root, defaultConfig()).files, []);
    assert.deepEqual(loadTree(root, defaultConfig()).documents, []);
    assert.equal(readDocument(root, 'specs/missing.md', defaultConfig()), undefined);
    assert.equal(readDocument(root, 'living/missing.md', defaultConfig()), undefined);
    assert.throws(() => readDocument(root, '../outside.md', defaultConfig()), /inside docs/);
  });
});

test('genuine single-file I/O errors are execution failures rather than swallowed absences', () => {
  tempDocs({ 'specs/auth.md': source }, (root) => {
    mkdirSync(join(root, 'docs/specs/directory.md'));
    assert.throws(() => readDocument(root, 'specs/directory.md', defaultConfig()));
  });
});
