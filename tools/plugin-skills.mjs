import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { pluginFile } from './plugin-files.mjs';

const required = ['audit', 'fold', 'init', 'review', 'roadmap'];

/** Check the actual auto-discovered skill names and every literal bundled command. */
export function skillFiles(root, commands, errors) {
  let names = [];
  try {
    names = readdirSync(join(root, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    errors.push('missing skills directory');
  }
  for (const name of required) if (!names.includes(name)) errors.push(`missing required skill: ${name}`);
  for (const name of names) {
    const path = `skills/${name}/SKILL.md`;
    const file = pluginFile(root, path, errors);
    if (!file) continue;
    const source = readFileSync(file, 'utf8');
    try {
      const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
      const metadata = block === undefined ? undefined : parse(block);
      if (metadata?.name !== name) errors.push(`skill directory/name mismatch: ${path}`);
      if (typeof metadata?.description !== 'string' || !metadata.description.trim()) errors.push(`missing skill description: ${path}`);
      if (metadata?.['user-invocable'] !== true) errors.push(`skill is not user-invocable: ${path}`);
    } catch {
      errors.push(`invalid skill frontmatter: ${path}`);
    }
    for (const match of source.matchAll(/^[ \t]*node[ \t]+(?:"([^"]+)"|(\S+))[ \t]+([^\s`]+)/gm)) {
      const entry = match[1] ?? match[2];
      const prefix = '${CLAUDE_PLUGIN_ROOT}/';
      const local = entry.startsWith(prefix) ? entry.slice(prefix.length) : undefined;
      if (local !== undefined) pluginFile(root, local, errors);
      if (local !== 'bin/docs-lint.mjs' || !commands.has(match[3])) {
        errors.push(`unknown bundled command in ${path}: ${entry} ${match[3]}`);
      }
    }
  }
}
