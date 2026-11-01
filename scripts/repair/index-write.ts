import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { projectPath } from '../read/project-file.js';
import { readReadme } from '../read/readme.js';

/** Explicit init may adopt an empty tree; ordinary repair still decides index eligibility. */
export function writeIndex(root: string, original: string | null, expected: string) {
  const target = projectPath(root, 'docs/README.md');
  const current = readReadme(root);
  if (current !== original) throw new Error('docs/README.md changed since the plan; run init again');
  if (current === expected) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected);
  return true;
}
