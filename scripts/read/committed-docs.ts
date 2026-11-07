import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { isRecord } from '../policy/config-shape.js';
import { CONFIG_FILE } from './config.js';

/** Whether the last commit holds any file under a docs directory; false outside git or before one. */
export function committedUnder(root: string, directory: string) {
  const result = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', `docs/${directory}/`], {
    cwd: root, encoding: 'utf8',
  });
  return !result.error && result.status === 0 && result.stdout.trim() !== '';
}

/**
 * Docs directories whose `gitignored: true` is written in the config rather than inherited from a
 * default. Only a written choice can stop tracking documents that are already committed.
 */
export function explicitlyGitignored(root: string) {
  const chosen = new Set<string>();
  let value: unknown;
  try {
    value = parse(readFileSync(join(root, CONFIG_FILE), 'utf8'));
  } catch {
    // No config or one that does not parse: nothing was chosen explicitly.
    return chosen;
  }
  if (!isRecord(value)) return chosen;
  if (isRecord(value.living) && value.living.gitignored === true) chosen.add('living');
  if (!isRecord(value.doctypes)) return chosen;
  for (const [directory, definition] of Object.entries(value.doctypes)) {
    if (isRecord(definition) && definition.gitignored === true) chosen.add(directory);
  }
  return chosen;
}
