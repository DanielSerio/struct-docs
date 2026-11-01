import type { Finding } from './findings.js';

const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

/** Lexical ordering is independent of the machine's locale and leaves inputs untouched. */
export function sortFindings(findings: readonly Finding[]) {
  return [...findings].sort((left, right) => compareText(left.file, right.file) ||
    left.line - right.line || compareText(left.rule, right.rule) ||
    compareText(left.message, right.message) || compareText(left.severity, right.severity));
}
