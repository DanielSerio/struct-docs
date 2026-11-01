import type { Config } from './config-types.js';
import type { DocumentContext } from './document.js';

export type ReferenceContext = DocumentContext & {
  readonly referenceTargets: ReadonlyMap<string, string>;
};

/** Prepare existence once from the reader's file inventory, without opening target prose. */
export function createReferenceContext(config: Config, files: Iterable<string>): ReferenceContext {
  const paths = [...files].map((path) => path.replaceAll('\\', '/'));
  const referenceTargets = new Map<string, string>();
  for (const path of paths) {
    if (/\.md$/i.test(path)) referenceTargets.set(path.replace(/\.md$/i, ''), path);
  }
  return { config, files: new Set(paths), referenceTargets };
}

/** Local-only status belongs to directory policy, not to files present on this machine. */
export function isLocalOnlyReference(reference: string, config: Config) {
  const directory = reference.split('/')[0] ?? '';
  if (directory === 'living') return config.living.gitignored;
  return Object.hasOwn(config.doctypes, directory) && config.doctypes[directory]?.gitignored === true;
}
