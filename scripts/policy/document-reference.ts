import { isKebabCase } from './kebab-case.js';

// Ported from manage-docs' field grammar; nested segments also address roadmap files.
export function documentReference(value: unknown, expectedDirectory?: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return 'must be a nonempty document reference';
  const parts = value.split('/');
  if (parts.length < 2) return 'is a bare id - the grammar requires `<directory>/<id>`';
  if (!parts.every(isKebabCase)) return 'must be a docs-relative `<directory>/<id>` reference without .md';
  if (expectedDirectory && parts[0] !== expectedDirectory) {
    return `must point into \`${expectedDirectory}/\``;
  }
  return null;
}
