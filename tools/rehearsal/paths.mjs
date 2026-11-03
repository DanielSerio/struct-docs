import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repository = fileURLToPath(new URL('../../', import.meta.url));
export const fixture = resolve(repository, 'tests/fixtures/execution/project');
export const prefix = 'struct-docs-execution-';

/** Verify the final absolute root before a caller cleans up a disposable repository. */
export function assertRehearsalRoot(root) {
  const absolute = resolve(root);
  const inside = relative(repository, absolute);
  const outside = isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`);
  if (!outside || dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith(prefix)) {
    throw new Error('rehearsal root must be a generated OS-temp directory outside the checkout');
  }
  return absolute;
}
