import { lstatSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/** A status argument names a real roadmap file, never a symlink or an outside path. */
export function statusPath(root: string, file: string) {
  const directory = resolve(root, 'docs', 'roadmaps');
  const absolute = resolve(root, file.replaceAll('\\', '/'));
  const path = relative(directory, absolute);
  if (!path || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) {
    throw new Error('status file must be inside docs/roadmaps/');
  }
  let ancestor = resolve(root);
  for (const part of relative(ancestor, absolute).split(sep)) {
    ancestor = resolve(ancestor, part);
    try {
      if (lstatSync(ancestor).isSymbolicLink()) throw new Error('status file must not follow symbolic links');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
      throw error;
    }
  }
  return `roadmaps/${path.split(sep).join('/')}`;
}
