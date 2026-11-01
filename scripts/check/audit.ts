import type { Finding } from '../policy/findings.js';
import { sortFindings } from '../policy/finding-order.js';
import { loadConfig } from '../read/config.js';
import { loadTree } from '../read/tree.js';
import { roadmapRule } from '../roadmap/roadmap-rule.js';
import { createAuditContext } from './audit-context.js';
import type { AuditContext } from './audit-context.js';
import { documentRule } from './document.js';
import { referenceRule } from './reference-rule.js';
import { ownershipRule } from './ownership-rule.js';
import { layoutFindings } from './layout-findings.js';
import { roadmapWarnings } from './roadmap-warnings.js';

export type AuditResult =
  | { ok: false; findings: Finding[] }
  | { ok: true; tree: ReturnType<typeof loadTree>; context: AuditContext; findings: Finding[] };

/** Read once, prepare once, then give every document rule the same complete context. */
export function auditProject(root: string): AuditResult {
  const { config, findings: configFindings } = loadConfig(root);
  if (!config) return { ok: false, findings: sortFindings(configFindings) };
  const tree = loadTree(root, config);
  const context = createAuditContext(tree);
  const findings = [...tree.findings, ...layoutFindings(tree.entries), ...roadmapWarnings(context)];
  for (const raw of tree.documents) {
    const document = { ...raw, context };
    const local = document.classification.cls === 'roadmap' ? roadmapRule(document) : documentRule(document);
    findings.push(...local, ...referenceRule(document), ...ownershipRule(document));
  }
  return { ok: true, tree, context, findings: sortFindings(findings) };
}
