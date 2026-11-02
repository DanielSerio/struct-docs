import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cliPath = fileURLToPath(new URL('../bin/docs-lint.mjs', import.meta.url));

/** Only an unambiguous ordered marker pair opts a project into either hook. */
export function isAdopted(root) {
  try {
    const lines = readFileSync(join(root, 'docs/README.md'), 'utf8').split(/\r?\n/).map((line) => line.trim());
    const open = lines.flatMap((line, index) => line === '<!-- struct-docs:index -->' ? [index] : []);
    const close = lines.flatMap((line, index) => line === '<!-- /struct-docs:index -->' ? [index] : []);
    return open.length === 1 && close.length === 1 && open[0] < close[0];
  } catch {
    return false;
  }
}

export function writtenFile(root, value) {
  if (typeof value !== 'string' || !value) return undefined;
  const file = resolve(root, value.replaceAll('\\', '/'));
  try {
    return lstatSync(file).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

export function isUnderDocs(root, file) {
  const path = relative(resolve(root, 'docs'), file);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Malformed or unexpected hook input must not fall back to mutating this checkout. */
export async function readPayload() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  const value = JSON.parse(raw);
  return value && typeof value === 'object' && !Array.isArray(value) &&
    typeof value.cwd === 'string' && value.cwd ? value : undefined;
}

export async function guard(run) {
  try {
    await run();
  } catch {
    // Hooks are unattended feedback; their own failures never interrupt a session.
  }
  process.exitCode = 0;
}
