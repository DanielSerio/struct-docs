import { classify } from './classify.js';
import type { Config } from './config-types.js';
import type { DocumentContext, ParsedDocument } from './document.js';
import { isKebabCase } from './kebab-case.js';

const isTopic = (value: unknown): value is string => typeof value === 'string' && isKebabCase(value);

export type TopicOwner = { file: string; line: number };
export type OwnershipContext = DocumentContext & {
  readonly topicOwners: ReadonlyMap<string, readonly TopicOwner[]>;
};

/** Ownership is limited to shared governed paths, even when a caller supplies stale metadata. */
export function canOwnTopics(document: ParsedDocument, config: Config) {
  const declared = document.classification;
  const current = classify(document.path, config);
  return declared.cls === 'live' && declared.owns && !declared.gitignored &&
    current.cls === 'live' && current.owns && !current.gitignored;
}

export const isTopicList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isTopic);

export function ownershipValue(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return 'must be a nonempty list of kebab-case topics';
  if (!value.every(isTopic)) {
    return 'must contain only kebab-case topic strings';
  }
  if (new Set(value).size !== value.length) return 'must not repeat a topic within one document';
  return null;
}

/** Prepare claims once; one file is one owner regardless of repeated metadata or input entries. */
export function createOwnershipContext(config: Config, documents: readonly ParsedDocument[]): OwnershipContext {
  const topicOwners = new Map<string, TopicOwner[]>();
  for (const document of documents) {
    if (!document.frontmatter.ok || !canOwnTopics(document, config)) continue;
    const topics = document.frontmatter.data.owns;
    if (!isTopicList(topics)) continue;
    const owner = { file: document.path, line: document.frontmatter.locations.owns?.line ?? 1 };
    for (const topic of new Set<string>(topics)) {
      const owners = topicOwners.get(topic) ?? [];
      if (!owners.some((entry) => entry.file === owner.file)) owners.push(owner);
      topicOwners.set(topic, owners);
    }
  }
  for (const owners of topicOwners.values()) {
    owners.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);
  }
  return { config, documents, topicOwners };
}
