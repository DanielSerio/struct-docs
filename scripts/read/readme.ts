import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readReadme(root: string): string | null {
  try {
    const path = resolve(root, 'docs/README.md');
    if (lstatSync(path).isSymbolicLink()) throw new Error('docs/README.md must not be a symbolic link');
    return readFileSync(path, 'utf8');
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}
