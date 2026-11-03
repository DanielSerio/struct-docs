import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import { pluginFile } from './plugin-files.mjs';

const required = ['audit', 'execute-roadmap', 'fold', 'init', 'review', 'roadmap'];
const hostVariablePattern = /\$\{?[A-Z0-9_]+\}?|\b(?:CLAUDE|CODEX|ANTIGRAVITY|GEMINI)_PLUGIN_[A-Z0-9_]*\b|\bPLUGIN_(?:ROOT|DATA)\b/;

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
    if (hostVariablePattern.test(source)) errors.push(`skill references host variable: ${path}`);
    const matches = [...source.matchAll(/^[ \t]*node[ \t]+(?:"([^"]+)"|(\S+))[ \t]+([^\s`]+)/gm)];
    if (!matches.length) errors.push(`missing bundled command in ${path}`);
    for (const match of matches) {
      const entry = match[1] ?? match[2];
      const target = isAbsolute(entry) ? entry : relative(root, resolve(dirname(file), entry)).split(sep).join('/');
      pluginFile(root, target, errors);
      if (target !== 'bin/docs-lint.mjs' || !commands.has(match[3])) {
        errors.push(`unknown bundled command in ${path}: ${entry} ${match[3]}`);
      }
    }
  }
}
