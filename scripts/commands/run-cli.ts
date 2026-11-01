import type { CliOptions } from './command-types.js';
import { createProgram } from './program.js';
import { runProgram } from './run-program.js';

export const runCli = (args: readonly string[], options: CliOptions = {}) =>
  runProgram(args, () => createProgram(options), options);
