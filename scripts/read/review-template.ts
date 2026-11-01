import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Lazy lookup follows the executable's ancestors, never the consuming project's cwd. */
export function readReviewTemplate(moduleUrl = import.meta.url): Buffer {
  let directory = dirname(fileURLToPath(moduleUrl));
  while (true) {
    const file = resolve(directory, 'assets/code-review-v1.md');
    if (existsSync(file)) return readFileSync(file);
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Struct Docs review template asset is missing; reinstall the plugin');
    directory = parent;
  }
}
