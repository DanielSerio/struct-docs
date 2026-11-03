import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detectPackageManager } from './package-json.js';
import type { PackageManager } from './package-json.js';

export type CommitGateMode = 'pre-commit' | 'check-script' | 'auto';
export type ApplyCommitGateOptions = {
  readonly approved?: boolean;
  readonly mode?: CommitGateMode;
};

/** Return the package-manager command that invokes the project's docs-lint audit gate. */
export function docsLintGateCommand(pm: PackageManager | null): string {
  if (pm === 'pnpm') return 'pnpm run docs-lint audit';
  if (pm === 'yarn') return 'yarn docs-lint audit';
  if (pm === 'bun') return 'bun run docs-lint audit';
  if (pm === 'npm') return 'npm run docs-lint -- audit';
  return 'node tools/docs-cli/index.mjs audit';
}

function checkScriptCommand(pm: PackageManager): string {
  if (pm === 'yarn') return 'yarn check';
  return `${pm} run check`;
}

function alreadyRunsDocsLint(text: string): boolean {
  return /\bdocs-lint\b|tools\/docs-cli\/index\.mjs/.test(text);
}

function appendCheckScript(rawPkg: string, gateCmd: string): { updated: string; hadCheck: boolean } {
  const parsed = JSON.parse(rawPkg) as { scripts?: Record<string, string> };
  const current = parsed.scripts?.check;
  if (typeof current !== 'string') return { updated: rawPkg, hadCheck: false };
  if (alreadyRunsDocsLint(current)) return { updated: rawPkg, hadCheck: true };
  const nextCheck = `${current} && ${gateCmd}`;
  const pattern = /("check"\s*:\s*)("(?:\\.|[^"\\])*")/;
  const updated = rawPkg.replace(pattern, (_, prefix: string) => `${prefix}${JSON.stringify(nextCheck)}`);
  return { updated, hadCheck: true };
}

function writeHookFile(hookPath: string, commandToEnsure: string, checkCmd?: string): boolean {
  mkdirSync(dirname(hookPath), { recursive: true });
  if (!existsSync(hookPath)) {
    const content = `#!/bin/sh\nset -e\n${commandToEnsure}\n`;
    writeFileSync(hookPath, content, { mode: 0o755 });
    chmodSync(hookPath, 0o755);
    return true;
  }
  const existing = readFileSync(hookPath, 'utf8');
  if (alreadyRunsDocsLint(existing)) return false;
  if (checkCmd && existing.includes(checkCmd)) return false;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const body = existing.replace(/(\r?\n)+$/, '');
  const exitMatch = /^(.*?)(\r?\nexit\s+0\s*)$/s.exec(body);
  const next = exitMatch
    ? `${exitMatch[1]}${eol}${commandToEnsure}${exitMatch[2]}${eol}`
    : `${body}${eol}${commandToEnsure}${eol}`;
  writeFileSync(hookPath, next, { mode: 0o755 });
  chmodSync(hookPath, 0o755);
  return true;
}

/** Wire the generated CLI into .git/hooks/pre-commit and/or package.json check script without double-running. */
export function applyCommitGate(root: string, options: ApplyCommitGateOptions = {}) {
  if (options.approved === false) {
    return { written: [] as string[], packageManager: null, gateCommand: null, skipped: true };
  }
  const pkgPath = join(root, 'package.json');
  const hasPkg = existsSync(pkgPath);
  const rawPkg = hasPkg ? readFileSync(pkgPath, 'utf8') : undefined;
  const pm: PackageManager | null = hasPkg ? detectPackageManager(root, rawPkg) : null;
  const gateCommand = docsLintGateCommand(pm);
  const mode = options.mode ?? 'auto';
  const written: string[] = [];
  const hookPath = join(root, '.git', 'hooks', 'pre-commit');

  if (hasPkg && rawPkg && pm && (mode === 'check-script' || mode === 'auto')) {
    const { updated, hadCheck } = appendCheckScript(rawPkg, gateCommand);
    if (hadCheck) {
      if (updated !== rawPkg) {
        writeFileSync(pkgPath, updated);
        written.push('package.json');
      }
      const checkCmd = checkScriptCommand(pm);
      if (existsSync(join(root, '.git')) && writeHookFile(hookPath, checkCmd, checkCmd)) {
        written.push('.git/hooks/pre-commit');
      }
      return { written, packageManager: pm, gateCommand, skipped: false };
    }
  }

  if (writeHookFile(hookPath, gateCommand)) {
    written.push('.git/hooks/pre-commit');
  }
  return { written, packageManager: pm, gateCommand, skipped: false };
}
