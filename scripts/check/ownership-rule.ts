import { defaultConfig } from '../policy/config-defaults.js';
import type { Rule } from '../policy/document.js';
import { canOwnTopics, isTopicList, ownershipValue } from '../policy/ownership-context.js';
import type { OwnershipContext } from '../policy/ownership-context.js';
import { documentFinding } from './document-finding.js';

/** Declared ownership detects overlapping claims, never repeated prose or unclaimed subjects. */
export const ownershipRule: Rule<OwnershipContext> = (document) => {
  if (!document.frontmatter.ok || !canOwnTopics(document, document.context?.config ?? defaultConfig())) return [];
  const topics = document.frontmatter.data.owns;
  if (topics === undefined) return [documentFinding(document, 'ownership', 'missing `owns`')];
  const reason = ownershipValue(topics);
  const invalid = reason ? [documentFinding(document, 'ownership', `\`owns\` ${reason}`, 'owns')] : [];
  if (!isTopicList(topics)) return invalid;
  const context = document.context;
  if (!context) throw new Error('ownership checks require prepared ownership context');
  return [...invalid, ...[...new Set(topics)].flatMap((topic) => {
    const others = (context.topicOwners.get(topic) ?? []).filter((owner) => owner.file !== document.path);
    if (!others.length) return [];
    const owners = others.map((owner) => `${owner.file}:${owner.line}`).join(', ');
    return [documentFinding(document, 'ownership', `topic \`${topic}\` is also owned by ${owners}`, 'owns')];
  })];
};
