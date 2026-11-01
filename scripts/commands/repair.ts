import type { CliProgram } from './command-types.js';

export function register(program: CliProgram) {
  program.command('repair').description('Repair derived values only')
    .action(async () => { await program.execute('repair'); });
}
