import type { ProgressNode, ProgressScope, ProgressView } from '../policy/progress.js';

/** Match actual modeled file paths; callers own project-relative path normalization. */
export function scopeProgress(view: ProgressView, file = view.root.file): ProgressScope | undefined {
  if (file === view.root.file) return { ...view, ancestors: [] };
  const find = (node: ProgressNode, ancestors: readonly ProgressNode[]): ProgressScope | undefined => {
    if (node.breakout === file) return { roadmap: view.roadmap, root: node, ancestors };
    for (const child of node.children) {
      const found = find(child, [...ancestors, node]);
      if (found) return found;
    }
    return undefined;
  };
  return find(view.root, []);
}
