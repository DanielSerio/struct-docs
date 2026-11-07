import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from '../policy/config-types.js';
import type { Finding } from '../policy/findings.js';
import { loadTree } from './tree.js';
import { readReadme } from './readme.js';
import { readProjectFile } from './project-file.js';
import { committedUnder, explicitlyGitignored } from './committed-docs.js';

/** Ported survey: inventory and classify once, without interpreting or changing authored prose. */
export function surveyInit(root: string, config: Config) {
  const tree = loadTree(root, config);
  const readme = readReadme(root);
  const refusals: Finding[] = [];
  const refuse = (file: string, message: string, line = 1) => refusals.push({
    file, line, rule: 'init-migration', severity: 'error', message: `${message}; run the init skill to approve migration first`,
  });
  for (const file of ['.doctypes', '.docsignore']) {
    if (tree.files.includes(file)) refuse(file, `legacy docs/${file} must be converted to .struct-docs.yml`);
  }
  for (const directory of ['roadmap', 'archive', 'scratch', 'decisions']) {
    const present = directory === 'roadmap' ? existsSync(resolve(root, 'docs', directory))
      : tree.files.some((path) => path.startsWith(`${directory}/`));
    if (present && !Object.hasOwn(config.doctypes, directory)) {
      refuse(`${directory}/`, `legacy docs/${directory}/ needs an approved migration or fold plan`);
    }
  }
  // A default must never stop tracking committed documents: gitignoring them means the next
  // commit of a move or rename deletes them from the repository.
  const chosen = explicitlyGitignored(root);
  const ignored = Object.entries(config.doctypes).filter(([, type]) => type.gitignored).map(([directory]) => directory);
  if (config.living.gitignored) ignored.push('living');
  for (const directory of ignored.filter((name) => !chosen.has(name) && committedUnder(root, name))) {
    refusals.push({ file: `${directory}/`, line: 1, rule: 'init-gitignore', severity: 'error',
      message: `docs/${directory}/ has committed files but is gitignored by default; set \`gitignored: false\` ` +
        `in .struct-docs.yml to keep them in git, or \`gitignored: true\` to stop tracking them` });
  }
  const legacyLine = readme?.split(/\r?\n/).findIndex((line) =>
    /^\s*<!--\s*\/?(?:manage-docs|clean-docs):index\s*-->\s*$/.test(line)) ?? -1;
  if (legacyLine >= 0) refuse('README.md', 'legacy index markers must be swapped by the init skill', legacyLine + 1);
  const foreign = tree.entries.filter(({ classification }) => classification.cls === 'forbidden' ||
    (classification.cls === 'ungoverned' && !classification.excluded)).map(({ path }) => path);
  return { tree, readme, refusals, foreign,
    template: readProjectFile(root, 'docs/templates/code-review-v1.md'),
    gitignore: readProjectFile(root, '.gitignore')?.toString('utf8') ?? null };
}
export type InitSurvey = ReturnType<typeof surveyInit>;
