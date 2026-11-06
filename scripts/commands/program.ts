import { createCommandShell, registerCommands } from './command-shell.js';
import { run as init } from './handlers/init.js';
import { run as audit } from './handlers/audit.js';
import { run as check } from './handlers/check.js';
import { run as repair } from './handlers/repair.js';
import { run as status } from './handlers/status.js';
import type { CliOptions } from './command-types.js';
import { findProjectRoot } from '../read/project-root.js';

/** Only plugin composition knows its commands; the shared shell accepts injected behavior. */
export function createProgram(options: CliOptions = {}) {
  // Run from a subdirectory, the plugin still works on the adopted project above it.
  const located = options.root === undefined ? { root: findProjectRoot(process.cwd()), cwd: process.cwd() } : {};
  const handlers = { init, audit, check, repair, status, ...options.handlers };
  const shell = createCommandShell({ ...options, ...located, handlers });
  registerCommands(shell.program);
  return shell;
}
