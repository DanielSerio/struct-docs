import type { Finding } from '../policy/findings.js';
import { bodyStartLine, DEFAULT_HOUSE_STYLE_DIRS, inHouseStyleScope } from './house-style-scope.js';
import type { HouseStyleDocument } from './house-style-scope.js';

/** Ported from SDLC-docs: every Markdown heading outside code fences must be followed by a blank line. */
export function headingGapRule(
  document: HouseStyleDocument,
  dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS,
): readonly Finding[] {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const findings: Finding[] = [];
  let inCodeBlock = false;
  for (let index = bodyStartLine(document); index < document.lines.length; index += 1) {
    const line = document.lines[index] ?? '';
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.startsWith('#') && index < document.lines.length - 1 && (document.lines[index + 1] ?? '').trim() !== '') {
      findings.push({
        file: document.path, line: index + 1, rule: 'heading-gap', severity: 'error',
        message: 'heading must be followed by a blank line',
      });
    }
  }
  return findings;
}
