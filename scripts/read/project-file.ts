import { lstatSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { isWithin } from './containment.js';

/** Refuse linked/non-directory parents before reading or creating project-owned files. */
export function projectPath(root: string, path: string) {
  const base = resolve(root);
  const target = resolve(base, path);
  const local = relative(base, target);
  if (!isWithin(local)) throw new Error('project path escapes root');
  const parts = local.split(sep);
  let current = base;
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    try {
      const info = lstatSync(current);
      if (info.isSymbolicLink()) throw new Error(`${path} must not use symbolic links`);
      if (index < parts.length - 1 && !info.isDirectory()) throw new Error(`${path} parent must be a directory`);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
      throw error;
    }
  }
  return target;
}

export function readProjectFile(root: string, path: string): Buffer | null {
  const target = projectPath(root, path);
  try {
    if (!lstatSync(target).isFile()) throw new Error(`${path} must be a regular file`);
    return readFileSync(target);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}
