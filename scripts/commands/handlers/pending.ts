import { loadConfig } from '../../read/config.js';
import type { CommandName, CommandOptions, CommandResult } from '../command-types.js';

/** Config diagnostics are already usable; unfinished work must never claim a clean audit. */
export function pendingCommand(name: CommandName, options: CommandOptions): CommandResult {
  const { findings } = loadConfig(options.root);
  if (findings.length) return { findings };
  throw new Error(`${name} is not implemented yet`);
}
