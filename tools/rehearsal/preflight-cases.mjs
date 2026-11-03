import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { git } from './git.mjs';

/** Arrange explicit preflight inputs before snapshots; this is fixture setup, not an executor. */
export function arrangePreflight(rehearsal, scenario) {
  const child = join(rehearsal.project, 'docs/roadmaps/release/greeting.md');
  const source = readFileSync(child, 'utf8');
  if (scenario === 'malformed') writeFileSync(child, source.replace('id: greeting', 'id: [unclosed'));
  else if (scenario === 'cycle') writeFileSync(child, source.replace('Deps: baseline-contract', 'Deps: emphasis'));
  else if (scenario === 'external-ancestor' || scenario === 'external-later') {
    const prerequisite = join(rehearsal.project, 'docs/roadmaps/prerequisite/index.md');
    mkdirSync(dirname(prerequisite), { recursive: true });
    writeFileSync(prerequisite, '---\nid: prerequisite\ntitle: External approval\ntype: roadmap\nstatus: todo\n' +
      'intent: Wait for separately owned approval.\nspecs: [specs/greetings]\n---\n\n## Tasks\n\n' +
      '### approve <!-- status: todo -->\nIntent: The other owner approves.\nAcceptance:\n- [ ] Approval exists\n');
    if (scenario === 'external-ancestor') {
      const parent = join(rehearsal.project, 'docs/roadmaps/release/index.md');
      writeFileSync(parent, readFileSync(parent, 'utf8').replace('Breakout: ./greeting.md',
        'Deps: prerequisite:approve\nBreakout: ./greeting.md'));
    } else writeFileSync(child, source.replace('Deps: emphasis', 'Deps: emphasis, prerequisite:approve'));
  } else if (scenario === 'dirty-overlap') {
    const path = join(rehearsal.project, 'src/greeting.mjs');
    writeFileSync(path, readFileSync(path, 'utf8') + '\n// Unrelated user work must remain untouched.\n');
  } else if (scenario === 'safe-unrelated') {
    writeFileSync(join(rehearsal.project, 'personal-notes.txt'), 'User notes, unrelated to greeting tasks.\n');
    git(rehearsal.project, 'add', '--', 'personal-notes.txt');
  } else throw new Error(`unknown preflight fixture scenario: ${scenario}`);
}
