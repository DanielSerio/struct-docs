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

/** A file report retains its hidden ancestors so their dependency gates still apply. */
export type ProgressScope = ProgressView & {
  readonly ancestors: readonly ProgressNode[];
};

export type NextReady =
  | { readonly kind: 'ready'; readonly node: ProgressNode }
  | { readonly kind: 'finished' }
  | { readonly kind: 'gated'; readonly blockers: readonly string[] }
  | { readonly kind: 'open' }
  | { readonly kind: 'cyclic'; readonly cycles: readonly (readonly string[])[] };
