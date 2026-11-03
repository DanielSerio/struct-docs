#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';
import { cliPath, guard, isAdopted, isUnderDocs, readPayload, writtenFile } from './lib.mjs';
import { markPending } from './pending.mjs';

function checkFile(root, file) {
  const result = spawnSync(process.execPath, [cliPath, 'check', file], {
    cwd: root, encoding: 'utf8', timeout: 4000,
  });
  if (result.error || result.status !== 1 || !result.stdout) return [];
  // Config errors are not findings about this file, and feedback stays bounded.
  const path = relative(resolve(root, 'docs'), file).split(sep).join('/').replaceAll('\r', '\\r').replaceAll('\n', '\\n');
  const lines = result.stdout.trimEnd().split('\n').filter((line) => line.startsWith(`${path}:`));
  if (!lines.length) return [];
  const shown = lines.slice(0, 5);
  if (lines.length > shown.length) shown.push(`... ${lines.length - shown.length} more findings`);
  return shown;
}

/** Check each surviving written file; the Stop hook owns all derived repairs. */
await guard(async () => {
  const payload = await readPayload();
  if (!payload) return;
  const writeOutput = (findings = '') => {
    if (payload.host === 'antigravity') {
      const overwriteResult = payload.result ? `${payload.result.trimEnd()}\n${findings}` : findings;
      process.stdout.write(`${JSON.stringify(findings ? { overwriteResult } : {})}\n`);
    } else if (findings) {
      process.stdout.write(`${findings}\n`);
    }
  };
  if (!payload.root || !payload.files.length) return writeOutput();
  const root = resolve(payload.root);
  if (!isAdopted(root)) return writeOutput();
  let armed = false;
  const findings = [];
  for (const candidate of payload.files) {
    const file = writtenFile(root, candidate);
    if (!file) continue;
    const docs = isUnderDocs(root, file);
    if (!docs && file !== resolve(root, '.struct-docs.yml')) continue;
    if (!armed) {
      markPending(root);
      armed = true;
    }
    if (docs && /\.md$/i.test(file)) findings.push(...checkFile(root, file));
  }
  writeOutput(findings.join('\n'));
});
