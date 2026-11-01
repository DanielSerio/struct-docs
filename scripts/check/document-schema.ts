import type { Rule } from '../policy/document.js';
import { documentFields } from '../policy/document-fields.js';
import { documentFinding } from './document-finding.js';

/** Full schema checks consume only the parsed document and compiled field grammars. */
export const schemaRule: Rule = (document) => {
  if (document.classification.cls !== 'live' || !document.frontmatter.ok) return [];
  const fields = documentFields(document);
  const { data } = document.frontmatter;
  const findings = [];
  for (const [name, field] of Object.entries(fields)) {
    // Type presence and value are already checked by filingRule, including placement.
    if (name === 'type') continue;
    if (!Object.hasOwn(data, name)) {
      if (field.required) findings.push(documentFinding(document, 'schema', `missing \`${name}\``));
      continue;
    }
    const reason = field.validate(data[name]);
    if (reason) findings.push(documentFinding(document, 'schema', `\`${name}\` ${reason}`, name));
  }
  for (const name of Object.keys(data)) {
    // Ownership is a separate structural rule; disabled doctypes may still carry metadata.
    if (Object.hasOwn(fields, name) || name === 'owns') continue;
    const message = name === 'decisions' ? '`decisions` is retired - `fold` merges decision records into their owners'
      : `unknown field \`${name}\` for type \`${document.classification.type}\``;
    findings.push(documentFinding(document, 'schema', message, name));
  }
  return findings;
};
