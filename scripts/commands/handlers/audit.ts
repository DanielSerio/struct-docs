import { auditProject } from '../../check/audit.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Reporting belongs to the shared command shell; audit supplies findings, never progress. */
export function run(options: CommandOptions): CommandResult {
  return { findings: auditProject(options.root).findings };
}
