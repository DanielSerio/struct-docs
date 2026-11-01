import { quotedScalar } from './frontmatter-quoted.js';

type Token = { value: string; length: number };
const onlyComment = (suffix: string) => suffix.trim() === '' || /^\s+#/.test(suffix);

function scalar(raw: string, flow: boolean): Token {
  if (raw[0] === '"' || raw[0] === "'") return quotedScalar(raw);
  if (/^!/.test(raw)) throw new Error('tags are outside the subset');
  if (/^-\s/.test(raw)) throw new Error('block sequence - use inline [a, b]');
  if (/^[&*]/.test(raw)) throw new Error('anchors are outside the subset');
  if (/^[|>]/.test(raw)) throw new Error('multi-line scalar is outside the subset');
  if (/^[{[]/.test(raw)) throw new Error('nested value is outside the subset');
  const boundary = flow ? raw.search(/[,\]]/) : -1;
  const candidate = boundary < 0 ? raw : raw.slice(0, boundary);
  const comment = candidate.search(/(^|\s)#/);
  const value = (comment < 0 ? candidate : candidate.slice(0, comment)).trimEnd();
  if (!value) throw new Error('scalar has no value');
  if (/:\s/.test(value) || (flow && /[{}[\]]/.test(value))) {
    throw new Error('nested value is outside the subset');
  }
  return { value, length: value.length };
}

/** One-level flow lists are the only collection syntax; commas inside quotes stay literal. */
function sequence(raw: string) {
  const value: string[] = [];
  let offset = 1;
  let afterComma = false;
  while (offset < raw.length) {
    offset += raw.slice(offset).length - raw.slice(offset).trimStart().length;
    if (raw[offset] === ']') return { value, length: offset + 1 };
    if (afterComma && raw[offset] === ',') throw new Error('empty inline sequence item');
    const token = scalar(raw.slice(offset), true);
    value.push(token.value); offset += token.length;
    offset += raw.slice(offset).length - raw.slice(offset).trimStart().length;
    if (raw[offset] === ']') return { value, length: offset + 1 };
    if (raw[offset] !== ',') throw new Error('unclosed inline sequence');
    offset += 1; afterComma = true;
  }
  throw new Error('unclosed inline sequence');
}

export function frontmatterValue(raw: string) {
  const token = raw.startsWith('[') ? sequence(raw) : scalar(raw, false);
  if (!onlyComment(raw.slice(token.length))) throw new Error('unexpected text after value');
  return token;
}
