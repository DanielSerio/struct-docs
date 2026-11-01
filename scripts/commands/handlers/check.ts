import { lstatSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { classify } from '../../policy/classify.js';
import { filingRule } from '../../check/document-filing.js';
import { loadConfig } from '../../read/config.js';
import { readDocument } from '../../read/document.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Check one path only: whole-tree schema/reference/ownership checks belong to audit. */
export function run(options: CommandOptions): CommandResult {
  const { config, findings } = loadConfig(options.root);
  if (!config) return { findings };
  if (!options.file) throw new Error('check requires a file path');
  const path = relative(resolve(options.root, 'docs'), resolve(options.root, options.file.replaceAll('\\', '/')));
  if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) return { findings: [] };
  const normalized = path.split(sep).join('/');
  try {
    const file = lstatSync(resolve(options.root, 'docs', normalized));
    if (file.isDirectory()) throw new Error('check requires a file, not a directory');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return { findings: [] };
    throw error;
  }
  const classification = classify(normalized, config);
  if (classification.cls === 'forbidden') return { findings: [{
    file: normalized, line: 1, rule: 'filing', severity: 'error', message: classification.reason,
  }] };
  const document = readDocument(options.root, normalized, config);
  if (!document) return { findings: [] };
  if (!document.frontmatter.ok) return { findings: [{
    file: document.path, line: document.frontmatter.line, rule: 'frontmatter', severity: 'error',
    message: `frontmatter: ${document.frontmatter.reason}`,
  }] };
  return { findings: filingRule(document) };
}
