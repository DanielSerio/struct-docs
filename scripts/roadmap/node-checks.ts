import type { ParsedDocument } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';
import type { RoadmapNode } from '../policy/roadmap.js';
import { isLeaf } from './rollup.js';
import { splitDep } from './dependency.js';
import { bodyFields, idValue, statusField, supersededValue, textValue } from './schema.js';
import { nodeLine, roadmapFinding } from './check-finding.js';

/** Ported body checks: breakout detail belongs to its file, authored leaves keep acceptance. */
export function validateBodyNode(document: ParsedDocument, node: RoadmapNode): Finding[] {
  const findings: Finding[] = [];
  const at = (message: string, field?: string) =>
    findings.push(roadmapFinding(document.path, nodeLine(node, field), `\`${node.id}\`: ${message}`));
  const invalidId = idValue(node.id);
  if (invalidId) at(`id ${invalidId}`);
  // A missing heading status is already a reader finding; do not report it twice.
  if (node.status !== undefined) {
    const reason = statusField.validate(node.status);
    if (reason) at(`\`status\` ${reason}`, 'status');
  }
  for (const field of ['title', 'intent'] as const) {
    if (node.breakout && node[field] !== undefined) at(`has a breakout, which owns \`${field}\``, field);
    else if (node[field] !== undefined) {
      const reason = textValue(node[field]);
      if (reason) at(`\`${field}\` ${reason}`, field);
    }
  }
  if (!node.breakout && node.intent === undefined) at('is missing `Intent`');
  if (node.breakout !== undefined && node.breakout !== `./${node.id}.md`) {
    at(`breakout must be \`./${node.id}.md\``, 'breakout');
  }
  if (isLeaf(node) && node.acceptance.length === 0) at('leaf has no `Acceptance`');
  if (isLeaf(node) && node.status === 'cut' && !node['superseded-by'] && node.notes.length === 0) {
    at('cut leaf has neither `superseded-by` nor a note');
  }
  for (const dep of node.deps) if (!splitDep(dep)) at(`malformed dep \`${dep}\``, 'deps');
  if (node['superseded-by'] !== undefined) {
    const reason = supersededValue(node['superseded-by']);
    if (reason) at(`\`superseded-by\` ${reason}`, 'superseded-by');
  }
  for (const key of Object.keys(node)) if (!bodyFields.has(key)) at(`unknown field \`${key}\``);
  return findings;
}
