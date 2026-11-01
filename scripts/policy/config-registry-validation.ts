import { defaultConfig } from './config-defaults.js';
import { isRecord } from './config-shape.js';
import type { ConfigIssue } from './config-types.js';
import { isKebabCase } from './kebab-case.js';
import { lockedFields, reservedDirectories } from './locked-policy.js';

/** Check registry identities before merging, preserving paths for source diagnostics. */
export function registryIssues(value: unknown): ConfigIssue[] {
  if (!isRecord(value) || !isRecord(value.doctypes)) return [];
  const defaults = defaultConfig().doctypes;
  return Object.entries(value.doctypes).flatMap(([name, definition]) => {
    const path = ['doctypes', name];
    const issues: ConfigIssue[] = [];
    if (!isKebabCase(name)) issues.push({ path, message: 'doctype directory must be kebab-case' });
    // Locked policy reports reserved names and system fields with the accurate reason.
    if (definition === null && !Object.hasOwn(defaults, name) && !reservedDirectories.has(name)) {
      issues.push({ path, message: 'cannot remove an unknown doctype' });
    }
    if (!isRecord(definition)) return issues;
    if (typeof definition.type === 'string' && !isKebabCase(definition.type)) {
      issues.push({ path: [...path, 'type'], message: 'doctype type must be kebab-case' });
    }
    if (!Object.hasOwn(defaults, name) && !Object.hasOwn(definition, 'type')) {
      issues.push({ path, message: 'a custom doctype requires `type`' });
    }
    if (isRecord(definition.fields)) {
      const inherited = Object.hasOwn(defaults, name) ? defaults[name]?.fields : undefined;
      for (const [field, options] of Object.entries(definition.fields)) {
        if (options === null && !lockedFields.has(field) && !Object.hasOwn(inherited ?? {}, field)) {
          issues.push({ path: [...path, 'fields', field], message: 'cannot remove a field that is not inherited' });
        }
        if (!isKebabCase(field)) {
          issues.push({ path: [...path, 'fields', field], message: 'field name must be kebab-case' });
        }
      }
    }
    return issues;
  });
}
