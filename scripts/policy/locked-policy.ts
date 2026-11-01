import { defaultConfig } from './config-defaults.js';
import { isRecord, stringList } from './config-shape.js';
import type { ConfigIssue } from './config-types.js';
import { patternToRegExp } from './ignore-patterns.js';

const lockedFields = new Set(['title', 'type', 'purpose', 'owns']);
const reservedDirectories = new Set(['roadmaps', 'templates', 'living']);
const roadmapTypes = new Set(['roadmap', 'roadmap-node']);

/** A root-anchored pattern can reach roadmaps only through its first segment. */
export function matchesRoadmapPath(pattern: string) {
  const body = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  const first = body.split('/')[0] ?? '';
  // ** can consume roadmaps before any literal suffix, at any depth or filename.
  return first === '**' || patternToRegExp(first).test('roadmaps');
}

/** Keep immutable policy separate from project-customizable schema options. */
export function lockedPolicyIssues(value: unknown): ConfigIssue[] {
  if (!isRecord(value)) return [];
  const issues: ConfigIssue[] = [];
  if (stringList(value.ignore)) {
    value.ignore.forEach((pattern, index) => {
      if (matchesRoadmapPath(pattern)) issues.push({
        path: ['ignore', index], message: 'ignore pattern may not match locked `roadmaps/` paths',
      });
    });
  }
  if (!isRecord(value.doctypes)) return issues;
  const defaults = defaultConfig().doctypes;
  for (const [directory, definition] of Object.entries(value.doctypes)) {
    const path = ['doctypes', directory];
    if (reservedDirectories.has(directory)) issues.push({
      path, message: `\`${directory}/\` is reserved and cannot be configured as a doctype`,
    });
    if (!isRecord(definition)) continue;
    if (typeof definition.type === 'string' && roadmapTypes.has(definition.type)) issues.push({
      path: [...path, 'type'], message: `\`${definition.type}\` is a locked roadmap type`,
    });
    const inherited = Object.hasOwn(defaults, directory) ? defaults[directory] : undefined;
    const gitignored = definition.gitignored ?? inherited?.gitignored ?? false;
    if (gitignored === true && definition.owns === true) issues.push({
      path: [...path, 'owns'], message: '`owns: true` cannot be combined with `gitignored: true`',
    });
    if (!isRecord(definition.fields)) continue;
    for (const field of Object.keys(definition.fields)) {
      if (lockedFields.has(field)) issues.push({
        path: [...path, 'fields', field],
        message: `\`${field}\` is a system-owned field and cannot be redefined or removed`,
      });
    }
  }
  return issues;
}
