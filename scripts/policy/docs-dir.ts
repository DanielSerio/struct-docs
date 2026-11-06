/**
 * Turn a configured docs directory into its docs-relative form, where '' is the docs root.
 * Entries may be repo-relative (`docs/specs`) or docs-relative (`specs`), so `docs`, `docs/`
 * and `.` all name the root. The reader and the rule scope share this one reading, so a
 * directory a project selects is the directory its rules cover. Returns undefined for an
 * entry that leaves docs/.
 */
export function docsRelativeDir(dir: string): string | undefined {
  const clean = dir.replaceAll('\\', '/');
  if (/^(?:[a-z]:)?\//i.test(clean)) return undefined;
  const parts = clean.split('/').filter((part) => part !== '' && part !== '.');
  if (parts[0] === 'docs') parts.shift();
  return parts.includes('..') ? undefined : parts.join('/');
}
