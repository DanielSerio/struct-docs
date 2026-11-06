import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * One name per checkout however a host spells its path: links and junctions resolve to the real
 * directory, and Windows paths compare without case, so PostToolUse and Stop always agree.
 */
function checkoutKey(root) {
  let path = resolve(root);
  try {
    path = realpathSync.native(path);
  } catch {
    // A directory that is gone keeps its spelled path; there is nothing left to repair anyway.
  }
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

/** A checkout's pending work belongs in temp, never in the project's files. */
export function sentinelPath(root) {
  const key = createHash('sha256').update(checkoutKey(root)).digest('hex');
  return join(tmpdir(), 'struct-docs', `${key}.pending`);
}

export const isPending = (root) => existsSync(sentinelPath(root));
export function markPending(root) {
  const path = sentinelPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '');
}
export const clearPending = (root) => rmSync(sentinelPath(root), { force: true });
