import type { RoadmapBody, RoadmapNode } from '../policy/roadmap.js';
import { roadmapHeading } from './roadmap-heading.js';

const field = /^([A-Z][a-z]+(?:-[a-z]+)*):\s*(.*)$/;
const item = /^-\s+(?:\[([ xX])\]\s*)?(.*)$/;
const scalarFields = { Intent: 'intent', Breakout: 'breakout', Title: 'title', 'Superseded-by': 'superseded-by' } as const;

/** Ported manage-docs grammar: depth comes from breakout files, never heading levels. */
export function parseBody(text: string, bodyStart = 0): RoadmapBody {
  const lines = text.split(/\r?\n/).slice(bodyStart);
  const nodes: RoadmapNode[] = [];
  const findings: RoadmapBody['findings'] = [];
  let node: RoadmapNode | undefined;
  let list: 'Acceptance' | 'Notes' | undefined;
  for (const [index, raw] of lines.entries()) {
    const line = raw.trimEnd();
    const number = bodyStart + index + 1;
    if (!line.trim()) continue;
    if (line.startsWith('### ')) {
      node = roadmapHeading(line, number, findings); list = undefined;
      if (node) nodes.push(node);
      continue;
    }
    if (line.startsWith('## ')) { node = undefined; list = undefined; continue; }
    if (!node) continue;
    const match = line.match(field);
    if (match) {
      const key = match[1] ?? '';
      const value = match[2] ?? '';
      const start = line.indexOf(':') + 1 + line.slice(line.indexOf(':') + 1).length - value.length;
      const name = key === 'Acceptance' || key === 'Notes' || key === 'Deps' ? key.toLowerCase()
        : Object.hasOwn(scalarFields, key) ? scalarFields[key as keyof typeof scalarFields] : undefined;
      if (name) node.locations[name] = { line: number, start, end: start + value.length };
      list = (key === 'Acceptance' || key === 'Notes') && !value ? key : undefined;
      if (Object.hasOwn(scalarFields, key)) node[scalarFields[key as keyof typeof scalarFields]] = value;
      else if (key === 'Deps') node.deps = value.split(',').map((dep) => dep.trim()).filter(Boolean);
      else if (key !== 'Acceptance' && key !== 'Notes') findings.push({
        line: number, message: `unknown field \`${key}\` on \`${node.id}\``,
      });
      continue;
    }
    const entry = line.match(item);
    if (!entry || !list) continue;
    if (list === 'Acceptance') node.acceptance.push({ done: /[xX]/.test(entry[1] ?? ''), text: entry[2] ?? '', line: number });
    else node.notes.push(entry[2] ?? '');
  }
  return { nodes, findings };
}
