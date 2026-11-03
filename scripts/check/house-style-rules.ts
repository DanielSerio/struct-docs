import type { Finding } from '../policy/findings.js';
import { fileSizeRule } from './file-size-rule.js';
import { headingGapRule } from './heading-gap-rule.js';
import { DEFAULT_HOUSE_STYLE_DIRS } from './house-style-scope.js';
import type { HouseStyleDocument } from './house-style-scope.js';
import { lineLengthRule } from './line-length-rule.js';
import { stalePointerRule } from './stale-pointer-rule.js';

export { DEFAULT_HOUSE_STYLE_DIRS, fileSizeRule, headingGapRule, lineLengthRule, stalePointerRule };
export type { HouseStyleDocument };

export const HOUSE_STYLE_RULES = {
  'line-length': lineLengthRule,
  'heading-gap': headingGapRule,
  'stale-pointer': stalePointerRule,
  'file-size': fileSizeRule,
} as const;

/** Run all four house-style rules in SDLC-docs order on one parsed document. */
export function houseStyleRule(
  document: HouseStyleDocument,
  dirs: readonly string[] = DEFAULT_HOUSE_STYLE_DIRS,
): readonly Finding[] {
  return [
    ...fileSizeRule(document, dirs),
    ...headingGapRule(document, dirs),
    ...stalePointerRule(document, dirs),
    ...lineLengthRule(document, dirs),
  ];
}
