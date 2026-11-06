import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import type { ParsedDocument } from '../policy/document.js';
import { docsRelativeDir } from '../policy/docs-dir.js';
import type { Finding } from '../policy/findings.js';
import { isWithin } from './containment.js';
import { parseFrontmatter } from './frontmatter.js';

// The copied project CLI reaches every read helper through this one emitted module.
export { checkedDocsPath } from './checked-file.js';

export type ProjectDocument = Pick<ParsedDocument, 'path' | 'source' | 'lines' | 'frontmatter'>;

/** Pure document parse shared by the bundle and the copied project CLI reader. */
export function parseProjectDocument(path: string, source: string): ProjectDocument {
  return {
    path,
    source,
    lines: source.split(/\r?\n/),
    frontmatter: parseFrontmatter(source),
  };
}

/** Format frontmatter parse failures identically in the bundle and copied project CLIs. */
export function frontmatterFindings(document: ProjectDocument): readonly Finding[] {
  if (document.frontmatter.ok) return [];
  return [{
    file: document.path,
    line: document.frontmatter.line,
    rule: 'frontmatter',
    severity: 'error',
    message: `frontmatter: ${document.frontmatter.reason}`,
  }];
}

/** Validate docs/ containment and symlink safety before opening a file. */
export function readDocsSource(root: string, path: string): { path: string; source: string } | undefined {
  const docs = resolve(root, 'docs');
  const clean = path.replaceAll('\\', '/').replace(/^\.\//, '');
  const rel = clean.startsWith('docs/') ? clean.slice(5) : clean;
  const absolute = resolve(docs, rel);
  const local = relative(docs, absolute);
  if (!isWithin(local)) throw new Error('document path must stay inside docs/');
  const normalized = local.split(sep).join('/');
  try {
    if (lstatSync(docs).isSymbolicLink()) throw new Error('docs/ must not be a symbolic link');
    if (!isWithin(relative(realpathSync(docs), realpathSync(absolute)))) {
      throw new Error('document path must stay inside docs/');
    }
    return { path: normalized, source: readFileSync(absolute, 'utf8') };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Read one document under docs/ without requiring config or YAML dependencies. */
export function readProjectDocument(root: string, path: string): ProjectDocument | undefined {
  const raw = readDocsSource(root, path);
  return raw ? parseProjectDocument(raw.path, raw.source) : undefined;
}

/** Read immediate Markdown files in the project-configured docs directories. */
export function readProjectDocuments(
  root: string,
  dirs: readonly string[] = ['docs/specs'],
): readonly ProjectDocument[] {
  const docs = resolve(root, 'docs');
  if (!existsSync(docs)) return [];
  const documents: ProjectDocument[] = [];
  for (const dir of dirs) {
    const relDir = docsRelativeDir(dir);
    if (relDir === undefined) throw new Error(`docs directory must stay inside docs/: ${dir}`);
    const absDir = resolve(docs, relDir);
    if (!existsSync(absDir)) continue;
    const files = readdirSync(absDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    for (const name of files) {
      const doc = readProjectDocument(root, relDir ? `${relDir}/${name}` : name);
      if (doc) documents.push(doc);
    }
  }
  return documents;
}
