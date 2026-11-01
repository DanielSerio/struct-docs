import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classify } from '../../scripts/policy/classify.js';
import { defaultConfig } from '../../scripts/policy/config-defaults.js';
import type { Config } from '../../scripts/policy/config-types.js';
import { parseDocument } from '../../scripts/read/document.js';
import { loadConfig } from '../../scripts/read/config.js';
import { loadTree } from '../../scripts/read/tree.js';
import { readReadme } from '../../scripts/read/readme.js';
import { spliceIndex } from '../../scripts/render/index-block.js';
import { buildIndex } from '../../scripts/render/readme.js';

/** Seed a fixture's listing from stored values, without repairing its authored scenario. */
export function indexedFiles(files: Record<string, string>, config: Config = defaultConfig()): Record<string, string> & { 'README.md': string } {
  const entries = Object.keys(files).map((path) => ({ path, classification: classify(path, config) }));
  const documents = entries.filter((entry) => entry.classification.cls === 'live' || entry.classification.cls === 'roadmap')
    .map((entry) => parseDocument(entry.path, files[entry.path] ?? '', entry.classification, { config }));
  return { ...files, 'README.md': spliceIndex(files['README.md'] ?? null, buildIndex({ config, entries, documents })) };
}

export function seedIndex(root: string) {
  const { config } = loadConfig(root);
  if (!config) throw new Error('fixture config must be valid');
  writeFileSync(resolve(root, 'docs/README.md'), spliceIndex(readReadme(root), buildIndex(loadTree(root, config))));
}
