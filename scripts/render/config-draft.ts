export type DraftDoctype = { directory: string; type: string | undefined; committed: boolean };
export type DraftIgnore = { pattern: string; reason: readonly string[] };
export type ConfigDraft = {
  doctypes: readonly DraftDoctype[];
  ignore: readonly DraftIgnore[];
  livingGitignored: boolean;
};

// A plain pattern stays readable; anything YAML could read as an alias, tag or flow is quoted.
const yamlScalar = (value: string) => /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/.test(value) ? value : JSON.stringify(value);

/**
 * Render a `.struct-docs.yml` naming every docs folder, so one file shows each folder's rules.
 * Folders whose type or tracking needs a person's decision are written as comments to resolve.
 */
export function renderConfigDraft(draft: ConfigDraft) {
  const lines = [
    '# Root configuration; roadmap policy is locked and supplied by the plugin.',
    '# Every docs folder is listed here. roadmaps/, templates/ and living/ are reserved by the',
    '# plugin: roadmaps/ and templates/ take no settings, and living/ takes only `gitignored`.',
    draft.ignore.length ? 'ignore:' : 'ignore: []',
  ];
  for (const { pattern, reason } of draft.ignore) {
    lines.push(...reason.map((line) => `  # ${line}`.trimEnd()), `  - ${yamlScalar(pattern)}`);
  }
  lines.push('living:', `  gitignored: ${draft.livingGitignored}`, 'doctypes:');
  for (const { directory, type, committed } of draft.doctypes) {
    if (!type) {
      lines.push(`  # docs/${directory}/ holds documents but has no type yet: name one, or ignore the folder.`,
        `  # ${directory}:`, '  #   type: <type>');
      continue;
    }
    if (committed) {
      lines.push(`  # docs/${directory}/ has committed files: set gitignored to false to keep them in git,`,
        '  # or to true to stop tracking them.');
    }
    lines.push(`  ${directory}:`, `    type: ${yamlScalar(type)}`);
  }
  return `${lines.join('\n')}\n`;
}
