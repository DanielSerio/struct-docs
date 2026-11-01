import { isKebabCase } from '../policy/kebab-case.js';

/** Bare ids are local; a qualifier is never discarded or guessed from another roadmap. */
export function splitDep(value: unknown) {
  if (typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length < 1 || parts.length > 2 || !parts.every(isKebabCase)) return null;
  return parts.length === 2 ? { roadmap: parts[0] ?? '', id: parts[1] ?? '' }
    : { roadmap: null, id: parts[0] ?? '' };
}
export const depReference = (value: unknown) => splitDep(value) ? null : 'must be a valid `<roadmap>:<id>` reference';
