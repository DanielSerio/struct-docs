const open = '# struct-docs:ignore';
const close = '# /struct-docs:ignore';

/** Reconcile only our marked block; unrelated patterns and their reasons stay byte-identical. */
export function renderGitignore(existing: string | null, patterns: readonly string[]) {
  const source = existing ?? '';
  const markers: { kind: string; start: number; end: number }[] = [];
  let offset = 0;
  for (const line of source.split(/(?<=\n)/)) {
    const text = line.replace(/\r?\n$/, '');
    if (text.trim() === open || text.trim() === close) markers.push({
      kind: text.trim(), start: offset + text.indexOf(text.trim()), end: offset + text.indexOf(text.trim()) + text.trim().length,
    });
    offset += line.length;
  }
  const [first, last] = markers;
  if (markers.length && (markers.length !== 2 || first?.kind !== open || last?.kind !== close)) {
    throw new Error('managed gitignore markers are ambiguous; keep one ordered struct-docs:ignore pair');
  }
  const outside = first && last ? source.slice(0, first.start) + source.slice(last.end) : source;
  const independent = new Set(outside.split(/\r?\n/).map((line) => line.trim()));
  const owned = [...new Set(patterns)].filter((pattern) => !independent.has(pattern)).sort();
  if (!owned.length) return first && last ? outside : existing;
  const newline = source.match(/\r?\n/)?.[0] ?? '\n';
  const block = [open, '# Local documentation stays out of Git; init owns only this block.', ...owned, close].join(newline);
  if (first && last) return source.slice(0, first.start) + block + source.slice(last.end);
  const separator = !source || /(?:\r?\n){2}$/.test(source) ? '' : /\r?\n$/.test(source) ? newline : newline + newline;
  return source + separator + block + newline;
}
