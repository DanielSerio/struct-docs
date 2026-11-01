import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { classify } from '../policy/classify.js';
import type { Classification } from '../policy/classify.js';
import type { Config } from '../policy/config-types.js';
import type { DocumentContext, ParsedDocument } from '../policy/document.js';
import { parseFrontmatter } from './frontmatter.js';

/** Pure document construction also lets rule tests use plain source objects. */
export function parseDocument<Context extends DocumentContext = DocumentContext>(
  path: string, source: string, classification: Classification, context?: Readonly<Context>): ParsedDocument<Context> {
  return {
    path, source, lines: source.split(/\r?\n/), frontmatter: parseFrontmatter(source),
    classification, ...(context ? { context } : {}),
  };
}

/** Read exactly one governed file; excluded prose is never opened by the reader. */
export function readDocument(root: string, path: string, config: Config): ParsedDocument | undefined {
  const docs = resolve(root, 'docs');
  const absolute = resolve(docs, path.replaceAll('\\', '/'));
  const local = relative(docs, absolute);
  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
    throw new Error('document path must stay inside docs/');
  }
  const normalized = local.split(sep).join('/');
  const classification = classify(normalized, config);
  if (classification.cls !== 'live' && classification.cls !== 'roadmap') return undefined;
  try {
    if (lstatSync(docs).isSymbolicLink()) throw new Error('docs/ must not be a symbolic link');
    const realLocal = relative(realpathSync(docs), realpathSync(absolute));
    if (isAbsolute(realLocal) || realLocal === '..' || realLocal.startsWith(`..${sep}`)) {
      throw new Error('document path must stay inside docs/');
    }
    return parseDocument(normalized, readFileSync(absolute, 'utf8'), classification, { config });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}
