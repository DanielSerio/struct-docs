import type { FrontmatterResult, FrontmatterValue } from '../policy/document.js';
import type { SourceSpan } from '../policy/findings.js';
import { frontmatterValue } from './frontmatter-value.js';

const failure = (line: number, reason: string): FrontmatterResult => ({ ok: false, line, reason });

/** Ported from manage-docs: reject unsupported shapes instead of validating a partial read. */
export function parseFrontmatter(text: string): FrontmatterResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return failure(1, 'no frontmatter');
  const data: Record<string, FrontmatterValue> = Object.create(null);
  const locations: Record<string, SourceSpan> = Object.create(null);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const number = index + 1;
    if (line.trim() === '---') {
      return Object.keys(data).length ? { ok: true, data, locations, endLine: number }
        : failure(number, 'empty frontmatter');
    }
    if (!line.trim()) continue;
    if (/^\s/.test(line)) return failure(number, 'indented line (nesting is outside the subset)');
    if (line.startsWith('#')) continue;
    if (line.startsWith('- ')) return failure(number, 'block sequence - use inline [a, b]');
    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_-]*):(.*)$/);
    if (!match) return failure(number, 'not a `key: value` line');
    const key = match[1] ?? '';
    const rest = match[2] ?? '';
    if (Object.hasOwn(data, key)) return failure(number, `duplicate key \`${key}\``);
    const raw = rest.trimStart();
    if (!raw || raw.startsWith('#')) {
      const next = lines[index + 1] ?? '';
      if (/^\s*-\s/.test(next)) return failure(number + 1, 'block sequence - use inline [a, b]');
      if (/^\s+\S/.test(next)) return failure(number + 1, 'indented line (nesting is outside the subset)');
      return failure(number, `\`${key}\` has no value`);
    }
    try {
      const token = frontmatterValue(raw);
      data[key] = token.value;
      const start = line.indexOf(':') + 1 + rest.length - raw.length;
      // Spans cover raw tokens, including quotes, but exclude trailing comments/whitespace.
      locations[key] = { line: number, start, end: start + token.length };
    } catch (error) {
      return failure(number, error instanceof Error ? error.message : 'invalid frontmatter value');
    }
  }
  return failure(lines.length, 'unterminated frontmatter');
}
