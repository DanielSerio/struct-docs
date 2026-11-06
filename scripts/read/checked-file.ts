import { lstatSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { isWithin } from './containment.js';

/**
 * Resolve the one file `check` names to its docs-relative path. A missing file is a usage
 * error, so a typo never reads as a clean result. An existing file outside docs/ has nothing
 * to check and returns undefined, so a list of changed files can be passed through whole.
 */
export function checkedDocsPath(root: string, file: string): string | undefined {
  const absolute = resolve(root, file.replaceAll('\\', '/'));
  let directory: boolean;
  try {
    directory = lstatSync(absolute).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new Error(`no such file: ${file}`);
    throw error;
  }
  if (directory) throw new Error('check requires a file, not a directory');
  const local = relative(resolve(root, 'docs'), absolute);
  if (!isWithin(local)) return undefined;
  return local.split(sep).join('/');
}
