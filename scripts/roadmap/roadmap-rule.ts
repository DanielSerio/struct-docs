import type { Rule } from '../policy/document.js';
import type { RoadmapCheckContext } from './check-context.js';
import { roadmapFileRule } from './file-rule.js';

/** Compose local schema with precomputed relationships; parse findings remain reader-owned. */
export const roadmapRule: Rule<RoadmapCheckContext> = (document) => {
  if (document.classification.cls !== 'roadmap' || !document.frontmatter.ok) return [];
  if (!document.context) throw new Error('roadmap checks require prepared roadmap context');
  return [...roadmapFileRule(document), ...(document.context.roadmapFindings.get(document.path) ?? [])];
};
