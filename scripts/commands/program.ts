import { createCommandShell } from './command-shell.js';
import { register as registerInit } from './init.js';
import { register as registerAudit } from './audit.js';
import { register as registerCheck } from './check.js';
import { register as registerRepair } from './repair.js';
import { register as registerStatus } from './status.js';
import { run as init } from './handlers/init.js';
import { run as audit } from './handlers/audit.js';
import { run as check } from './handlers/check.js';
import { run as repair } from './handlers/repair.js';
import { run as status } from './handlers/status.js';
import type { CliOptions } from './command-types.js';

/** Only plugin composition knows its commands; the shared shell accepts injected behavior. */
export function createProgram(options: CliOptions = {}) {
  const shell = createCommandShell({ ...options, handlers: { init, audit, check, repair, status, ...options.handlers } });
  registerInit(shell.program);
  registerAudit(shell.program);
  registerCheck(shell.program);
  registerRepair(shell.program);
  registerStatus(shell.program);
  return shell;
}
