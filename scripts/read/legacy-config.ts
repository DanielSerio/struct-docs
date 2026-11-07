import { readProjectFile } from './project-file.js';

export type LegacyIgnore = { pattern: string; reason: readonly string[] };

/**
 * Read manage-docs' `docs/.doctypes` (`directory: type` lines) and `docs/.docsignore` (one
 * pattern per line, with the comment lines above a pattern kept as its reason).
 */
export function readLegacyConfig(root: string) {
  const text = (path: string) => readProjectFile(root, path)?.toString('utf8') ?? '';
  const doctypes: [string, string][] = [];
  for (const line of text('docs/.doctypes').split(/\r?\n/).map((raw) => raw.trim())) {
    if (!line || line.startsWith('#')) continue;
    const [directory = '', type = '', ...rest] = line.split(':').map((part) => part.trim());
    if (directory && type && !rest.length) doctypes.push([directory, type]);
  }
  const ignore: LegacyIgnore[] = [];
  let reason: string[] = [];
  for (const line of text('docs/.docsignore').split(/\r?\n/).map((raw) => raw.trim())) {
    if (line.startsWith('#')) reason.push(line.replace(/^#\s?/, ''));
    else if (line) {
      ignore.push({ pattern: line, reason });
      reason = [];
    }
  }
  return { doctypes, ignore };
}
