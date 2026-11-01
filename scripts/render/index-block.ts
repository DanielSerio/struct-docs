import { INDEX_OPEN, INDEX_CLOSE } from '../policy/index.js';

type Marker = { kind: 'open' | 'close'; start: number; end: number };
export type IndexBlock = { ok: true; range?: { start: number; end: number } } | { ok: false; message: string };

/** Recognize standalone markers only; never guess which authored bytes an orphan owns. */
export function inspectIndex(source: string): IndexBlock {
  const parts = source.split(/(\r?\n)/);
  const markers: Marker[] = [];
  let offset = 0;
  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index] ?? '';
    const trimmed = line.trim();
    if (trimmed === INDEX_OPEN || trimmed === INDEX_CLOSE) markers.push({
      kind: trimmed === INDEX_OPEN ? 'open' : 'close', start: offset + line.indexOf(trimmed),
      end: offset + line.indexOf(trimmed) + trimmed.length,
    });
    offset += line.length + (parts[index + 1]?.length ?? 0);
  }
  if (!markers.length) return { ok: true };
  const [open, close] = markers;
  if (markers.length !== 2 || open?.kind !== 'open' || close?.kind !== 'close') {
    return { ok: false, message: 'index markers are ambiguous; keep exactly one ordered struct-docs:index pair' };
  }
  return { ok: true, range: { start: open.start, end: close.end } };
}

/** Preserve prefix/suffix bytes, including mixed line endings, spaces and a BOM. */
export function spliceIndex(existing: string | null, index: string) {
  const source = existing ?? '# Documentation\n';
  const state = inspectIndex(source);
  if (!state.ok) throw new Error(state.message);
  const newline = source.match(/\r?\n/)?.[0] ?? '\n';
  const block = [INDEX_OPEN, '', index, '', INDEX_CLOSE].join('\n').replaceAll('\n', newline);
  if (state.range) return source.slice(0, state.range.start) + block + source.slice(state.range.end);
  const separator = !source || /(?:\r?\n){2}$/.test(source) ? '' : /\r?\n$/.test(source) ? newline : newline + newline;
  return source + separator + block + newline;
}
