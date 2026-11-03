import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export const COMMANDER_VERSION = '^14.0.3';
export const DOCS_LINT_SCRIPT = 'node tools/docs-cli/index.mjs';

/** Detect the project's package manager from packageManager metadata or lockfiles. */
export function detectPackageManager(root: string, rawPackageJson?: string): PackageManager {
  if (rawPackageJson) {
    try {
      const parsed = JSON.parse(rawPackageJson) as { packageManager?: unknown };
      if (typeof parsed.packageManager === 'string') {
        const prefix = parsed.packageManager.split('@')[0]?.trim();
        if (prefix === 'pnpm' || prefix === 'yarn' || prefix === 'bun' || prefix === 'npm') return prefix;
      }
    } catch {
      // Fall through to lockfile check.
    }
  }
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

/** Build the package-manager command to add Commander as a development dependency. */
export function commanderInstallArgs(pm: PackageManager): { command: PackageManager; args: readonly string[] } {
  if (pm === 'pnpm') return { command: 'pnpm', args: ['add', '-D', `commander@${COMMANDER_VERSION}`] };
  if (pm === 'yarn') return { command: 'yarn', args: ['add', '--dev', `commander@${COMMANDER_VERSION}`] };
  if (pm === 'bun') return { command: 'bun', args: ['add', '--dev', `commander@${COMMANDER_VERSION}`] };
  return { command: 'npm', args: ['install', '--save-dev', `commander@${COMMANDER_VERSION}`] };
}

function findObjectEnd(source: string, openBraceIndex: number): number {
  let depth = 0;
  let inString = false;
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const ch = source[index];
    if (inString) {
      if (ch === '\\') index += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function upsertObjectProperty(source: string, section: string, key: string, value: string): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const sectionPattern = new RegExp(`"${section}"\\s*:\\s*\\{`);
  const match = sectionPattern.exec(source);
  if (match) {
    const openBrace = match.index + match[0].length - 1;
    const closeBrace = findObjectEnd(source, openBrace);
    if (closeBrace === -1) return source;
    const interior = source.slice(openBrace + 1, closeBrace);
    if (new RegExp(`"${key}"\\s*:`).test(interior)) return source;
    const trimmed = interior.trimEnd();
    if (!trimmed) {
      return `${source.slice(0, openBrace + 1)}${eol}    "${key}": ${JSON.stringify(value)}${eol}  ${source.slice(closeBrace)}`;
    }
    const insertPos = openBrace + 1 + trimmed.length;
    return `${source.slice(0, insertPos)},${eol}    "${key}": ${JSON.stringify(value)}${source.slice(insertPos)}`;
  }
  const rootClose = source.lastIndexOf('}');
  if (rootClose === -1) return source;
  const before = source.slice(0, rootClose).trimEnd();
  const needsComma = !before.endsWith('{');
  const block = `${needsComma ? ',' : ''}${eol}  "${section}": {${eol}    "${key}": ${JSON.stringify(value)}${eol}  }${eol}`;
  return `${before}${block}${source.slice(rootClose)}`;
}

/** Add docs-lint script and commander devDependency while keeping unrelated scripts byte-for-byte. */
export function updateProjectPackageJson(source: string): string {
  const withScript = upsertObjectProperty(source, 'scripts', 'docs-lint', DOCS_LINT_SCRIPT);
  const parsed = JSON.parse(withScript) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (parsed.dependencies?.commander || parsed.devDependencies?.commander) return withScript;
  return upsertObjectProperty(withScript, 'devDependencies', 'commander', COMMANDER_VERSION);
}
