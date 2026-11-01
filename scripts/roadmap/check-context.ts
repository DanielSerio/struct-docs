import type { Finding } from '../policy/findings.js';
import type { RoadmapContext } from './context.js';
import { roadmapTreeFindings } from './tree-checks.js';
import { roadmapDependencyFindings } from './dependency-checks.js';
import { roadmapSpecFindings } from './spec-gate.js';

export type RoadmapCheckContext = RoadmapContext & {
  readonly roadmapFindings: ReadonlyMap<string, readonly Finding[]>;
};

/** Prepare whole-tree relationships once; rules still receive exactly one parsed document. */
export function createRoadmapCheckContext(context: RoadmapContext): RoadmapCheckContext {
  const roadmapFindings = new Map<string, Finding[]>();
  const findings = [...roadmapTreeFindings(context), ...roadmapDependencyFindings(context), ...roadmapSpecFindings(context)];
  for (const finding of findings) {
    const entries = roadmapFindings.get(finding.file) ?? [];
    entries.push(finding); roadmapFindings.set(finding.file, entries);
  }
  return { ...context, roadmapFindings };
}
