import type { Finding } from '../policy/findings.js';
import { bodyStartLine, DEFAULT_HOUSE_STYLE_DIRS, inHouseStyleScope } from './house-style-scope.js';
import type { HouseStyleDocument } from './house-style-scope.js';

const MAX_LINE_LENGTH = 100;

/** Ported from SDLC-docs: prose lines over 100 chars outside frontmatter, fences, tables and headings. */
export function lineLengthRule(
  document: HouseStyleDocument,
  dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS,
): readonly Finding[] {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const findings: Finding[] = [];
  let inCodeBlock = false;
  for (let index = bodyStartLine(document); index < document.lines.length; index += 1) {
    const line = document.lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || trimmed.startsWith('|') || line.startsWith('#')) continue;
    if (line.length > MAX_LINE_LENGTH) {
      findings.push({
        file: document.path, line: index + 1, rule: 'line-length', severity: 'error',
        message: `line is ${line.length} characters (max ${MAX_LINE_LENGTH})`,
      });
    }
  }
  return findings;
}
