import type { ParsedDocument } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';
import type { RoadmapNode } from '../policy/roadmap.js';

export function roadmapFinding(file: string, line: number, message: string, rule = 'roadmap'): Finding {
  return { file, line, rule, severity: 'error', message };
}
export const fieldLine = (document: ParsedDocument, field: string) =>
  document.frontmatter.ok ? document.frontmatter.locations[field]?.line ?? 1 : 1;
export const nodeLine = (node: RoadmapNode, field?: string) =>
  field === 'status' ? node.statusLoc?.line ?? node.line : field ? node.locations[field]?.line ?? node.line : node.line;
