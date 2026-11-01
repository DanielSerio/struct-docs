import type { Config, ConfigIssue } from './config-types.js';

/** Validate the final registry, so forward declarations and removals have settled. */
export function referenceTargetIssues(config: Config): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const [directory, doctype] of Object.entries(config.doctypes)) {
    for (const [name, field] of Object.entries(doctype.fields)) {
      if (field.kind !== 'reference' || field.to === undefined) continue;
      const path = ['doctypes', directory, 'fields', name, 'to'];
      const target = Object.hasOwn(config.doctypes, field.to) ? config.doctypes[field.to] : undefined;
      if (!target && field.to !== 'templates' && field.to !== 'roadmaps') {
        issues.push({ path, message: `reference target directory \`${field.to}\` is not configured` });
      } else if (!doctype.gitignored && target?.gitignored) {
        issues.push({ path, message: 'a tracked doctype cannot reference a gitignored target directory' });
      }
    }
  }
  return issues;
}
