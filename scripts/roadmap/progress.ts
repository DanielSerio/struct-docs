import type { ProgressNode, ProgressView } from '../policy/progress.js';
import type { RoadmapNode } from '../policy/roadmap.js';
import { fileId } from './files.js';
import type { RoadmapFile } from './files.js';
import type { RoadmapModel } from './model.js';

/** Follow model links at their heading position, never the inventory's file order. */
export function createProgressView(roadmap: string, model: RoadmapModel): ProgressView {
  const root = model.root;
  const id = root && fileId(root);
  if (!root || !id) throw new Error(`Roadmap ${roadmap} has no modeled root`);
  const childrenOf = (file: RoadmapFile, ancestors: ReadonlySet<string>): ProgressNode[] => {
    if (ancestors.has(file.rel)) throw new Error(`Cyclic breakout at ${file.rel}`);
    const visited = new Set([...ancestors, file.rel]);
    return file.nodes.map((node) => nodeView(file, node, visited));
  };
  const nodeView = (file: RoadmapFile, node: RoadmapNode, ancestors: ReadonlySet<string>): ProgressNode => {
    const target = model.resolveBreakout(file.rel, node);
    if (node.breakout && !target) throw new Error(`Unresolved breakout at ${file.rel}:${node.line}`);
    return {
      id: node.id, file: file.rel, line: node.line, deps: node.deps,
      status: target ? model.effectiveStatus(fileId(target)) : node.status,
      leaf: !node.breakout,
      children: target ? childrenOf(target, ancestors) : [],
      ...(target ? { breakout: target.rel } : {}),
    };
  };
  return { roadmap, root: {
    id, file: root.rel, line: root.locations.id?.line ?? 1, deps: [],
    status: model.effectiveStatus(id), leaf: false, children: childrenOf(root, new Set()),
  } };
}

export const createProgressViews = (models: ReadonlyMap<string, RoadmapModel>) =>
  [...models].map(([name, model]) => createProgressView(name, model));
