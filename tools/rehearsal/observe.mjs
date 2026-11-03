import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { git } from './git.mjs';
import { repository } from './paths.mjs';

/** Observe worktree bytes/timestamps and refs; Git's internal stat cache is not authored work. */
export function projectState(rehearsal) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push({ path: relative(rehearsal.project, path).split(sep).join('/'),
        sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
        mtime: statSync(path, { bigint: true }).mtimeNs.toString() });
    }
  };
  walk(rehearsal.project);
  return { files, branch: git(rehearsal.project, 'branch', '--show-current'),
    head: git(rehearsal.project, 'rev-parse', 'HEAD'), main: git(rehearsal.project, 'rev-parse', 'main'),
    refs: git(rehearsal.project, 'for-each-ref', '--format=%(refname) %(objectname)'),
    remote: git(rehearsal.root, '--git-dir', rehearsal.remote, 'show-ref'),
    status: git(rehearsal.project, 'status', '--porcelain=v1', '--untracked-files=all') };
}

export const stateHash = (state) => createHash('sha256').update(JSON.stringify(state)).digest('hex');

/** Capture existing read-only commands; this helper neither selects work nor changes branches. */
export function preflightReports(rehearsal, file = 'docs/roadmaps/release/greeting.md') {
  return [['audit'], ['status'], ['status', file]].map((args) => {
    const result = spawnSync(process.execPath, [join(repository, 'bin/docs-lint.mjs'), ...args], {
      cwd: rehearsal.project, encoding: 'utf8', timeout: 15000,
    });
    if (result.error) throw result.error;
    return { args, status: result.status, stdout: result.stdout, stderr: result.stderr };
  });
}
