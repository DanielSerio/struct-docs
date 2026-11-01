import { runCli } from '../../scripts/commands/run-cli.js';
import type { CommandHandler } from '../../scripts/commands/command-types.js';

// Process-only fixture tests the adapter without pretending unfinished production checks exist.
const mode = process.argv[2];
const audit: CommandHandler = () => {
  if (mode === 'failure') throw new Error('fixture execution failure');
  if (mode === 'clean') return { findings: [] };
  const details = { file: 'specs/a.md', line: 7, rule: 'fixture', message: 'fixture finding' };
  if (mode === 'warning') return { findings: [{ ...details, severity: 'warning' }] };
  if (mode === 'repairable') return { findings: [{ ...details, severity: 'repairable',
    repair: { field: 'status', actual: 'todo', expected: 'done' } }] };
  return { findings: [{ ...details, severity: 'error' }] };
};
process.exitCode = await runCli(process.argv.slice(3), { handlers: { audit } });
