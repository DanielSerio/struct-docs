import type { Finding } from '../policy/findings.js';
import { documentReference } from '../policy/document-reference.js';
import type { RoadmapContext } from './context.js';
import { isRoadmapRoot } from './files.js';
import { roadmapFinding } from './check-finding.js';

/** Only actual shared specs with authored status participate; custom docs are not draft specs. */
export function roadmapSpecFindings(context: RoadmapContext): Finding[] {
  const statuses = new Map<string, string>();
  for (const document of context.documents ?? []) {
    if (document.classification.cls !== 'live' || document.classification.type !== 'spec' ||
      document.classification.gitignored || !document.frontmatter.ok) continue;
    const status = document.frontmatter.data.status;
    if (typeof status === 'string') statuses.set(document.path.replace(/\.md$/i, ''), status);
  }
  const findings: Finding[] = [];
  for (const [name, files] of context.roadmaps) for (const root of files) {
    if (!isRoadmapRoot(root.rel) || root.rel.split('/').length !== 3 || !Array.isArray(root.data.specs)) continue;
    const status = context.models.get(name)?.effectiveStatus(root.data.id);
    const underway = status === 'in-progress' || status === 'done';
    for (const reference of root.data.specs) {
      if (documentReference(reference) !== null) continue;
      const target = statuses.get(reference);
      const message = target === 'superseded' ? `is built against \`${reference}\`, which is \`superseded\``
        : underway && target === 'draft' ? `depends on \`${reference}\`, which is still \`draft\`` : undefined;
      if (message) findings.push(roadmapFinding(root.rel, root.locations.specs?.line ?? 1, message, 'roadmap-spec'));
    }
  }
  return findings;
}
