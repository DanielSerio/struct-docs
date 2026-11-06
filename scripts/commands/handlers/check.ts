import { classify } from '../../policy/classify.js';
import { filingRule } from '../../check/document-filing.js';
import { checkedDocsPath } from '../../read/checked-file.js';
import { loadConfig } from '../../read/config.js';
import { readDocument } from '../../read/document.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Check one path only: whole-tree schema/reference/ownership checks belong to audit. */
export function run(options: CommandOptions): CommandResult {
  const { config, findings } = loadConfig(options.root);
  if (!config) return { findings };
  if (!options.file) throw new Error('check requires a file path');
  const normalized = checkedDocsPath(options.root, options.file);
  if (normalized === undefined) return { findings: [] };
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
