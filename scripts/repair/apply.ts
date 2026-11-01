import type { Finding } from '../policy/findings.js';
import { needsIndex } from '../policy/index.js';
import { loadTree } from '../read/tree.js';
import { readReadme } from '../read/readme.js';
import { inspectIndex, spliceIndex } from '../render/index-block.js';
import { buildIndex } from '../render/readme.js';
import { repairStatusFields } from './status-fields.js';
import { writeIndex } from './index-write.js';

/** Commands supply audited data; this layer writes derived values without importing checks. */
export function applyRepairs(tree: ReturnType<typeof loadTree>, findings: readonly Finding[]) {
  let applied = repairStatusFields(tree.root, tree.documents, findings);
  const finding = findings.find((item) => item.severity === 'repairable' && item.repair.field === 'index');
  if (finding?.severity !== 'repairable') return applied;
  // Reload after status writes: the index reflects values actually on disk, never predicted writes.
  const fresh = loadTree(tree.root, tree.config);
  const current = readReadme(tree.root);
  if (!needsIndex(fresh, current) || !inspectIndex(current ?? '').ok) return applied;
  const expected = spliceIndex(current, buildIndex(fresh));
  if (!writeIndex(tree.root, current, expected)) return applied;
  finding.repair.expected = expected; finding.repair.applied = true;
  applied += 1;
  return applied;
}
