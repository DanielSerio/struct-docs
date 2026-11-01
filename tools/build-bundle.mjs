import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

/** Fixed inputs and inline notices keep the single distributed artifact reproducible. */
export async function buildBundle(outfile = resolve(repositoryRoot, 'bin/docs-lint.mjs')) {
  const licenses = ['commander', 'yaml'].map((name) => {
    const license = readFileSync(resolve(repositoryRoot, 'node_modules', name, 'LICENSE'), 'utf8');
    return `/*! Bundled ${name}\n${license.replaceAll('\r\n', '\n').trim()}\n*/`;
  }).join('\n');
  return build({
    absWorkingDir: repositoryRoot,
    entryPoints: ['scripts/commands/docs-lint.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    charset: 'utf8',
    legalComments: 'inline',
    sourcemap: false,
    metafile: true,
    banner: { js: `${licenses}\nimport { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);` },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildBundle();
