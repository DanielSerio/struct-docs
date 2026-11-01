import type { ConfigIssue, ConfigPath } from './config-types.js';
import { stringList } from './config-shape.js';
import { isKebabCase } from './kebab-case.js';

const kinds = ['string', 'enum', 'list', 'reference'];

/** Semantic options are checked before registry construction, alongside shape checks. */
export function fieldOptionIssues(field: Record<string, unknown>, path: ConfigPath): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const issue = (key: string, message: string) => issues.push({ path: [...path, key], message });
  if (typeof field.kind === 'string' && !kinds.includes(field.kind)) {
    issue('kind', `unsupported field kind \`${field.kind}\`; expected ${kinds.join(' | ')}`);
  }
  if (Object.hasOwn(field, 'values') && field.kind !== 'enum') {
    issue('values', '`values` is only supported for enum fields');
  }
  if (Object.hasOwn(field, 'to') && field.kind !== 'reference') {
    issue('to', '`to` is only supported for reference fields');
  }
  if (field.kind === 'enum') {
    if (!Object.hasOwn(field, 'values')) issue('values', 'enum requires `values`');
    else if (stringList(field.values) && (field.values.length === 0 ||
      field.values.some((value) => !value.trim()) || new Set(field.values).size !== field.values.length)) {
      issue('values', 'enum `values` must be a nonempty list of unique nonempty strings');
    }
  }
  if (field.kind === 'reference' && typeof field.to === 'string' && !isKebabCase(field.to)) {
    issue('to', '`to` must name one kebab-case docs directory');
  }
  return issues;
}
