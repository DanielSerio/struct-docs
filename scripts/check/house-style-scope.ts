import type { ParsedDocument } from '../policy/document.js';
import { docsRelativeDir } from '../policy/docs-dir.js';

export type HouseStyleDocument = Pick<ParsedDocument, 'path' | 'source' | 'lines' | 'frontmatter'>;
export const DEFAULT_HOUSE_STYLE_DIRS: readonly string[] = ['docs/specs'];

/** Match immediate Markdown files under the configured directories (docs-relative or repo-relative). */
export function inHouseStyleScope(path: string, dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS): boolean {
  const normalized = path.replaceAll('\\', '/');
  if (!/\.md$/i.test(normalized)) return false;
  // A root file has no slash; its parent is the docs root, which reads as ''.
  const parent = docsRelativeDir(normalized.slice(0, Math.max(normalized.lastIndexOf('/'), 0)));
  return parent !== undefined && dirs.some((dir) => docsRelativeDir(dir) === parent);
}

/** Use parsed frontmatter endLine when available, or skip a raw leading YAML fence block. */
export function bodyStartLine(document: HouseStyleDocument): number {
  if (document.frontmatter.ok) return document.frontmatter.endLine;
  if (document.lines[0]?.trim() !== '---') return 0;
  const closing = document.lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  return closing === -1 ? document.lines.length : closing + 1;
}
