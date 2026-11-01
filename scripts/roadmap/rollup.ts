import type { RoadmapStatus } from '../policy/roadmap.js';

/** Ported ordered rollup: authored leaves are input; only aggregates are derived. */
export function rollupOf(allChildren: readonly { status?: string | undefined }[]): RoadmapStatus {
  const children = allChildren.filter((child) => child.status !== 'cut');
  if (!allChildren.length) return 'todo';
  if (!children.length) return 'cut';
  if (children.some((child) => child.status === 'in-progress')) return 'in-progress';
  if (children.some((child) => child.status === 'blocked')) return 'blocked';
  if (children.every((child) => child.status === 'done')) return 'done';
  if (children.every((child) => child.status === 'todo')) return 'todo';
  return 'in-progress';
}

export const isLeaf = (node: { fileLevel?: boolean; breakout?: string; children?: readonly unknown[] }) =>
  !node.fileLevel && !node.breakout && !(node.children ?? []).length;
export const isSatisfied = (status: string | undefined) => status === 'done' || status === 'cut';
