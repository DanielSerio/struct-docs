import { defaultConfig } from '../../policy/config-defaults.js';
import type { Finding } from '../../policy/findings.js';
import { compileIgnores } from '../../policy/ignore-patterns.js';
import type { InitSurvey } from '../../read/init-survey.js';
import { renderConfigDraft } from '../../render/config-draft.js';

/**
 * Every default doctype, every legacy `.doctypes` entry and every folder holding documents must
 * be named in `.struct-docs.yml`. Init drafts that file when it is absent and refuses to apply
 * while an existing one leaves a folder out, so no folder's rules are implicit or silently lost.
 */
export function planConfig(survey: InitSurvey) {
  const legacy = new Map(survey.legacy.doctypes);
  // A folder the legacy ignore file excludes keeps that exclusion in the draft instead of a doctype.
  const ignores = compileIgnores(survey.legacy.ignore.map(({ pattern }) => pattern));
  const ignoredByLegacy = (directory: string) => survey.tree.files.filter((path) => path.startsWith(`${directory}/`))
    .every((path) => ignores.some((pattern) => pattern.test(path)));
  const docDirs = survey.docDirs.filter((directory) => !ignoredByLegacy(directory));
  const required = [...new Set([...Object.keys(defaultConfig().doctypes), ...legacy.keys(), ...docDirs])];
  const refusals: Finding[] = [];
  if (survey.configFile) {
    for (const directory of required.filter((name) => !survey.named.has(name))) {
      refusals.push({ file: '.struct-docs.yml', line: 1, rule: 'init-config', severity: 'error',
        message: `docs/${directory}/ is not named under \`doctypes\`; list every docs folder, defaults included` });
    }
    return { refusals, draft: undefined };
  }
  const { doctypes: configured } = survey.tree.config;
  const doctypes = required.map((directory) => ({
    directory,
    type: (Object.hasOwn(configured, directory) ? configured[directory]?.type : undefined) ?? legacy.get(directory),
    committed: survey.committedIgnored.includes(directory),
  }));
  for (const { directory } of doctypes.filter(({ type }) => !type)) {
    refusals.push({ file: `${directory}/`, line: 1, rule: 'init-config', severity: 'error',
      message: `docs/${directory}/ holds documents but has no doctype; name one in .struct-docs.yml, or ignore the folder` });
  }
  const draft = renderConfigDraft({ doctypes, ignore: survey.legacy.ignore, livingGitignored: survey.tree.config.living.gitignored });
  return { refusals, draft };
}
