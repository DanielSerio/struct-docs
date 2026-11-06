import { lstatSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { ancestors, isAdopted, isWithin } from './project-root.mjs';

// Where a written file's adopted project is, independent of which host reported it. The project
// lookup itself is generated from the CLI's source, so both agree on what adopts a project.
export { ancestors, isAdopted };

function isFile(path) {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
}

/** A relative path strictly below its base. */
const isInside = (path) => path !== '' && isWithin(path);

/**
 * The existing file a host reported, tried against each reported root in order: a relative path
 * belongs to the first root that holds it, and an absolute one stands for itself.
 */
export function writtenFile(roots, value) {
  if (typeof value !== 'string' || !value || !roots.length) return undefined;
  const clean = value.replaceAll('\\', '/');
  const file = roots.map((root) => resolve(root, clean))
    .find((candidate, index) => isInside(relative(roots[index], candidate)) && isFile(candidate));
  if (file) return file;
  const absolute = resolve(roots[0], clean);
  return isFile(absolute) ? absolute : undefined;
}

export const isUnderDocs = (root, file) => isInside(relative(resolve(root, 'docs'), file));
