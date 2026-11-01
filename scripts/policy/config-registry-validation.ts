import { defaultConfig } from './config-defaults.js';
import { isRecord } from './config-shape.js';
import type { ConfigIssue } from './config-types.js';
import { isKebabCase } from './kebab-case.js';

/** Check registry identities before merging, preserving paths for source diagnostics. */
export function registryIssues(value: unknown): ConfigIssue[] {
  if (!isRecord(value) || !isRecord(value.doctypes)) return [];
  const defaults = defaultConfig().doctypes;
  return Object.entries(value.doctypes).flatMap(([name, definition]) => {
    const path = ['doctypes', name];
    const issues: ConfigIssue[] = [];
    if (!isKebabCase(name)) issues.push({ path, message: 'doctype directory must be kebab-case' });
    if (!isRecord(definition)) return issues;
    if (typeof definition.type === 'string' && !isKebabCase(definition.type)) {
      issues.push({ path: [...path, 'type'], message: 'doctype type must be kebab-case' });
    }
    if (!Object.hasOwn(defaults, name) && !Object.hasOwn(definition, 'type')) {
      issues.push({ path, message: 'a custom doctype requires `type`' });
    }
    if (isRecord(definition.fields)) {
      for (const field of Object.keys(definition.fields)) {
        if (!isKebabCase(field)) {
          issues.push({ path: [...path, 'fields', field], message: 'field name must be kebab-case' });
        }
      }
    }
    return issues;
  });
}
