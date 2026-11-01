import type { CommandOptions } from '../command-types.js';
import { pendingCommand } from './pending.js';

export const run = (options: CommandOptions) => pendingCommand('init', options);
