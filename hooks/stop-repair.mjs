#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cliPath, guard, readPayload } from './lib.mjs';
import { deadlineFor } from './limits.mjs';
import { ancestors, isAdopted } from './project.mjs';
import { clearPending, isPending } from './pending.mjs';

/** Quiet turns do not even read adoption metadata; only armed projects need repair. */
await guard(async () => {
  // One deadline under the host's limit covers reading the payload and every repair.
  const deadline = deadlineFor('Stop');
  const payload = await readPayload(deadline);
  if (!payload) return;
  const writeOutput = () => {
    if (payload.host === 'antigravity') {
      process.stdout.write(`${JSON.stringify(payload.stop ? { decision: 'stop' } : {})}\n`);
    }
  };
  if (!payload.stop) return writeOutput();
  // The sentinel is checked first at each level, so a quiet turn still reads no docs. Every
  // workspace root is searched, since a multi-root write may have armed any of them.
  const pending = new Set(payload.roots.flatMap((start) =>
    [...ancestors(start)].find((dir) => isPending(dir) && isAdopted(dir)) ?? []));
  for (const root of pending) {
    const timeout = deadline - Date.now();
    if (timeout <= 0) break;
    const result = spawnSync(process.execPath, [cliPath, 'repair'], { cwd: root, encoding: 'utf8', timeout });
    // A failure or timeout must preserve the only record that this turn needs a retry.
    if (!result.error && result.status === 0) clearPending(root);
  }
  writeOutput();
});
