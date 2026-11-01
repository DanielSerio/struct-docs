import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

export function tempDocs(files: Record<string, string>, run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-reader-'));
  try {
    for (const [path, source] of Object.entries(files)) {
      const target = join(root, 'docs', path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source);
    }
    run(root);
  } finally {
    assert.equal(relative(tmpdir(), root).startsWith('struct-docs-reader-'), true);
    rmSync(root, { recursive: true, force: true });
  }
}
