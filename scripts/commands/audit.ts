import type { CliProgram } from './command-types.js';

export function register(program: CliProgram) {
  program.command('audit').description('Check documentation structure')
    .option('--fix', 'Repair derived values').option('--verbose', 'List warning details')
    .action(async (options: { fix?: boolean; verbose?: boolean }) => {
      await program.execute('audit', options);
    });
}
