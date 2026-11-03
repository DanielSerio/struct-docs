import type { Finding } from '../policy/findings.js';
import { bodyStartLine, DEFAULT_HOUSE_STYLE_DIRS, inHouseStyleScope } from './house-style-scope.js';
import type { HouseStyleDocument } from './house-style-scope.js';

const STALE_PATTERNS = [
  { regex: /first milestone/i, label: 'first milestone' },
  { regex: /decided later/i, label: 'decided later' },
  { regex: /added here later/i, label: 'added here later' },
  { regex: /\bTBD\b/, label: 'TBD' },
  { regex: /\bTODO\b/, label: 'TODO' },
] as const;

/** Ported from SDLC-docs: flag deferred-work phrases outside code fences and the rule's own description. */
export function stalePointerRule(
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
    if (inCodeBlock || line.includes('stale-pointer')) continue;
    for (const pattern of STALE_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          file: document.path, line: index + 1, rule: 'stale-pointer', severity: 'error',
          message: `defers to later work ("${pattern.label}")`,
        });
      }
    }
  }
  return findings;
}
