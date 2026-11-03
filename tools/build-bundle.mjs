import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export const projectCliEntries = [
  ['command-shell.mjs', 'scripts/commands/command-shell.ts'],
  ['discover-plugin.mjs', 'scripts/read/discover-plugin.ts'],
  ['read-document.mjs', 'scripts/read/project-document.ts'],
  ['report.mjs', 'scripts/render/report.ts'],
  ['line-length.mjs', 'scripts/check/line-length-rule.ts'],
  ['heading-gap.mjs', 'scripts/check/heading-gap-rule.ts'],
  ['stale-pointer.mjs', 'scripts/check/stale-pointer-rule.ts'],
  ['file-size.mjs', 'scripts/check/file-size-rule.ts'],
];

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

/** Emit the copyable project CLI kit as plain ESM from the same TypeScript sources. */
export async function buildProjectCliAssets(outdir = resolve(repositoryRoot, 'assets/project-cli')) {
  const results = {};
  for (const [name, entry] of projectCliEntries) {
    results[name] = await build({
      absWorkingDir: repositoryRoot,
      entryPoints: [entry],
      outfile: resolve(outdir, name),
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      charset: 'utf8',
      sourcemap: false,
      metafile: true,
      external: ['commander'],
      plugins: [{
        name: 'project-cli-internals',
        setup(builder) {
          builder.onResolve({ filter: /\/render\/report\.js$/ }, () => ({
            path: './report.mjs',
            external: true,
          }));
        },
      }],
    });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildBundle();
  await buildProjectCliAssets();
}
