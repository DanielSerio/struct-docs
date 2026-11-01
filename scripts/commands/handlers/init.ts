import { loadConfig } from '../../read/config.js';
import { surveyInit } from '../../read/init-survey.js';
import { planInit } from '../init/plan.js';
import { applyInit } from '../init/apply.js';
import { formatInitPlan } from '../../render/init-plan.js';
import type { CommandOptions, CommandResult } from '../command-types.js';

/** Unlike audit/repair, init always surveys first and never writes without explicit --apply. */
export function run(options: CommandOptions): CommandResult {
  const { config, findings } = loadConfig(options.root);
  if (!config) return { findings };
  const found = surveyInit(options.root, config);
  const plan = planInit(found);
  if (plan.refusals.length) return { findings: plan.refusals };
  if (!options.apply) return { findings: [], stdout: formatInitPlan(plan) };
  const written = applyInit(found, plan);
  return { findings: [], ...(written.length ? { stdout: written.map((path) => `wrote ${path}`).join('\n') + '\n' } : {}) };
}
