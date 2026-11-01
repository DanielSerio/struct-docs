import type { Finding } from '../policy/findings.js';
import type { RoadmapContext } from './context.js';
import { fileId, roadmapPathKey, resolveBreakoutPath } from './files.js';
import { nodeLine, roadmapFinding } from './check-finding.js';

/** Ported duplicate identity rules: a linked breakout and its parent body node are one id. */
export function roadmapTreeFindings(context: RoadmapContext): Finding[] {
  const findings: Finding[] = [];
  const inventory = new Set([...(context.files ?? context.roadmapDocuments.map((doc) => doc.path))].map(roadmapPathKey));
  for (const [name, files] of context.roadmaps) {
    const model = context.models.get(name);
    if (!model) continue;
    const linked = new Set([...model.links.values()].filter((file) => file !== null).map((file) => file.rel));
    const seen = new Map<string, { file: string; line: number }>();
    for (const file of files) {
      const id = fileId(file);
      const ids = [...(!linked.has(file.rel) && id !== undefined
        ? [{ id, line: file.locations.id?.line ?? 1 }] : []), ...file.nodes];
      for (const node of ids) {
        const previous = seen.get(node.id);
        if (previous) findings.push(roadmapFinding(file.rel, node.line,
          `duplicate id \`${node.id}\` (also ${previous.file}:${previous.line})`, 'roadmap-identity'));
        else seen.set(node.id, { file: file.rel, line: node.line });
      }
      for (const node of file.nodes) {
        if (!node.breakout) continue;
        const target = roadmapPathKey(resolveBreakoutPath(file.rel, node.breakout));
        if (!inventory.has(target)) {
          findings.push(roadmapFinding(file.rel, nodeLine(node, 'breakout'),
            `\`${node.id}\`: breakout \`${node.breakout}\` is not on disk`, 'roadmap-breakout'));
          continue;
        }
        const actual = files.find((candidate) => roadmapPathKey(candidate.rel) === target);
        if (actual && fileId(actual) !== node.id) findings.push(roadmapFinding(file.rel, nodeLine(node, 'breakout'),
          `\`${node.id}\`: breakout target id is \`${String(actual.data.id)}\``, 'roadmap-breakout'));
      }
    }
  }
  return findings;
}
