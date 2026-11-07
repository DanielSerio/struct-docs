import { loadConfig } from '../../read/config.js';
import { surveyInit } from '../../read/init-survey.js';
import { planInit } from '../init/plan.js';
import { applyInit } from '../init/apply.js';
import { applyIntegrations, validateIntegrations } from '../init/integrations.js';
import { formatConfigDraft, formatInitPlan } from '../../render/init-plan.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Unlike audit/repair, init always surveys first and never writes without explicit --apply. */
export function run(options: CommandOptions): CommandResult {
  validateIntegrations(options);
  const { config, findings } = loadConfig(options.root);
  if (!config) return { findings };
  const found = surveyInit(options.root, config);
  const plan = planInit(found);
  // A refused plan still shows the draft: the init skill builds its proposal from it.
  if (plan.refusals.length) {
    const draft = formatConfigDraft(plan.draft);
    return { findings: plan.refusals, ...(draft ? { stdout: draft } : {}) };
  }
  if (!options.apply) return { findings: [], stdout: formatInitPlan(plan) };
  // Integrations follow the base apply, so a refused or failed setup never gains a gate.
  const lines = [...applyInit(found, plan).map((path) => `wrote ${path}`), ...applyIntegrations(options)];
  return { findings: [], ...(lines.length ? { stdout: `${lines.join('\n')}\n` } : {}) };
}
