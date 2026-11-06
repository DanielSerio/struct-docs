import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';

export type GitHooks = {
  /** Directory git runs hooks from, honoring core.hooksPath, worktrees and submodules. */
  readonly dir: string;
  /** Project root relative to the worktree top, where git runs hooks; empty at the top. */
  readonly projectFromTop: string;
};

function git(root: string, args: readonly string[]) {
  const result = spawnSync('git', [...args], { cwd: root, encoding: 'utf8' });
  return result.error || result.status !== 0 ? undefined : result.stdout.trim();
}

/** Ask git where hooks live rather than assuming `.git/hooks`; undefined outside a worktree. */
export function gitHooks(root: string): GitHooks | undefined {
  const hooks = git(root, ['rev-parse', '--git-path', 'hooks']);
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!hooks || !top) return undefined;
  const dir = resolve(root, hooks);
  // Husky 9 points core.hooksPath at generated `.husky/_` wrappers that run `.husky/<hook>`,
  // and regenerates the wrappers on install, so the project's hook belongs one level up.
  const hookDir = basename(dir) === '_' && basename(dirname(dir)) === '.husky' ? dirname(dir) : dir;
  // Real paths keep Windows drive casing and short names from producing a bogus relative path.
  const projectFromTop = relative(realpathSync.native(top), realpathSync.native(root)).split(sep).join('/');
  return { dir: hookDir, projectFromTop };
}

/** Git runs hooks from the worktree top, so a nested project's gate must enter it first. */
export function inProject(command: string, projectFromTop: string): string {
  if (!projectFromTop) return command;
  return `(cd '${projectFromTop.replaceAll("'", "'\\''")}' && ${command})`;
}
