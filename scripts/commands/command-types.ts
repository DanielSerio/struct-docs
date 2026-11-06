import type { Command } from 'commander';
import type { Finding } from '../policy/findings.js';

export type CommandName = 'init' | 'audit' | 'check' | 'repair' | 'status';
export type CommandOptions = {
  root: string;
  file?: string;
  apply?: boolean;
  projectCli?: string;
  docsDirs?: string;
  commitGate?: string;
  fix?: boolean;
  verbose?: boolean;
};
export type CommandResult = { findings: readonly Finding[]; stdout?: string; exitCode?: number };
export type CommandHandler = (options: CommandOptions) => CommandResult | Promise<CommandResult>;
export type CommandHandlers = Record<CommandName, CommandHandler>;
export type CliProgram = Command & {
  execute: (name: CommandName, options?: Omit<CommandOptions, 'root'>) => Promise<void>;
};
export type CliOptions = {
  root?: string;
  /** Where relative file arguments start; defaults to the root. */
  cwd?: string;
  handlers?: Partial<CommandHandlers>;
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
};
