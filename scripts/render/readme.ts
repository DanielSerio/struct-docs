import type { ParsedDocument } from '../policy/document.js';
import type { IndexInput } from '../policy/index.js';
import { indexable } from '../policy/index.js';

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const id = (path: string) => (path.split('/').at(-1) ?? '').replace(/\.(?:md|markdown)$/i, '');
const label = (text: string) => text.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]')
  .replaceAll('\r', '\\r').replaceAll('\n', '\\n');
const link = (path: string) => path.split('/').map((part) => encodeURIComponent(part)
  .replace(/[()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

const value = (document: ParsedDocument, field: string) => {
  const result = document.frontmatter.ok ? document.frontmatter.data[field] : undefined;
  return typeof result === 'string' ? result.replace(/[\r\n]+/g, ' ') : '';
};
const order = (directory: string) => { const rank = ['product', 'specs', 'reviews'].indexOf(directory); return rank < 0 ? 3 : rank; };
const routing = [
  'Route by `type` and the directory table in `.struct-docs.yml`. Extend the document whose',
  '`purpose` and `owns` cover the material; when two purposes fit, the narrower wins. Create a',
  'new document only when no existing purpose fits. Keep reasons beside rules. Ask the user',
  'about undecided behavior; only what they cannot answer goes into `open-questions.md`.',
];

/** Ported index shape: present documents only, never local-only or excluded content. */
export function buildIndex(input: IndexInput) {
  const out = [...routing, ''];
  const entries = input.entries.filter((entry) => indexable(entry, input.config));
  const indexed = new Set(entries.map((entry) => entry.path));
  const docs = input.documents.filter((doc) => indexed.has(doc.path));
  const groups = new Map<string, ParsedDocument[]>();
  for (const doc of docs.filter((doc) => doc.classification.cls === 'live')) {
    const directory = doc.path.includes('/') ? doc.path.split('/')[0] ?? '.' : '.';
    groups.set(directory, [...(groups.get(directory) ?? []), doc]);
  }
  for (const [directory, documents] of [...groups].sort(([a], [b]) => order(a) - order(b) || compare(a, b))) {
    out.push(`## ${directory === '.' ? 'root' : directory}`, '');
    for (const doc of documents.sort((a, b) => compare(a.path, b.path))) {
      const purpose = value(doc, 'purpose');
      out.push(`- [${label(id(doc.path))}](${link(doc.path)})${value(doc, 'superseded-by') ? ' *(superseded)*' : ''}${purpose ? ` \u2014 ${purpose}` : ''}`);
    }
    out.push('');
  }
  const roadmaps = new Map<string, ParsedDocument[]>();
  for (const doc of docs.filter((doc) => doc.classification.cls === 'roadmap')) {
    const name = doc.path.split('/')[1] ?? '';
    roadmaps.set(name, [...(roadmaps.get(name) ?? []), doc]);
  }
  if (roadmaps.size) out.push('## roadmaps', '');
  for (const [name, files] of [...roadmaps].sort(([a], [b]) => compare(a, b))) {
    const root = files.find((doc) => doc.path.split('/').length === 3 && id(doc.path) === 'index');
    // A standalone milestone is linkable too; do not fabricate a missing index.md.
    for (const doc of root ? [root] : files.sort((a, b) => compare(a.path, b.path))) {
      const nameLabel = root ? name : `${name}/${id(doc.path)}`;
      const intent = value(doc, 'intent');
      out.push(`- [${label(nameLabel)}](${link(doc.path)}) \u2014 **${value(doc, 'status') || 'unknown'}**${intent ? ` \u2014 ${intent}` : ''}`);
    }
  }
  if (roadmaps.size) out.push('');
  const unrouted = new Map<string, string[]>();
  for (const entry of entries.filter((entry) => entry.classification.cls === 'ungoverned')) {
    const directory = entry.path.split('/')[0] ?? '.';
    unrouted.set(directory, [...(unrouted.get(directory) ?? []), entry.path]);
  }
  if (unrouted.size) out.push('## unrouted', '', 'Not governed by the schema, and listed so they are still findable.',
    '`init` gives them a type, or records that they stay as they are.', '');
  for (const [directory, files] of [...unrouted].sort(([a], [b]) => compare(a, b))) {
    out.push(`- **${label(directory)}/**`);
    for (const path of files.sort(compare)) out.push(`  - [${label(id(path))}](${link(path)})`);
  }
  return out.join('\n').trimEnd();
}
