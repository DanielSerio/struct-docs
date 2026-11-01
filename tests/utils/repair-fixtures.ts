import { cleanAuditFiles } from './audit-fixtures.js';
import { breakoutSource, leafSource, rootSource } from './roadmap-checks.js';

/** The index is deliberately current for stored todo values, while the child is done. */
export const staleRoadmapFiles = () => cleanAuditFiles({
  'roadmaps/v1/index.md': rootSource('v1', '### milestone <!-- status: todo -->\nBreakout: ./milestone.md\n',
    'specs: [specs/auth]\n').replace('status: todo', 'status: "todo" # stored')
    .replace('---\n', '\uFEFF---\r\n').replace('title: v1\n', 'title: v1\r\n'),
  'roadmaps/v1/milestone.MD': breakoutSource('milestone', leafSource('child', 'done'))
    .replace('status: todo', "status: 'todo' # stored").replaceAll('\n', '\r\n'),
});
