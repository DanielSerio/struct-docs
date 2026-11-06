import { Command } from 'commander';
import { resolve } from 'node:path';
import { findingsExitCode, formatReport } from '../render/report.js';
import { register as registerAudit } from './audit.js';
import { register as registerCheck } from './check.js';
import type { CliOptions, CliProgram, CommandHandlers, CommandName, CommandOptions } from './command-types.js';
import { register as registerInit } from './init.js';
import { register as registerRepair } from './repair.js';
import { runProgram } from './run-program.js';
import { register as registerStatus } from './status.js';

export { runProgram };

/** Register the five standard docs-lint commands on any shared shell program. */
export function registerCommands(program: CliProgram) {
  registerInit(program);
  registerAudit(program);
  registerCheck(program);
  registerRepair(program);
  registerStatus(program);
}

/** Shared setup takes behavior as data; copied project CLIs never import plugin handlers. */
export function createCommandShell(options: CliOptions & { handlers: CommandHandlers }) {
  const writeOut = options.writeOut ?? ((text: string) => process.stdout.write(text));
  const writeErr = options.writeErr ?? ((text: string) => process.stderr.write(text));
  let exitCode = 0;
  const root = options.root ?? process.cwd();
  const cwd = options.cwd ?? root;
  const program: CliProgram = Object.assign(new Command(), {
    async execute(name: CommandName, flags: Omit<CommandOptions, 'root'> = {}) {
      // File arguments name what the user sees from where they ran, even when the root is above.
      const file = flags.file === undefined ? {} : { file: resolve(cwd, flags.file.replaceAll('\\', '/')) };
      const result = await options.handlers[name]({ ...flags, ...file, root });
      if (result.stdout) writeOut(result.stdout);
      const report = formatReport(result.findings, flags);
      if (report) writeOut(report);
      exitCode = Math.max(result.exitCode ?? 0, findingsExitCode(result.findings));
    },
  });
  program.name('docs-lint').description('Validate documentation structure')
    .showHelpAfterError().allowExcessArguments(false).exitOverride()
    .configureOutput({ writeOut, writeErr });
  return { program, exitCode: () => exitCode };
}
