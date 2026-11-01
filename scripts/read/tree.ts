import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClassifier } from '../policy/classify.js';
import type { Config } from '../policy/config-types.js';
import type { ParsedDocument } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';
import { parseDocument } from './document.js';
import { listDocFiles } from './files.js';

/** One file inventory and one parse per governed file, shared by every whole-tree rule. */
export function loadTree(root: string, config: Config) {
  const files = listDocFiles(root);
  const classifier = createClassifier(config);
  const entries = files.map((path) => ({ path, classification: classifier.classify(path) }));
  const documents: ParsedDocument[] = [];
  const findings: Finding[] = [];
  const context = { config, files: new Set(files) };
  for (const { path, classification } of entries) {
    if (classification.cls !== 'live' && classification.cls !== 'roadmap') continue;
    const source = readFileSync(resolve(root, 'docs', path), 'utf8');
    const document = parseDocument(path, source, classification, context);
    documents.push(document);
    findings.push(...(document.roadmap?.findings ?? []).map(({ line, message }): Finding => ({
      file: path, line, rule: 'roadmap-body', severity: 'error', message,
    })));
    if (!document.frontmatter.ok) findings.push({
      file: path, line: document.frontmatter.line, rule: 'frontmatter', severity: 'error',
      message: `frontmatter: ${document.frontmatter.reason}`,
    });
  }
  return { root: resolve(root), docsDir: resolve(root, 'docs'), config, files, entries, documents, findings };
}
