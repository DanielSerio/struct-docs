type Plan = { actions: readonly { path: string }[]; foreign: readonly string[]; missing: readonly string[] };

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
  return lines.join('\n') + '\n';
}
