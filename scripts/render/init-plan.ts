type Plan = {
  actions: readonly { path: string }[];
  foreign: readonly string[];
  missing: readonly string[];
  draft: string | undefined;
};

/** The drafted `.struct-docs.yml`, shown whether or not the plan can be applied yet. */
export function formatConfigDraft(draft: string | undefined) {
  if (draft === undefined) return '';
  const body = draft.trimEnd().split('\n').map((line) => `  ${line}`.trimEnd());
  return ['Proposed .struct-docs.yml:', ...body, ''].join('\n') + '\n';
}

// This file's public shape is kept structural so rendering never imports command behavior.
export function formatInitPlan(plan: Plan) {
  const lines = ['Initialization plan:'];
  for (const action of plan.actions) lines.push(`  ${action.path}`);
  if (!plan.actions.length) lines.push('  no changes needed');
  if (plan.foreign.length) {
    lines.push('', 'Existing files need a routing decision from the init skill:');
    lines.push(...plan.foreign.map((path) => `  docs/${path}`));
  }
  if (plan.missing.length) lines.push('', `Not present yet: ${plan.missing.join(', ')} (not findings).`);
  lines.push('', 'Nothing written. Use init --apply for this safe plan; the init skill handles migrations and authored metadata.');
  return formatConfigDraft(plan.draft) + lines.join('\n') + '\n';
}
