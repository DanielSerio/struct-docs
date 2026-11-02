import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/** A checkout's pending work belongs in temp, never in the project's files. */
export function sentinelPath(root) {
  const key = createHash('sha256').update(resolve(root)).digest('hex');
  return join(tmpdir(), 'struct-docs', `${key}.pending`);
}

export const isPending = (root) => existsSync(sentinelPath(root));
export function markPending(root) {
  const path = sentinelPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '');
}
export const clearPending = (root) => rmSync(sentinelPath(root), { force: true });
