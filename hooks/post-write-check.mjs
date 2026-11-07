#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { cliPath, guard, readPayload } from './lib.mjs';
import { deadlineFor } from './limits.mjs';
import { ancestors, isAdopted, isUnderDocs, writtenFile } from './project.mjs';
import { markPending } from './pending.mjs';

/** A relative path that names something under a docs folder, or the config file. */
const looksLikeDocs = (path) => !isAbsolute(path) && /(?:^|[\\/])(?:docs[\\/]|\.struct-docs\.yml$)/.test(path);

function checkFile(root, file, deadline) {
  // Every check shares one deadline, so the hook always prints before the host's kill.
  const timeout = deadline - Date.now();
  if (timeout <= 0) return [];
  const result = spawnSync(process.execPath, [cliPath, 'check', file], {
    cwd: root, encoding: 'utf8', timeout,
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
  const deadline = deadlineFor('PostToolUse');
  const payload = await readPayload(deadline);
  if (!payload) return;
  const writeOutput = (findings = '') => {
    if (payload.host === 'antigravity') {
      process.stdout.write(`${JSON.stringify(findings ? { overwriteResult: findings } : {})}\n`);
    } else if (findings) {
      process.stdout.write(`${findings}\n`);
    }
  };
  if (!payload.roots.length || !payload.files.length) return writeOutput();
  const armed = new Set();
  const arm = (root) => {
    if (!armed.has(root)) markPending(root);
    armed.add(root);
  };
  const findings = [];
  let unresolved = false;
  for (const candidate of payload.files) {
    const file = writtenFile(payload.roots, candidate);
    // A patch applied from a subdirectory (a `cd` inside the shell command) leaves relative
    // headers that resolve nowhere. They cannot be checked, but they still need a Stop repair.
    if (!file) {
      unresolved ||= payload.patch === true && looksLikeDocs(candidate);
      continue;
    }
    // The written file, not the host's directory, names the adopted project it belongs to.
    const root = [...ancestors(dirname(file))].find(isAdopted);
    if (!root) continue;
    const docs = isUnderDocs(root, file);
    if (!docs && file !== resolve(root, '.struct-docs.yml')) continue;
    arm(root);
    if (docs && /\.md$/i.test(file)) findings.push(...checkFile(root, file, deadline));
  }
  if (unresolved) {
    const session = payload.roots.map((start) => [...ancestors(start)].find(isAdopted)).find(Boolean);
    if (session) arm(session);
  }
  writeOutput(findings.join('\n'));
});
