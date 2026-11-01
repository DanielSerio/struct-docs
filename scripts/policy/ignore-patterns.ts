// Ported from manage-docs/scripts/policy/docsignore.mjs (originally clean-docs).
// Keep its narrow wildcard language: widening a match silently excludes more docs.
const segmentToRegExp = (segment: string) =>
  segment.replace(/[.+^${}()|[\]?\\]/g, '\\$&').split('*').join('[^/]*');

export function patternToRegExp(pattern: string) {
  // Every pattern anchors at docs/. A leading slash only makes that explicit.
  let body = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  const directoryOnly = body.endsWith('/');
  if (directoryOnly) body = body.slice(0, -1);
  const segments = body.split('/');
  const source = segments.map((segment, index) => {
    const last = index === segments.length - 1;
    if (segment !== '**') return segmentToRegExp(segment) + (last ? '' : '/');
    return last ? '.*' : '(?:[^/]+/)*';
  }).join('');
  return new RegExp(`^${source}${directoryOnly ? '(/|$)' : '$'}`);
}

// YAML already handles comments and list syntax; only compile its supplied strings.
export const compileIgnores = (patterns: readonly string[]) => patterns.map(patternToRegExp);
