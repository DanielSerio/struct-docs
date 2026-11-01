import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tempDocs } from '../../tests/utils/temp-docs.js';
import { defaultConfig } from '../policy/config-defaults.js';
import { loadTree } from '../read/tree.js';
import { createRoadmapContext } from './context.js';

const rootSource = '---\nid: v1\ntitle: V1\ntype: roadmap\nstatus: todo\nintent: Ship\n---\n## Milestones\n### task <!-- status: todo -->\nBreakout: ./task.md\n';

test('prepared context retains failed descendants and parses valid bodies once', () => {
  tempDocs({ 'roadmaps/v1/index.MD': rootSource,
    'roadmaps/v1/task.md': '---\nid: task\n  broken: nested\n---\n',
    'roadmaps/next/index.md': rootSource.replace('id: v1', 'id: next').replace('### task', '### orphan'),
  }, (root) => {
    const config = defaultConfig();
    const tree = loadTree(root, config);
    const context = createRoadmapContext(config, tree.documents);
    assert.equal(context.roadmapDocuments.length, 3);
    assert.equal(context.roadmaps.get('v1')?.length, 1);
    assert.equal(context.models.get('v1')?.root?.rel, 'roadmaps/v1/index.MD');
    const file = context.roadmaps.get('v1')?.[0];
    assert.equal(file?.nodes, file?.document.roadmap?.nodes);
    assert.ok(tree.findings.some((finding) => finding.file === 'roadmaps/v1/task.md'));
    assert.equal(context.models.get('v1')?.resolveBreakout(file?.rel ?? '', file?.nodes[0] ?? {
      id: '', status: undefined, line: 1, locations: {}, acceptance: [], notes: [], deps: [],
    }), null);
  });
});

test('tree retains body parser errors at original file lines for future withholding', () => {
  tempDocs({ 'roadmaps/v1/index.md': rootSource.replace('### task <!-- status: todo -->', '### task') }, (root) => {
    const tree = loadTree(root, defaultConfig());
    assert.equal(tree.findings[0]?.file, 'roadmaps/v1/index.md');
    assert.equal(tree.findings[0]?.line, 9);
    assert.equal(tree.findings[0]?.rule, 'roadmap-body');
  });
});
