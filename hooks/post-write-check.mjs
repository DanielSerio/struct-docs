#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';
import { cliPath, guard, isAdopted, isUnderDocs, readPayload, writtenFile } from './lib.mjs';
import { markPending } from './pending.mjs';

/** Check just the written file; the Stop hook owns all derived repairs. */
await guard(async () => {
  const payload = await readPayload();
  if (!payload || (payload.tool_name !== undefined && !['Write', 'Edit'].includes(payload.tool_name))) return;
  const root = resolve(payload.cwd);
  if (!isAdopted(root)) return;
  const file = writtenFile(root, payload.tool_input?.file_path);
  if (!file) return;
  const docs = isUnderDocs(root, file);
  if (!docs && file !== resolve(root, '.struct-docs.yml')) return;
  markPending(root);
  if (!docs || !/\.md$/i.test(file)) return;
  const result = spawnSync(process.execPath, [cliPath, 'check', file], {
    cwd: root, encoding: 'utf8', timeout: 4000,
  });
  if (result.error || result.status !== 1 || !result.stdout) return;
  // Config errors are not findings about this file, and feedback stays bounded.
  const path = relative(resolve(root, 'docs'), file).split(sep).join('/').replaceAll('\r', '\\r').replaceAll('\n', '\\n');
  const lines = result.stdout.trimEnd().split('\n').filter((line) => line.startsWith(`${path}:`));
  if (!lines.length) return;
  const shown = lines.slice(0, 5);
  if (lines.length > shown.length) shown.push(`... ${lines.length - shown.length} more findings`);
  process.stdout.write(`${shown.join('\n')}\n`);
});
