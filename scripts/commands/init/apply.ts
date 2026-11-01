import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readProjectFile, projectPath } from '../../read/project-file.js';
import { readReadme } from '../../read/readme.js';
import { readReviewTemplate } from '../../read/review-template.js';
import type { InitSurvey } from '../../read/init-survey.js';
import { writeIndex } from '../../repair/index-write.js';
import type { InitPlan } from './plan.js';

/** Preflight every input before creating directories, then apply only explicit safe actions. */
export function applyInit(survey: InitSurvey, plan: InitPlan, templateAsset = readReviewTemplate) {
  if (plan.refusals.length) throw new Error('refused initialization plan cannot be applied');
  const root = survey.tree.root;
  const template = plan.actions.some((action) => action.kind === 'template') ? templateAsset() : undefined;
  if (readReadme(root) !== survey.readme || readProjectFile(root, '.gitignore')?.toString('utf8') !==
    (survey.gitignore ?? undefined)) throw new Error('initialization inputs changed; run init again');
  const currentTemplate = readProjectFile(root, 'docs/templates/code-review-v1.md');
  if ((currentTemplate === null) !== (survey.template === null) ||
    (currentTemplate !== null && survey.template !== null && !currentTemplate.equals(survey.template))) {
    throw new Error('review template changed; run init again');
  }
  for (const action of plan.actions) projectPath(root, action.path);
  const written: string[] = [];
  for (const action of plan.actions) {
    if (action.kind === 'index') {
      if (action.content !== undefined && writeIndex(root, survey.readme, action.content)) written.push(action.path);
      continue;
    }
    const target = projectPath(root, action.path);
    mkdirSync(dirname(target), { recursive: true });
    if (action.kind === 'template' && template !== undefined) writeFileSync(target, template, { flag: 'wx' });
    else if (action.kind === 'gitignore' && action.content !== undefined) writeFileSync(target, action.content);
    written.push(action.path);
  }
  return written;
}
