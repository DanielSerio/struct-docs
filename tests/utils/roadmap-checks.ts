import { classify } from '../../scripts/policy/classify.js';
import { defaultConfig } from '../../scripts/policy/config-defaults.js';
import type { Config } from '../../scripts/policy/config-types.js';
import { parseDocument } from '../../scripts/read/document.js';
import { createRoadmapContext } from '../../scripts/roadmap/context.js';
import { createRoadmapCheckContext } from '../../scripts/roadmap/check-context.js';
import { roadmapRule } from '../../scripts/roadmap/roadmap-rule.js';

export const leafSource = (id = 'task', status = 'todo', extra = '') =>
  `### ${id} <!-- status: ${status} -->\nIntent: Deliver\nAcceptance:\n- [ ] Observable result\n${extra}`;
export const rootSource = (name = 'v1', body = leafSource(), extra = '') =>
  `---\nid: ${name}\ntitle: ${name}\ntype: roadmap\nstatus: todo\nintent: Ship\n${extra}---\n\n## Milestones\n\n${body}`;
export const breakoutSource = (id: string, body = leafSource('subtask')) =>
  rootSource(id, body).replace('type: roadmap', 'type: roadmap-node').replace('## Milestones', '## Tasks');

export function checkedRoadmaps(files: Record<string, string>, config: Config = defaultConfig()) {
  const documents = Object.entries(files).map(([path, source]) =>
    parseDocument(path, source, classify(path, config), { config }));
  const context = createRoadmapCheckContext({ ...createRoadmapContext(config, documents), files: new Set(Object.keys(files)) });
  return { documents, context,
    findings: documents.flatMap((document) => roadmapRule({ ...document, context })) };
}
