import { isAbsolute, relative, resolve, sep } from 'node:path';
import { classify } from '../policy/classify.js';
import type { Classification } from '../policy/classify.js';
import type { Config } from '../policy/config-types.js';
import type { DocumentContext, ParsedDocument } from '../policy/document.js';
import { parseProjectDocument, readDocsSource } from './project-document.js';
import { parseBody } from './roadmap-body.js';

/** Pure document construction also lets rule tests use plain source objects. */
export function parseDocument<Context extends DocumentContext = DocumentContext>(
  path: string, source: string, classification: Classification, context?: Readonly<Context>): ParsedDocument<Context> {
  const base = parseProjectDocument(path, source);
  const roadmap = classification.cls === 'roadmap' && base.frontmatter.ok
    ? parseBody(source, base.frontmatter.endLine)
    : undefined;
  return {
    ...base,
    ...(roadmap ? { roadmap } : {}),
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
  const raw = readDocsSource(root, normalized);
  return raw ? parseDocument(raw.path, raw.source, classification, { config }) : undefined;
}
