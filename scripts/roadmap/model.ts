import type { AddressableNode, RoadmapNode, RoadmapStatus } from '../policy/roadmap.js';
import type { RoadmapFile } from './files.js';
import { fileId, isRoadmapRoot, roadmapPathKey, resolveBreakoutPath, stringStatus } from './files.js';
import { rollupOf } from './rollup.js';

const linkKey = (path: string, node: RoadmapNode) => `${path}:${node.line}:${node.id}`;

/** Ported shared model: every consumer sees the same linked breakout and fixed-point status. */
export function createRoadmapModel(files: readonly RoadmapFile[]): RoadmapModel {
  const root = files.find((file) => isRoadmapRoot(file.rel));
  const byRel = new Map(files.map((file) => [file.rel, file]));
  const byPath = new Map(files.map((file) => [roadmapPathKey(file.rel), file]));
  const links = new Map<string, RoadmapFile | null>();
  for (const file of files) for (const node of file.nodes) {
    if (!node.breakout) continue;
    const target = byPath.get(roadmapPathKey(resolveBreakoutPath(file.rel, node.breakout)));
    links.set(linkKey(file.rel, node), target && fileId(target) === node.id ? target : null);
  }
  const expectedStatuses = new Map<string, string | undefined>();
  for (const file of files) {
    const id = fileId(file);
    if (id !== undefined) expectedStatuses.set(id, stringStatus(file.data.status));
  }
  for (let pass = 0; pass < files.length; pass += 1) {
    let changed = false;
    for (const file of files) {
      const id = fileId(file);
      if (id === undefined) continue;
      const children = file.nodes.map((node) => {
        const target = links.get(linkKey(file.rel, node));
        return target ? { status: expectedStatuses.get(fileId(target) ?? '') } : node;
      });
      const next: RoadmapStatus = rollupOf(children);
      if (expectedStatuses.get(id) !== next) { expectedStatuses.set(id, next); changed = true; }
    }
    if (!changed) break;
  }
  const resolveBreakout = (path: string, node: RoadmapNode) => links.get(linkKey(path, node)) ?? null;
  const effectiveStatus = (id: unknown, fallback?: string) =>
    typeof id === 'string' ? expectedStatuses.get(id) ?? fallback : fallback;
  const byId = new Map<string, AddressableNode>();
  for (const file of files) for (const node of file.nodes) {
    const target = resolveBreakout(file.rel, node);
    byId.set(node.id, { id: node.id, file: file.rel, line: node.line, deps: node.deps,
      status: target ? effectiveStatus(fileId(target), node.status) : node.status });
  }
  for (const file of files) {
    const id = fileId(file);
    if (id !== undefined && !byId.has(id)) byId.set(id,
      { id, file: file.rel, line: file.locations.id?.line ?? 1, status: effectiveStatus(id), deps: [] });
  }
  return { files, root, byRel, byId, links, expectedStatuses, effectiveStatus, resolveBreakout };
}
export type RoadmapModel = {
  readonly files: readonly RoadmapFile[];
  readonly root: RoadmapFile | undefined;
  readonly byRel: ReadonlyMap<string, RoadmapFile>;
  readonly byId: ReadonlyMap<string, AddressableNode>;
  readonly links: ReadonlyMap<string, RoadmapFile | null>;
  readonly expectedStatuses: ReadonlyMap<string, string | undefined>;
  readonly effectiveStatus: (id: unknown, fallback?: string) => string | undefined;
  readonly resolveBreakout: (path: string, node: RoadmapNode) => RoadmapFile | null;
};
