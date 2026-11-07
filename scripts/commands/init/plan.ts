import type { Finding } from '../../policy/findings.js';
import type { InitSurvey } from '../../read/init-survey.js';
import { inspectIndex, spliceIndex } from '../../render/index-block.js';
import { buildIndex } from '../../render/readme.js';
import { renderGitignore } from '../../render/gitignore.js';
import { planConfig } from './config-plan.js';

export type InitAction = { kind: 'config' | 'index' | 'template' | 'gitignore'; path: string; content?: string };

/** Pure survey-to-plan port: only the skill can approve semantic moves or inferred fields. */
export function planInit(survey: InitSurvey) {
  const actions: InitAction[] = [];
  const config = planConfig(survey);
  const refusals: Finding[] = [...survey.refusals, ...config.refusals];
  // The drafted config is written only on a plan with nothing left to decide.
  if (config.draft !== undefined && !refusals.length) {
    actions.push({ kind: 'config', path: '.struct-docs.yml', content: config.draft });
  }
  const state = inspectIndex(survey.readme ?? '');
  if (!state.ok) refusals.push({ file: 'README.md', line: 1, rule: 'init-index', severity: 'error', message: state.message });
  else {
    const content = spliceIndex(survey.readme, buildIndex(survey.tree));
    if (content !== survey.readme) actions.push({ kind: 'index', path: 'docs/README.md', content });
  }
  if (survey.template === null) actions.push({ kind: 'template', path: 'docs/templates/code-review-v1.md' });
  const patterns = Object.entries(survey.tree.config.doctypes).filter(([, type]) => type.gitignored)
    .map(([directory]) => `/docs/${directory}/`);
  if (survey.tree.config.living.gitignored) patterns.push('/docs/living/');
  try {
    const content = renderGitignore(survey.gitignore, patterns);
    if (content !== null && content !== survey.gitignore) actions.push({ kind: 'gitignore', path: '.gitignore', content });
  } catch (error) {
    refusals.push({ file: '.gitignore', line: 1, rule: 'init-gitignore', severity: 'error',
      message: error instanceof Error ? error.message : 'invalid managed gitignore markers' });
  }
  const missing = [];
  for (const directory of ['product', 'specs']) {
    if (Object.hasOwn(survey.tree.config.doctypes, directory) &&
      !survey.tree.entries.some((entry) => entry.path.startsWith(`${directory}/`) && entry.classification.cls === 'live')) {
      missing.push(`documents in docs/${directory}/`);
    }
  }
  return { actions, refusals, foreign: survey.foreign, missing, draft: config.draft };
}
export type InitPlan = ReturnType<typeof planInit>;
