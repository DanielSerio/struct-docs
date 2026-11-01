import type { Command } from 'commander';
import type { Finding } from '../policy/findings.js';

export type CommandName = 'init' | 'audit' | 'check' | 'repair';
export type CommandOptions = {
  root: string;
  file?: string;
  apply?: boolean;
  fix?: boolean;
  verbose?: boolean;
};
export type CommandResult = { findings: readonly Finding[]; stdout?: string };
export type CommandHandler = (options: CommandOptions) => CommandResult | Promise<CommandResult>;
export type CommandHandlers = Record<CommandName, CommandHandler>;
export type CliProgram = Command & {
  execute: (name: CommandName, options?: Omit<CommandOptions, 'root'>) => Promise<void>;
};
export type CliOptions = {
  root?: string;
  handlers?: Partial<CommandHandlers>;
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
};
