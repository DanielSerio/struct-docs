import type { Finding } from '../policy/findings.js';
import type { IndexInput } from '../policy/index.js';
import { needsIndex } from '../policy/index.js';
import { inspectIndex, spliceIndex } from '../render/index-block.js';
import { buildIndex } from '../render/readme.js';

/** Index absence is only meaningful for an adopted or shared/indexable documentation tree. */
export function indexFindings(input: IndexInput, existing: string | null): Finding[] {
  if (!needsIndex(input, existing)) return [];
  const state = inspectIndex(existing ?? '');
  if (!state.ok) return [{ file: 'README.md', line: 1, rule: 'index', severity: 'error', message: state.message }];
  const expected = spliceIndex(existing, buildIndex(input));
  if (expected === existing) return [];
  return [{ file: 'README.md', line: 1, rule: 'index', severity: 'repairable',
    message: 'index is stale, should be regenerated',
    repair: { field: 'index', actual: existing ?? undefined, expected } }];
}
