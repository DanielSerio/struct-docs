import type { Finding } from '../policy/findings.js';
import type { RoadmapContext } from '../roadmap/context.js';

/** Warnings concern existing files only; absent roadmaps never demand new documents. */
export function roadmapWarnings(context: RoadmapContext): Finding[] {
  const findings: Finding[] = [];
  for (const files of context.roadmaps.values()) {
    for (const file of files) if (file.nodes.length > 12) findings.push({
      file: file.rel, line: 1, rule: 'roadmap-size', severity: 'warning',
      message: `${file.nodes.length} children, over the ~12 cap; use \`roadmap breakout\``,
    });
  }
  if (!Object.hasOwn(context.config.doctypes, 'specs')) return findings;
  for (const model of context.models.values()) {
    const root = model.root;
    if (!root) continue;
    const references = root.data.specs;
    if (references !== undefined && (!Array.isArray(references) || references.length)) continue;
    findings.push({ file: root.rel, line: root.locations.specs?.line ?? 1,
      rule: 'roadmap-specs', severity: 'warning', message: 'roadmap root has no `specs` references' });
  }
  return findings;
}
