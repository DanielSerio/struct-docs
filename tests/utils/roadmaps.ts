import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify } from '../../scripts/policy/classify.js';
import { defaultConfig } from '../../scripts/policy/config-defaults.js';
import type { RoadmapNode } from '../../scripts/policy/roadmap.js';
import { parseDocument } from '../../scripts/read/document.js';
import { roadmapFiles } from '../../scripts/roadmap/files.js';

export function fixtureRoadmaps() {
  const config = defaultConfig();
  const documents = ['v1/index.md', 'v1/billing.md', 'payments/index.md'].map((file) => {
    const path = `roadmaps/${file}`;
    return parseDocument(path, readFileSync(`tests/fixtures/${path}`, 'utf8'), classify(path, config), { config });
  });
  return roadmapFiles(documents);
}
export const bodyNode = (id: string, status: string | undefined = 'todo', extra: Partial<RoadmapNode> = {}): RoadmapNode =>
  ({ id, status, line: 12, acceptance: [], notes: [], deps: [], locations: {}, ...extra });

export function modelFile(rel: string, id: string, status = 'todo', nodes: readonly RoadmapNode[] = []) {
  const config = defaultConfig();
  const source = `---\nid: ${id}\ntitle: ${id}\ntype: roadmap\nstatus: ${status}\nintent: Ship\n---\n`;
  const document = parseDocument(rel, source, classify(rel, config), { config });
  const name = rel.split('/')[1] ?? '';
  const file = roadmapFiles([document]).get(name)?.[0];
  assert.ok(file);
  return { ...file, nodes };
}
