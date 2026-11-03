import type { ParsedDocument } from '../policy/document.js';

export type HouseStyleDocument = Pick<ParsedDocument, 'path' | 'source' | 'lines' | 'frontmatter'>;
export const DEFAULT_HOUSE_STYLE_DIRS: readonly string[] = ['docs/specs'];

/** Match immediate Markdown files under the configured directories (docs-relative or repo-relative). */
export function inHouseStyleScope(path: string, dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!/\.md$/i.test(normalized) || !normalized.includes('/')) return false;
  const parent = normalized.slice(0, normalized.lastIndexOf('/'));
  return dirs.some((dir) => {
    const clean = dir.replaceAll('\\', '/').replace(/\/+$/, '');
    return parent === clean || (clean.startsWith('docs/') && parent === clean.slice(5));
  });
}

/** Use parsed frontmatter endLine when available, or skip a raw leading YAML fence block. */
export function bodyStartLine(document: HouseStyleDocument): number {
  if (document.frontmatter.ok) return document.frontmatter.endLine;
  if (document.lines[0]?.trim() !== '---') return 0;
  const closing = document.lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  return closing === -1 ? document.lines.length : closing + 1;
}
