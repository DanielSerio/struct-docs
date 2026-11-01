import type { Finding } from '../policy/findings.js';
import type { RoadmapContext } from './context.js';
import { findCycles, resolveDep, unresolvedDeps } from './deps.js';
import { supersededValue } from './schema.js';
import { nodeLine, roadmapFinding } from './check-finding.js';

/** Cross-roadmap edges are checked only after every roadmap has been indexed. */
export function roadmapDependencyFindings(context: RoadmapContext): Finding[] {
  const findings = unresolvedDeps(context.roadmaps, context.depIndex);
  for (const cycle of findCycles(context.depIndex)) {
    const reported = new Set<string>();
    for (const address of cycle) {
      const [name = '', id = ''] = address.split(':');
      if (reported.has(name)) continue;
      const node = context.depIndex.get(name)?.get(id);
      if (!node) continue;
      reported.add(name);
      findings.push(roadmapFinding(node.file, node.line, `dependency cycle: ${cycle.join(' -> ')}`, 'roadmap-cycle'));
    }
  }
  for (const [name, files] of context.roadmaps) for (const file of files) {
    const replacements = [{ value: file.data['superseded-by'], line: file.locations['superseded-by']?.line ?? 1 },
      ...file.nodes.map((node) => ({ value: node['superseded-by'], line: nodeLine(node, 'superseded-by') }))];
    for (const { value, line } of replacements) {
      if (typeof value !== 'string' || supersededValue(value) !== null || resolveDep(context.depIndex, name, value)) continue;
      findings.push(roadmapFinding(file.rel, line,
        `\`superseded-by\`: \`${value}\` resolves to no node`, 'roadmap-replacement'));
    }
  }
  return findings;
}
