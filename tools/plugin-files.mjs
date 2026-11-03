import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearPending } from '../hooks/pending.mjs';

export const repository = fileURLToPath(new URL('../', import.meta.url));
export const shippedPluginPaths = [
  '.claude-plugin', '.codex-plugin', '.antigravity-plugin', 'hooks.json',
  'skills', 'hooks', 'README.md', 'bin/docs-lint.mjs', 'assets/code-review-v1.md',
];

/** Create a temporary plugin install holding only shipped files for tests and host validators. */
export function copiedPlugin(run) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-plugin-'));
  const install = join(root, 'install');
  mkdirSync(install);
  for (const path of shippedPluginPaths) {
    mkdirSync(dirname(join(install, path)), { recursive: true });
    cpSync(join(repository, path), join(install, path), { recursive: true });
  }
  try {
    return run(install, root);
  } finally {
    clearPending(join(root, 'project'));
    rmSync(root, { recursive: true, force: true });
  }
}

/** References must stay inside the install, so a passing check is portable to a git copy. */
export function pluginFile(root, path, errors) {
  const target = resolve(root, path);
  const local = relative(resolve(root), target);
  if (!local || isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
    errors.push(`plugin reference must stay inside the install: ${path}`);
    return undefined;
  }
  try {
    if (statSync(target).isFile()) return target;
  } catch {
    // Report absent files alongside other broken references rather than stopping early.
  }
  errors.push(`missing referenced file: ${path}`);
  return undefined;
}

/** Hook helpers are shipped source; validate their relative import closure as well. */
export function hookFiles(root, path, errors, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  const file = pluginFile(root, path, errors);
  if (!file) return;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    hookFiles(root, relative(root, resolve(dirname(file), match[1])).split(sep).join('/'), errors, seen);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rawArgs] = process.argv.slice(2);
  if (!command) process.exit(2);
  copiedPlugin((install) => {
    const args = rawArgs.includes('.') ? rawArgs.map((arg) => arg === '.' ? install : arg) : [...rawArgs, install];
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  });
}
