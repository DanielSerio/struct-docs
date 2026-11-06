import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  commanderInstallArgs,
  detectPackageManager,
  updateProjectPackageJson,
} from './package-json.js';
import type { PackageManager } from './package-json.js';
import {
  ALL_HOUSE_STYLE_RULES,
  renderPrivatePackageJson,
  renderProjectCliIndex,
} from './project-cli-source.js';
import type { HouseStyleRuleName } from './project-cli-source.js';

export { ALL_HOUSE_STYLE_RULES };
export type { HouseStyleRuleName, PackageManager };

export type ApplyProjectCliOptions = {
  readonly rules?: readonly HouseStyleRuleName[];
  readonly dirs?: readonly string[];
  readonly assetsDir?: string;
};

const CORE_KIT_FILES = ['command-shell.mjs', 'discover-plugin.mjs', 'read-document.mjs', 'report.mjs'] as const;

function defaultAssetsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ['../../../assets/project-cli', '../../../../assets/project-cli', '../assets/project-cli']) {
    const candidate = resolve(here, rel);
    if (existsSync(candidate)) return candidate;
  }
  return resolve(here, '../../../assets/project-cli');
}

/**
 * Write tools/docs-cli/ with the selected rules and wire Commander in root or private package.json.
 * Commander is never copied from the plugin: a git install has no node_modules, so the generated
 * CLI runs only after the returned install command, the same way for every project.
 */
export function applyProjectCli(root: string, options: ApplyProjectCliOptions = {}) {
  const rules = options.rules ?? ALL_HOUSE_STYLE_RULES;
  const dirs = options.dirs ?? ['docs/specs'];
  const assetsDir = options.assetsDir ?? defaultAssetsDir();
  const cliDir = join(root, 'tools', 'docs-cli');
  mkdirSync(cliDir, { recursive: true });

  const written: string[] = [];
  for (const file of CORE_KIT_FILES) {
    copyFileSync(join(assetsDir, file), join(cliDir, file));
    written.push(`tools/docs-cli/${file}`);
  }
  for (const rule of ALL_HOUSE_STYLE_RULES) {
    const target = join(cliDir, `${rule}.mjs`);
    if (rules.includes(rule)) {
      copyFileSync(join(assetsDir, `${rule}.mjs`), target);
      written.push(`tools/docs-cli/${rule}.mjs`);
    } else if (existsSync(target)) {
      rmSync(target, { force: true });
    }
  }
  writeFileSync(join(cliDir, 'index.mjs'), renderProjectCliIndex(rules, dirs));
  written.push('tools/docs-cli/index.mjs');

  const rootPkgPath = join(root, 'package.json');
  if (existsSync(rootPkgPath)) {
    const original = readFileSync(rootPkgPath, 'utf8');
    const pm = detectPackageManager(root, original);
    // The caller runs the install: the CLI never reaches the network on its own.
    const install = commanderInstallArgs(pm);
    const updated = updateProjectPackageJson(original);
    if (updated !== original) {
      writeFileSync(rootPkgPath, updated);
      written.push('package.json');
    }
    return { written, packageManager: pm, installCommand: [install.command, ...install.args] };
  }

  writeFileSync(join(cliDir, 'package.json'), renderPrivatePackageJson());
  written.push('tools/docs-cli/package.json');
  return { written, packageManager: 'npm' as const, installCommand: ['npm', 'install', '--prefix', 'tools/docs-cli'] };
}
