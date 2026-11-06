import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// The one definition of an adopted project. The build also emits this module as
// hooks/project-root.mjs, so the CLI and both hooks cannot disagree about it.
export { isWithin } from './containment.js';

/** Only an unambiguous ordered marker pair in docs/README.md adopts a project. */
export function isAdopted(root: string): boolean {
  try {
    const lines = readFileSync(join(root, 'docs', 'README.md'), 'utf8').split(/\r?\n/).map((line) => line.trim());
    const open = lines.flatMap((line, index) => line === '<!-- struct-docs:index -->' ? [index] : []);
    const close = lines.flatMap((line, index) => line === '<!-- /struct-docs:index -->' ? [index] : []);
    return open.length === 1 && close.length === 1 && Number(open[0]) < Number(close[0]);
  } catch {
    return false;
  }
}

/**
 * Directories from `start` upward, ending at the git root (or the filesystem root). A command or
 * host may start in a subdirectory, so the project can sit above it.
 */
export function* ancestors(start: string): Generator<string> {
  let dir = resolve(start);
  for (;;) {
    yield dir;
    const parent = dirname(dir);
    if (parent === dir || existsSync(join(dir, '.git'))) return;
    dir = parent;
  }
}

/**
 * The nearest adopted project at or above `start`, so a command run from a subdirectory checks
 * the project instead of passing vacuously. With none, `start` is the root, as for a first `init`.
 */
export function findProjectRoot(start: string): string {
  return [...ancestors(start)].find(isAdopted) ?? resolve(start);
}
