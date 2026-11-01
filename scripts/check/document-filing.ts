import type { Rule } from '../policy/document.js';
import { isKebabCase } from '../policy/kebab-case.js';
import { documentFinding } from './document-finding.js';

/** Only naming and placement: this is the complete single-file hook vocabulary. */
export const filingRule: Rule = (document) => {
  const classification = document.classification;
  if (classification.cls !== 'live' && classification.cls !== 'roadmap') return [];
  if (!document.frontmatter.ok) return [];
  const findings = [];
  const stem = (document.path.split('/').at(-1) ?? '').replace(/\.md$/i, '');
  if (!isKebabCase(stem)) findings.push(documentFinding(document, 'filename',
    `filename stem \`${stem}\` is not kebab-case`));
  const expected = classification.cls === 'live' ? classification.type
    : stem === 'index' ? 'roadmap' : 'roadmap-node';
  const actual = document.frontmatter.data.type;
  if (actual === undefined) findings.push(documentFinding(document, 'type', 'missing `type`'));
  else if (actual !== expected) findings.push(documentFinding(document, 'type',
    `type \`${String(actual)}\` is not permitted here - expected \`${expected}\``, 'type'));
  return findings;
};
