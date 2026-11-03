import type { Finding } from '../policy/findings.js';
import { DEFAULT_HOUSE_STYLE_DIRS, inHouseStyleScope } from './house-style-scope.js';
import type { HouseStyleDocument } from './house-style-scope.js';

const FILE_SIZE_LIMIT_MB = 0.05;
const BYTES_PER_MB = 1_000_000;

/** Ported from SDLC-docs with spec-size renamed to file-size: warn over 50,000 UTF-8 bytes with no line cap. */
export function fileSizeRule(
  document: HouseStyleDocument,
  dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS,
): readonly Finding[] {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const sizeMb = Buffer.byteLength(document.source, 'utf8') / BYTES_PER_MB;
  if (sizeMb <= FILE_SIZE_LIMIT_MB) return [];
  return [{
    file: document.path, line: 1, rule: 'file-size', severity: 'warning',
    message: `${sizeMb.toFixed(3)} MB, over the ${FILE_SIZE_LIMIT_MB} MB guide; split it by topic`,
  }];
}
