import type { CliProgram } from './command-types.js';

export function register(program: CliProgram) {
  program.command('status').description('Show roadmap progress and the next ready leaf').argument('[file]')
    .action(async (file?: string) => { await program.execute('status', file === undefined ? {} : { file }); });
}
