import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { gitHooks, inProject } from './git-hooks.js';
import { detectPackageManager } from './package-json.js';
import type { PackageManager } from './package-json.js';

export type CommitGateMode = 'pre-commit' | 'check-script' | 'auto';
export type ApplyCommitGateOptions = {
  readonly approved?: boolean;
  readonly mode?: CommitGateMode;
};

const KIT_CLI = 'tools/docs-cli/index.mjs';

/** Return the package-manager command that invokes the project's docs-lint audit gate. */
export function docsLintGateCommand(pm: PackageManager | null): string {
  if (pm === 'pnpm') return 'pnpm run docs-lint audit';
  if (pm === 'yarn') return 'yarn docs-lint audit';
  if (pm === 'bun') return 'bun run docs-lint audit';
  if (pm === 'npm') return 'npm run docs-lint -- audit';
  return `node ${KIT_CLI} audit`;
}

function checkScriptCommand(pm: PackageManager): string {
  if (pm === 'yarn') return 'yarn check';
  return `${pm} run check`;
}

/** Any package-manager form that runs a script, such as `pnpm check` or `npm run check`. */
function runsScript(text: string, name: string): boolean {
  return new RegExp(`\\b(?:npm|pnpm|yarn|bun)\\s+(?:run\\s+)?${name}(?![\\w:-])`).test(text);
}

/**
 * Only the generated CLI's own invocation counts as the gate. The word `docs-lint` alone does
 * not: an older linter may share the name (SDLC-docs runs `pnpm agents docs-lint`).
 */
function runsGate(text: string, scriptIsKit: boolean): boolean {
  return text.includes(KIT_CLI) || (scriptIsKit && runsScript(text, 'docs-lint'));
}

function appendCheckScript(rawPkg: string, current: string, gateCmd: string): string {
  const pattern = /("check"\s*:\s*)("(?:\\.|[^"\\])*")/;
  return rawPkg.replace(pattern, (_, prefix: string) => `${prefix}${JSON.stringify(`${current} && ${gateCmd}`)}`);
}

function writeHookFile(hookPath: string, command: string, gated: (text: string) => boolean): boolean {
  if (!existsSync(hookPath)) {
    mkdirSync(dirname(hookPath), { recursive: true });
    writeFileSync(hookPath, `#!/bin/sh\nset -e\n${command}\n`, { mode: 0o755 });
    chmodSync(hookPath, 0o755);
    return true;
  }
  const existing = readFileSync(hookPath, 'utf8');
  if (gated(existing)) return false;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const lines = existing.replace(/(\r?\n)+$/, '').split(/\r?\n/);
  // A trailing `exec` replaces the shell and a trailing `exit` ends it, so the gate goes first.
  const at = /^\s*(?:exec\s|exit\b)/.test(lines.at(-1) ?? '') ? lines.length - 1 : lines.length;
  lines.splice(at, 0, command);
  writeFileSync(hookPath, `${lines.join(eol)}${eol}`, { mode: 0o755 });
  chmodSync(hookPath, 0o755);
  return true;
}

/** Wire the generated CLI into the pre-commit hook git actually runs and/or the check script, without double-running. */
export function applyCommitGate(root: string, options: ApplyCommitGateOptions = {}) {
  if (options.approved === false) {
    return { written: [] as string[], packageManager: null, gateCommand: null, skipped: true };
  }
  const pkgPath = join(root, 'package.json');
  const rawPkg = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf8') : undefined;
  const scripts = rawPkg ? (JSON.parse(rawPkg) as { scripts?: Record<string, unknown> }).scripts ?? {} : {};
  const pm: PackageManager | null = rawPkg ? detectPackageManager(root, rawPkg) : null;
  // A `docs-lint` script the project already had for something else is never the gate.
  const docsLint = scripts['docs-lint'];
  const scriptIsKit = typeof docsLint === 'string' && docsLint.includes(KIT_CLI);
  const gateCommand = docsLintGateCommand(scriptIsKit ? pm : null);
  const mode = options.mode ?? 'auto';
  const written: string[] = [];
  const hooks = gitHooks(root);
  const hookPath = hooks ? join(hooks.dir, 'pre-commit') : undefined;
  const label = (path: string) => relative(root, path).split(sep).join('/');
  const check = scripts.check;

  if (rawPkg && pm && typeof check === 'string' && (mode === 'check-script' || mode === 'auto')) {
    if (!runsGate(check, scriptIsKit)) {
      writeFileSync(pkgPath, appendCheckScript(rawPkg, check, gateCommand));
      written.push('package.json');
    }
    // Outside a repository the extended check script is the whole gate.
    const gated = (text: string) => runsGate(text, scriptIsKit) || runsScript(text, 'check');
    if (hooks && hookPath && writeHookFile(hookPath, inProject(checkScriptCommand(pm), hooks.projectFromTop), gated)) {
      written.push(label(hookPath));
    }
    return { written, packageManager: pm, gateCommand, skipped: false };
  }

  // Never create `.git/hooks` by hand: outside a repository it would be a hook git never runs.
  if (!hooks || !hookPath) throw new Error('commit gate needs a git repository or a check script to extend');
  const gated = (text: string) => runsGate(text, scriptIsKit);
  if (writeHookFile(hookPath, inProject(gateCommand, hooks.projectFromTop), gated)) written.push(label(hookPath));
  return { written, packageManager: pm, gateCommand, skipped: false };
}
