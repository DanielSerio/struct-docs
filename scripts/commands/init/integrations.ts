import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { docsRelativeDir } from '../../policy/docs-dir.js';
import type { CommandOptions } from '../command-types.js';
import { applyCommitGate } from './commit-gate.js';
import type { CommitGateMode } from './commit-gate.js';
import { ALL_HOUSE_STYLE_RULES, applyProjectCli } from './project-cli.js';
import type { HouseStyleRuleName } from './project-cli.js';

const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const isRule = (name: string): name is HouseStyleRuleName =>
  (ALL_HOUSE_STYLE_RULES as readonly string[]).includes(name);

/** Reject bad integration flags before init writes anything. */
export function validateIntegrations(options: CommandOptions) {
  if ((options.projectCli || options.commitGate) && !options.apply) {
    throw new Error('--project-cli and --commit-gate require --apply');
  }
  if (options.docsDirs && !options.projectCli) throw new Error('--docs-dirs requires --project-cli');
  const outside = list(options.docsDirs ?? '').filter((dir) => docsRelativeDir(dir) === undefined);
  if (outside.length) throw new Error(`--docs-dirs must name directories inside docs/: ${outside.join(', ')}`);
  const unknown = list(options.projectCli ?? '').filter((name) => !isRule(name));
  if (unknown.length) {
    throw new Error(`unknown house-style rule: ${unknown.join(', ')} (choose from ${ALL_HOUSE_STYLE_RULES.join(', ')})`);
  }
  if (options.projectCli !== undefined && !list(options.projectCli).length) {
    throw new Error('--project-cli needs at least one rule');
  }
  const hasCli = options.projectCli || existsSync(join(options.root, 'tools', 'docs-cli', 'index.mjs'));
  if (options.commitGate && !hasCli) throw new Error('--commit-gate needs the project CLI; pass --project-cli');
}

/** Apply the approved project CLI and commit gate, returning one report line per change. */
export function applyIntegrations(options: CommandOptions): string[] {
  const lines: string[] = [];
  if (options.projectCli) {
    const cli = applyProjectCli(options.root, {
      rules: list(options.projectCli).filter(isRule),
      ...(options.docsDirs ? { dirs: list(options.docsDirs) } : {}),
    });
    lines.push(...cli.written.map((path) => `wrote ${path}`), `install: ${cli.installCommand.join(' ')}`);
  }
  if (options.commitGate) {
    const gate = applyCommitGate(options.root, { mode: options.commitGate as CommitGateMode });
    lines.push(...gate.written.map((path) => `wrote ${path}`));
  }
  return lines;
}
