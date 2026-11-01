import { Command } from 'commander';
import { findingsExitCode, formatReport } from '../render/report.js';
import type { CliOptions, CliProgram, CommandHandlers, CommandName, CommandOptions } from './command-types.js';

/** Shared setup takes behavior as data; copied project CLIs never import plugin handlers. */
export function createCommandShell(options: CliOptions & { handlers: CommandHandlers }) {
  const writeOut = options.writeOut ?? ((text: string) => process.stdout.write(text));
  const writeErr = options.writeErr ?? ((text: string) => process.stderr.write(text));
  let exitCode = 0;
  const program: CliProgram = Object.assign(new Command(), {
    async execute(name: CommandName, flags: Omit<CommandOptions, 'root'> = {}) {
      const result = await options.handlers[name]({ ...flags, root: options.root ?? process.cwd() });
      if (result.stdout) writeOut(result.stdout);
      const report = formatReport(result.findings, flags);
      if (report) writeOut(report);
      exitCode = findingsExitCode(result.findings);
    },
  });
  program.name('docs-lint').description('Validate documentation structure')
    .showHelpAfterError().allowExcessArguments(false).exitOverride()
    .configureOutput({ writeOut, writeErr });
  return { program, exitCode: () => exitCode };
}
