import type { Finding } from './findings.js';
import type { IndexInput } from './index.js';

/** Predict only safe file-level status writes; the writer later renders actual fresh values. */
export function projectIndex(input: IndexInput, findings: readonly Finding[]): IndexInput {
  const documents = input.documents.map((document) => {
    const frontmatter = document.frontmatter;
    if (!frontmatter.ok || document.classification.cls !== 'roadmap') return document;
    const location = frontmatter.locations.status;
    const finding = findings.find((item) => item.file === document.path && item.severity === 'repairable' &&
      item.repair.field === 'status' && !item.repair.withheld && item.repair.location?.line === location?.line &&
      item.repair.location?.start === location?.start);
    if (finding?.severity !== 'repairable') return document;
    const token = finding.repair.expected;
    const status = (token[0] === '"' || token[0] === "'") ? token.slice(1, -1) : token;
    return { ...document, frontmatter: { ...frontmatter, data: { ...frontmatter.data, status } } };
  });
  return { ...input, documents };
}
