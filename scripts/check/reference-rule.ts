import type { Rule } from '../policy/document.js';
import { documentReferences } from '../policy/document-references.js';
import { isLocalOnlyReference } from '../policy/reference-context.js';
import type { ReferenceContext } from '../policy/reference-context.js';
import { documentFinding } from './document-finding.js';

/** Ported from manage-docs resolution, with no archive overlay and no per-rule filesystem I/O. */
export const referenceRule: Rule<ReferenceContext> = (document) => {
  const references = documentReferences(document);
  if (!references.length) return [];
  const context = document.context;
  if (!context) throw new Error('reference checks require prepared reference context');
  const localSource = document.classification.cls === 'live' && document.classification.gitignored;
  return references.flatMap(({ field, value }) => {
    // Check this first: adding or removing a local file must never change a shared finding.
    const message = !localSource && isLocalOnlyReference(value, context.config)
      ? `\`${field}\`: tracked documents cannot reference gitignored target \`${value}\``
      : !context.referenceTargets.has(value) ? `\`${field}\`: \`${value}\` resolves to no document` : undefined;
    return message ? [documentFinding(document, 'reference', message, field)] : [];
  });
};
