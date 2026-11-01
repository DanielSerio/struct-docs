import type { Finding } from '../policy/findings.js';

const line = (finding: Finding) => `${finding.file}:${finding.line} - ${finding.message}`;
const repairLabel = (finding: Finding) => {
  if (finding.severity !== 'repairable') return '';
  if (finding.repair.applied) return 'repaired';
  if (finding.repair.withheld) return "withheld until this roadmap's errors are fixed";
  return 'repairable with --fix';
};

/** Ported from manage-docs: successful checks cost no output; warnings are opt-in detail. */
export function formatReport(findings: readonly Finding[], options: { verbose?: boolean } = {}) {
  const errors = findings.filter((finding) => finding.severity === 'error');
  const repairs = findings.filter((finding) => finding.severity === 'repairable');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const output = errors.map(line);
  output.push(...repairs.map((finding) => `${line(finding)} (${repairLabel(finding)})`));
  if (options.verbose) output.push(...warnings.map(line));
  else if (warnings.length) {
    output.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'} (--verbose to list)`);
  }
  return output.length ? `${output.join('\n')}\n` : '';
}

export const findingsExitCode = (findings: readonly Finding[]) =>
  findings.some((finding) => finding.severity === 'error') ? 1 : 0;
