import { leafSource, rootSource } from './roadmap-checks.js';

export const specSource = (topic = 'accounts', extra = '') =>
  `---\ntitle: Accounts\ntype: spec\npurpose: Account behavior.\nstatus: active\nowns: [${topic}]\n${extra}---\n`;

/** A present index is part of the clean fixture; derived repair will own its block. */
export const cleanAuditFiles = () => ({
  'README.md': '# Documentation\n\n<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->\n',
  'specs/auth.md': specSource(),
  'roadmaps/v1/index.md': rootSource('v1', leafSource(), 'specs: [specs/auth]\n'),
});
