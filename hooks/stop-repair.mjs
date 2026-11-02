#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { cliPath, guard, isAdopted, readPayload } from './lib.mjs';
import { clearPending, isPending } from './pending.mjs';

/** Quiet turns do not even read adoption metadata; only armed projects need repair. */
await guard(async () => {
  const payload = await readPayload();
  if (!payload) return;
  const root = resolve(payload.cwd);
  if (!isPending(root) || !isAdopted(root)) return;
  const result = spawnSync(process.execPath, [cliPath, 'repair'], {
    cwd: root, encoding: 'utf8', timeout: 14000,
  });
  // A failure or timeout must preserve the only record that this turn needs a retry.
  if (!result.error && result.status === 0) clearPending(root);
});
