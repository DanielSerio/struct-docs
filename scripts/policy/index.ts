import type { Classification } from './classify.js';
import type { Config } from './config-types.js';
import type { ParsedDocument } from './document.js';

export const INDEX_OPEN = '<!-- struct-docs:index -->';
export const INDEX_CLOSE = '<!-- /struct-docs:index -->';
export type IndexEntry = { path: string; classification: Classification };
export type IndexInput = { config: Config; documents: readonly ParsedDocument[]; entries: readonly IndexEntry[] };

/** Directory policy applies to nested/unrouted files too: local files never enter the index. */
export function indexable(entry: IndexEntry, config: Config) {
  const directory = entry.path.split('/')[0] ?? '';
  if (directory === 'living' || directory === 'templates') return false;
  if (Object.hasOwn(config.doctypes, directory) && config.doctypes[directory]?.gitignored) return false;
  const kind = entry.classification;
  return kind.cls === 'roadmap' || (kind.cls === 'live' && !kind.gitignored) ||
    (kind.cls === 'ungoverned' && !kind.excluded);
}

export const needsIndex = (input: IndexInput, existing: string | null) =>
  existing !== null || input.entries.some((entry) => indexable(entry, input.config));
