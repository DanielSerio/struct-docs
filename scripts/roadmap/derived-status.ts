import type { ParsedDocument, Rule } from '../policy/document.js';
import type { Finding, SourceSpan } from '../policy/findings.js';
import type { RoadmapContext } from './context.js';
import { roadmapName } from './files.js';

export type DerivedContext = RoadmapContext & { readonly blockedRoadmaps: ReadonlySet<string> };

export function createDerivedContext(context: RoadmapContext, findings: readonly Finding[]): DerivedContext {
  const blockedRoadmaps = new Set<string>();
  for (const finding of findings) {
    const name = roadmapName(finding.file);
    if (finding.severity === 'error' && name) blockedRoadmaps.add(name);
  }
  return { ...context, blockedRoadmaps };
}

function stale(document: ParsedDocument, actual: unknown, expected: string | undefined,
  location: SourceSpan | undefined, withheld: boolean): Finding[] {
  if (expected === undefined || actual === expected || !location) return [];
  const token = document.lines[location.line - 1]?.slice(location.start, location.end);
  if (token === undefined) return [];
  const quote = token[0];
  const replacement = (quote === '"' || quote === "'") && token.at(-1) === quote ? quote + expected + quote : expected;
  return [{ file: document.path, line: location.line, rule: 'derived-status', severity: 'repairable',
    message: `status is ${String(actual)}, should be ${expected}`,
    repair: { field: 'status', actual: token, expected: replacement, location, withheld } }];
}

/** Ported staleDerived: file statuses and linked headings only; authored leaves are inputs. */
export const derivedStatusRule: Rule<DerivedContext> = (document) => {
  if (document.classification.cls !== 'roadmap' || !document.frontmatter.ok) return [];
  const context = document.context;
  if (!context) throw new Error('derived status checks require prepared context');
  const name = roadmapName(document.path) ?? '';
  const model = context.models.get(name);
  const file = model?.byRel.get(document.path);
  if (!model || !file) return [];
  const withheld = context.blockedRoadmaps.has(name);
  const findings = stale(document, file.data.status, model.effectiveStatus(file.data.id), file.locations.status, withheld);
  for (const node of file.nodes) {
    if (!node.breakout || !model.resolveBreakout(file.rel, node)) continue;
    findings.push(...stale(document, node.status, model.expectedStatuses.get(node.id), node.statusLoc, withheld));
  }
  return findings;
};
