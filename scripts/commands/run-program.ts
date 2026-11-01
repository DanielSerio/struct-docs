import { CommanderError } from 'commander';
import type { CliOptions } from './command-types.js';
import type { createCommandShell } from './command-shell.js';

type ShellFactory = () => ReturnType<typeof createCommandShell>;

/** Shared adapter: Commander owns usage errors; finding and execution exits stay distinct. */
export async function runProgram(args: readonly string[], create: ShellFactory, options: Pick<CliOptions, 'writeErr'> = {}) {
  const writeErr = options.writeErr ?? ((text: string) => process.stderr.write(text));
  try {
    const { program, exitCode } = create();
    await program.parseAsync([...args], { from: 'user' });
    return exitCode();
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
    const message = error instanceof Error ? error.message : String(error);
    writeErr(`docs-lint: ${message}\n`);
    return 2;
  }
}
