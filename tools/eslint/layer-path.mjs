import path from 'node:path';

// Anchor at the checkout, not at the first ancestor that happens to be named scripts.
export function layerOf(filename, root) {
  const parts = path.relative(root, filename).split(path.sep);
  if (parts[0] !== 'scripts') return null;
  return parts.length > 2 ? parts[1] : '<root>';
}
