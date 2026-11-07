import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { isRecord } from '../policy/config-shape.js';
import { CONFIG_FILE } from './config.js';

/**
 * What the config file itself writes, before defaults merge in. Init needs it to tell a written
 * choice from an inherited default; undefined when the file is absent or does not parse.
 */
export function rawConfig(root: string) {
  try {
    const value: unknown = parse(readFileSync(join(root, CONFIG_FILE), 'utf8'));
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Docs directories the config names under `doctypes`, including ones it removes with null. */
export function namedDoctypes(raw: Record<string, unknown> | undefined) {
  return new Set(raw && isRecord(raw.doctypes) ? Object.keys(raw.doctypes) : []);
}

/**
 * Docs directories whose `gitignored: true` is written in the config rather than inherited from a
 * default. Only a written choice can stop tracking documents that are already committed.
 */
export function explicitlyGitignored(raw: Record<string, unknown> | undefined) {
  const chosen = new Set<string>();
  if (!raw) return chosen;
  if (isRecord(raw.living) && raw.living.gitignored === true) chosen.add('living');
  if (!isRecord(raw.doctypes)) return chosen;
  for (const [directory, definition] of Object.entries(raw.doctypes)) {
    if (isRecord(definition) && definition.gitignored === true) chosen.add(directory);
  }
  return chosen;
}
