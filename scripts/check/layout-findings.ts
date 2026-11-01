import type { Classification } from '../policy/classify.js';
import type { Finding } from '../policy/findings.js';

type Entry = { path: string; classification: Classification };

/** Classifier results already own root errors; unrouted paths need one decision per directory. */
export function layoutFindings(entries: readonly Entry[]): Finding[] {
  const findings: Finding[] = [];
  const unrouted = new Map<string, number>();
  for (const { path, classification } of entries) {
    if (classification.cls === 'forbidden') findings.push({
      file: path, line: 1, rule: 'layout', severity: 'error', message: classification.reason,
    });
    if (classification.cls === 'ungoverned' && !classification.excluded) {
      const directory = path.split('/')[0] ?? '';
      unrouted.set(directory, (unrouted.get(directory) ?? 0) + 1);
    }
  }
  for (const [directory, count] of unrouted) {
    const remedy = directory === 'decisions' ? '`fold` merges legacy decision records into their owners'
      : '`init` proposes a doctype or exclusion';
    findings.push({ file: `${directory}/`, line: 1, rule: 'unrouted', severity: 'warning',
      message: `${count} unrouted document${count === 1 ? '' : 's'} in \`${directory}/\`; ${remedy}` });
  }
  return findings;
}
