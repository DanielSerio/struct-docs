import type { CliProgram } from './command-types.js';

export function register(program: CliProgram) {
  program.command('init').description('Survey documentation, applying only when requested')
    .option('--apply', 'Apply a safe initialization plan')
    .action(async (options: { apply?: boolean }) => { await program.execute('init', options); });
}
