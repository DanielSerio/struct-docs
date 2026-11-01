import type { ParsedDocument } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';

export function documentFinding(document: ParsedDocument, rule: string, message: string, field?: string): Finding {
  const line = document.frontmatter.ok && field ? document.frontmatter.locations[field]?.line ?? 1 : 1;
  return { file: document.path, line, rule, severity: 'error', message };
}
