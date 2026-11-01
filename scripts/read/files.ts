import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/** Inventory only real files: directory names and symlink targets cannot become documents. */
export function listDocFiles(root: string) {
  const docs = resolve(root, 'docs');
  if (!existsSync(docs)) return [];
  if (lstatSync(docs).isSymbolicLink()) throw new Error('docs/ must not be a symbolic link');
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(relative(docs, absolute).split(sep).join('/'));
    }
  };
  walk(docs);
  return files.sort();
}
