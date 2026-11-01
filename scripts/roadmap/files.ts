import { posix } from 'node:path';
import type { ParsedDocument, FrontmatterResult } from '../policy/document.js';
import type { RoadmapNode } from '../policy/roadmap.js';
import { parseBody } from '../read/roadmap-body.js';

export type RoadmapFile = {
  rel: string;
  document: ParsedDocument;
  data: Extract<FrontmatterResult, { ok: true }>['data'];
  locations: Extract<FrontmatterResult, { ok: true }>['locations'];
  nodes: readonly RoadmapNode[];
};
export const roadmapName = (path: string) => path.split('/')[0] === 'roadmaps' ? path.split('/')[1] : undefined;
export const isRoadmapRoot = (path: string) => posix.basename(path).replace(/\.md$/i, '') === 'index';
export const fileId = (file: RoadmapFile) => typeof file.data.id === 'string' ? file.data.id : undefined;
export const stringStatus = (value: unknown) => typeof value === 'string' ? value : undefined;
// Normalize only the supported extension; stem and directory case retain their identity.
export const roadmapPathKey = (path: string) => path.replace(/\.md$/i, '');
export const resolveBreakoutPath = (parent: string, breakout: string) =>
  posix.normalize(posix.join(posix.dirname(parent), breakout));

export function roadmapFiles(documents: readonly ParsedDocument[]) {
  const roadmaps = new Map<string, RoadmapFile[]>();
  for (const document of documents) {
    const name = roadmapName(document.path);
    if (document.classification.cls !== 'roadmap' || !name || !document.frontmatter.ok) continue;
    const files = roadmaps.get(name) ?? [];
    files.push({ rel: document.path, document, data: document.frontmatter.data,
      locations: document.frontmatter.locations,
      nodes: (document.roadmap ?? parseBody(document.source, document.frontmatter.endLine)).nodes });
    roadmaps.set(name, files);
  }
  for (const files of roadmaps.values()) files.sort((a, b) =>
    Number(isRoadmapRoot(b.rel)) - Number(isRoadmapRoot(a.rel)) || a.rel.localeCompare(b.rel));
  return roadmaps;
}
