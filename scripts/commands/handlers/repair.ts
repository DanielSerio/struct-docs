import { auditProject } from '../../check/audit.js';
import { applyRepairs } from '../../repair/apply.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Maintenance is silent: structural errors only withhold unsafe writes, never become an audit. */
export function run(options: CommandOptions): CommandResult {
  const result = auditProject(options.root);
  if (!result.ok) return { findings: result.findings };
  applyRepairs(result.tree, result.findings);
  return { findings: [] };
}
