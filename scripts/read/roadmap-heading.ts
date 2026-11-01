import type { RoadmapBody, RoadmapNode } from '../policy/roadmap.js';

const heading = /^###\s+(\S+)\s*(?:<!--\s*status:\s*([a-z-]+)\s*-->)?\s*$/;
const statusComment = /<!--\s*status:\s*([a-z-]+)\s*-->/;

/** Ported from manage-docs: keep the exact status token span for safe derived repair. */
export function roadmapHeading(line: string, number: number, findings: RoadmapBody['findings']): RoadmapNode | undefined {
  const match = line.match(heading);
  if (!match) {
    findings.push({ line: number, message: `malformed node heading: \`${line}\`` });
    return undefined;
  }
  const id = match[1] ?? '';
  const status = match[2];
  if (!status) findings.push({ line: number, message: `\`${id}\` has no \`<!-- status: ... -->\`` });
  const comment = line.match(statusComment);
  const start = comment?.index === undefined || !comment[1] ? undefined
    : comment.index + comment[0].indexOf(comment[1]);
  return {
    id, status, line: number, acceptance: [], notes: [], deps: [], locations: {},
    ...(start === undefined || !status ? {} : { statusLoc: { line: number, start, end: start + status.length } }),
  };
}
