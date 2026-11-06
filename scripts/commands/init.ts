import { Option } from 'commander';
import type { CliProgram, CommandOptions } from './command-types.js';

type InitFlags = Pick<CommandOptions, 'apply' | 'projectCli' | 'docsDirs' | 'commitGate'>;

export function register(program: CliProgram) {
  program.command('init').description('Survey documentation, applying only when requested')
    .option('--apply', 'Apply a safe initialization plan')
    .option('--project-cli <rules>', 'With --apply, write tools/docs-cli/ with these comma-separated house-style rules')
    .option('--docs-dirs <dirs>', 'Comma-separated directories the project CLI rules cover (default docs/specs)')
    .addOption(new Option('--commit-gate <mode>', 'With --apply, run the project CLI on every commit')
      .choices(['auto', 'pre-commit', 'check-script']))
    .action(async (options: InitFlags) => { await program.execute('init', options); });
}
