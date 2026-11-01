import { isMap, isNode, isScalar } from 'yaml';
import type { Document, LineCounter } from 'yaml';
import type { ConfigPath } from '../policy/config-types.js';

// Use key locations, not scalar values, so multiline maps still point at the option.
export function sourceLine(document: Document, counter: LineCounter, path: ConfigPath) {
  let node: unknown = document.contents;
  let position = isNode(node) ? node.range?.[0] : 0;
  for (const part of path) {
    if (isMap(node)) {
      const pair = node.items.find((entry) => isScalar(entry.key) && entry.key.value === part);
      if (!pair) break;
      position = isNode(pair.key) ? pair.key.range?.[0] : position;
      node = pair.value;
    } else if (isNode(node) && 'items' in node && typeof part === 'number') {
      node = node.items[part];
      position = isNode(node) ? node.range?.[0] : position;
    } else break;
  }
  return counter.linePos(position ?? 0).line;
}
