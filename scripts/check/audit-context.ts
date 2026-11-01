import { createOwnershipContext } from '../policy/ownership-context.js';
import { createReferenceContext } from '../policy/reference-context.js';
import { createRoadmapContext } from '../roadmap/context.js';
import { createRoadmapCheckContext } from '../roadmap/check-context.js';
import type { loadTree } from '../read/tree.js';

/** Prepare all shared indexes once, including inventory before cross-file roadmap checks. */
export function createAuditContext(tree: ReturnType<typeof loadTree>) {
  const { config, files, documents } = tree;
  return { ...createReferenceContext(config, files), ...createOwnershipContext(config, documents),
    ...createRoadmapCheckContext({ ...createRoadmapContext(config, documents), files: new Set(files) }) };
}
export type AuditContext = ReturnType<typeof createAuditContext>;
