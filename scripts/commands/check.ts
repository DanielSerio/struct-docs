import type { CliProgram } from './command-types.js';

export function register(program: CliProgram) {
  program.command('check').description('Check one documentation file').argument('<file>')
    .action(async (file: string) => { await program.execute('check', { file }); });
}
