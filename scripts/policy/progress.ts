import type { AddressableNode } from './roadmap.js';

/** A breakout remains one node: its heading owns deps and its file supplies children. */
export type ProgressNode = AddressableNode & {
  readonly leaf: boolean;
  readonly children: readonly ProgressNode[];
  readonly breakout?: string;
};

export type ProgressView = {
  readonly roadmap: string;
  readonly root: ProgressNode;
};
