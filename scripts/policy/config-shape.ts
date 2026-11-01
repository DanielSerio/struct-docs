import type { ConfigIssue, ConfigPath } from './config-types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

export const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');

export function unknownOptions(value: Record<string, unknown>, allowed: string[], path: ConfigPath): ConfigIssue[] {
  return Object.keys(value).filter((key) => !allowed.includes(key)).map((key) => ({
    path: [...path, key], message: `unknown option "${key}"`,
  }));
}

// Validate shapes before casting. Semantic kind and locked-policy checks build on this.
export function optionTypes(value: Record<string, unknown>, types: Record<string, string>, path: ConfigPath) {
  const issues: ConfigIssue[] = [];
  for (const [key, type] of Object.entries(types)) {
    if (Object.hasOwn(value, key) && typeof value[key] !== type) {
      issues.push({ path: [...path, key], message: `"${key}" must be ${type}` });
    }
  }
  return issues;
}
