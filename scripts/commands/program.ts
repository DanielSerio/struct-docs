import { createCommandShell, registerCommands } from './command-shell.js';
import { run as init } from './handlers/init.js';
import { run as audit } from './handlers/audit.js';
import { run as check } from './handlers/check.js';
import { run as repair } from './handlers/repair.js';
import { run as status } from './handlers/status.js';
import type { CliOptions } from './command-types.js';

/** Only plugin composition knows its commands; the shared shell accepts injected behavior. */
export function createProgram(options: CliOptions = {}) {
  const shell = createCommandShell({ ...options, handlers: { init, audit, check, repair, status, ...options.handlers } });
  registerCommands(shell.program);
  return shell;
}
