import type { NextReady, ProgressNode, ProgressScope } from '../policy/progress.js';
import type { DependencyIndex } from './deps.js';
import { findCycles, resolveDep } from './deps.js';
import { isSatisfied } from './rollup.js';

/** The printed tree supplies order, while the complete index supplies dependency status. */
export function nextReady(scope: ProgressScope, index: DependencyIndex): NextReady {
  const cycles = findCycles(index).filter((cycle) =>
    cycle.some((address) => address.startsWith(`${scope.roadmap}:`)));
  if (cycles.length) return { kind: 'cyclic', cycles };
  const blockers = new Set<string>();
  let finished = true;
  let hasTodo = false;
  const unmet = (deps: readonly string[]) => deps.filter((dep) =>
    !isSatisfied(resolveDep(index, scope.roadmap, dep)?.status));
  const walk = (node: ProgressNode, inherited: readonly string[]): ProgressNode | undefined => {
    if (!isSatisfied(node.status)) finished = false;
    const gates = [...inherited, ...unmet(node.deps)];
    if (node.leaf && node.status === 'todo') {
      hasTodo = true;
      if (!gates.length) return node;
      for (const gate of gates) blockers.add(gate);
    }
    for (const child of node.children) {
      const ready = walk(child, gates);
      if (ready) return ready;
    }
    return undefined;
  };
  const inherited = scope.ancestors.flatMap((node) => unmet(node.deps));
  const node = walk(scope.root, inherited);
  if (node) return { kind: 'ready', node };
  if (finished) return { kind: 'finished' };
  return hasTodo ? { kind: 'gated', blockers: [...blockers] } : { kind: 'open' };
}
