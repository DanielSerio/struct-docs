import type { NextReady, ProgressNode, ProgressScope } from '../policy/progress.js';

const marks: Readonly<Record<string, string>> = { todo: ' ', 'in-progress': '>', blocked: '!', done: 'x', cut: '-' };

/** Keep the rendered order identical to the tree consumed by next-ready selection. */
export function formatProgress(scope: ProgressScope, next: NextReady) {
  const out = [`${scope.root.id} [${scope.root.status ?? '?'}]`];
  const walk = (nodes: readonly ProgressNode[], depth: number) => {
    for (const node of nodes) {
      const deps = node.deps.length ? `  (needs ${node.deps.join(', ')})` : '';
      out.push(`${'  '.repeat(depth)}[${marks[node.status ?? ''] ?? '?'}] ${node.id}${deps}`);
      walk(node.children, depth + 1);
    }
  };
  walk(scope.root.children, 1);
  return [...out, '', formatNext(next)].join('\n');
}

function formatNext(next: NextReady) {
  switch (next.kind) {
    case 'ready': return `next: ${next.node.id}`;
    case 'finished': return 'next: nothing - every node is done or cut';
    case 'gated': return `next: nothing ready - every todo leaf is gated on ${next.blockers.join(', ')}`;
    case 'open': return 'next: nothing ready - no todo leaves, but work remains open';
    case 'cyclic': return `next: cyclic - ${next.cycles.map((cycle) => cycle.join(' -> ')).join('; ')}`;
  }
}
