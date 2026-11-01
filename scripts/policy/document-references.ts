import type { ParsedDocument } from './document.js';
import { documentFields } from './document-fields.js';
import { documentReference } from './document-reference.js';

export type DocumentReference = { field: string; value: string };

/** Only accepted grammars reach resolution; schema findings already explain invalid values. */
export function documentReferences(document: ParsedDocument): readonly DocumentReference[] {
  if (!document.frontmatter.ok) return [];
  const { data } = document.frontmatter;
  if (document.classification.cls === 'roadmap') {
    const stem = (document.path.split('/').at(-1) ?? '').replace(/\.md$/i, '');
    if (stem !== 'index' || !Array.isArray(data.specs)) return [];
    return data.specs.filter((value: unknown): value is string => documentReference(value) === null)
      .map((value) => ({ field: 'specs', value }));
  }
  if (document.classification.cls !== 'live') return [];
  return Object.entries(documentFields(document)).flatMap(([field, definition]) => {
    const value = data[field];
    return definition.kind === 'reference' && typeof value === 'string' && definition.validate(value) === null
      ? [{ field, value }] : [];
  });
}
