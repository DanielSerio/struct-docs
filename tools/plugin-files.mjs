import { readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

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
