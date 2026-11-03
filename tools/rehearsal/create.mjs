import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git } from './git.mjs';
import { assertRehearsalRoot, fixture, prefix, repository } from './paths.mjs';
import { applyVariant, variants } from './variant.mjs';

/** Build a new isolated project and baseline remote without changing this checkout. */
export function createRehearsal(variant = 'success') {
  if (!variants.includes(variant)) throw new Error(`variant must be ${variants.join(', ')}`);
  const root = assertRehearsalRoot(mkdtempSync(join(tmpdir(), prefix)));
  const project = join(root, 'project');
  const remote = join(root, 'remote.git');
  const hooks = join(root, 'empty-hooks');
  mkdirSync(hooks);
  cpSync(fixture, project, { recursive: true });
  applyVariant(project, variant);
  git(project, 'init', '-b', 'main');
  for (const [name, value] of [
    ['user.name', 'Struct Docs Rehearsal'], ['user.email', 'rehearsal@example.invalid'],
    ['commit.gpgsign', 'false'], ['core.hooksPath', hooks], ['core.autocrlf', 'false'],
  ]) git(project, 'config', '--local', name, value);
  git(project, 'add', '--force', '--all');
  git(project, 'commit', '-m', 'Seed roadmap execution rehearsal');
  const baseline = git(project, 'rev-parse', 'HEAD');
  git(root, 'clone', '--bare', project, remote);
  git(project, 'remote', 'add', 'origin', remote);
  git(project, 'fetch', 'origin');
  git(project, 'branch', '--set-upstream-to=origin/main', 'main');
  const result = { root, project, remote, baseline, variant, plugin: repository };
  writeFileSync(join(root, 'rehearsal.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('usage: npm run rehearse:execution -- [success|failed-check|decision]');
    process.stdout.write(JSON.stringify(createRehearsal(process.argv[2]), null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
