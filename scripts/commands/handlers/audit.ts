import { auditProject } from '../../check/audit.js';
import { applyRepairs } from '../../repair/apply.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Reporting belongs to the shared shell, and only the repair layer mutates derived docs. */
export function run(options: CommandOptions): CommandResult {
  const result = auditProject(options.root);
  if (options.fix && result.ok) applyRepairs(result.tree, result.findings);
  return { findings: result.findings };
}
