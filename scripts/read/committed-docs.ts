import { spawnSync } from 'node:child_process';

/** Whether the last commit holds any file under a docs directory; false outside git or before one. */
export function committedUnder(root: string, directory: string) {
  const result = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', `docs/${directory}/`], {
    cwd: root, encoding: 'utf8',
  });
  return !result.error && result.status === 0 && result.stdout.trim() !== '';
}
