import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ParsedDocument } from '../policy/document.js';
import type { Finding } from '../policy/findings.js';

/** A stale audit never gets permission to overwrite concurrent authored changes. */
export function repairStatusFields(root: string, documents: readonly ParsedDocument[], findings: readonly Finding[]) {
  let applied = 0;
  for (const document of documents) {
    const repairs = findings.filter((finding) => finding.file === document.path &&
      finding.severity === 'repairable' && finding.repair.field === 'status' && !finding.repair.withheld);
    if (!repairs.length) continue;
    const path = resolve(root, 'docs', document.path);
    let current: string;
    try {
      if (!lstatSync(path).isFile()) continue;
      current = readFileSync(path, 'utf8');
    }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    if (current !== document.source) continue;
    const parts = current.split(/(\r?\n)/);
    let count = 0;
    for (const finding of repairs) {
      if (finding.severity !== 'repairable') continue;
      const { location, actual, expected } = finding.repair;
      if (!location) continue;
      const index = (location.line - 1) * 2;
      const line = parts[index];
      if (line === undefined || line.slice(location.start, location.end) !== actual) continue;
      parts[index] = line.slice(0, location.start) + expected + line.slice(location.end);
      finding.repair.applied = true; count += 1;
    }
    if (count) writeFileSync(path, parts.join(''));
    applied += count;
  }
  return applied;
}
