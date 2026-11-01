import type { Rule } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';
import { isKebabCase } from '../policy/kebab-case.js';
import { breakoutFields, forbiddenFields, rootFields } from './schema.js';
import { isRoadmapRoot } from './files.js';
import { fieldLine, roadmapFinding } from './check-finding.js';
import { validateBodyNode } from './node-checks.js';

/** Single-file roadmap schema, separate from dependency and cross-file context checks. */
export const roadmapFileRule: Rule = (document) => {
  if (document.classification.cls !== 'roadmap' || !document.frontmatter.ok) return [];
  const findings: Finding[] = [];
  const at = (message: string, field?: string) =>
    findings.push(roadmapFinding(document.path, field ? fieldLine(document, field) : 1, message));
  if (document.path.split('/').length !== 3) at('roadmap files must be `roadmaps/<name>/<file>.md`');
  const stem = (document.path.split('/').at(-1) ?? '').replace(/\.md$/i, '');
  if (!isKebabCase(stem)) at(`filename stem \`${stem}\` is not kebab-case`);
  const root = isRoadmapRoot(document.path);
  const fields = root ? rootFields : breakoutFields;
  const type = root ? 'roadmap' : 'roadmap-node';
  const { data } = document.frontmatter;
  for (const [field, grammar] of Object.entries(fields)) {
    if (!Object.hasOwn(data, field)) {
      if (grammar.required) at(`missing \`${field}\``);
      continue;
    }
    const reason = grammar.validate(data[field]);
    if (reason) at(`\`${field}\` ${reason}`, field);
  }
  for (const field of Object.keys(data)) {
    if (forbiddenFields.has(field)) at(`roadmap nodes do not take \`${field}\``, field);
    else if (!Object.hasOwn(fields, field)) at(`unknown field \`${field}\` for type \`${type}\``, field);
  }
  if (typeof data.id === 'string') {
    const expected = root ? document.path.split('/')[1] : stem;
    if (data.id !== expected) at(root ? `root id \`${data.id}\` must equal directory \`${expected}\``
      : `id \`${data.id}\` must equal filename stem \`${stem}\``, 'id');
  }
  for (const node of document.roadmap?.nodes ?? []) findings.push(...validateBodyNode(document, node));
  return findings;
};
