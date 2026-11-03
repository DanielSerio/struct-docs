import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { discoverPlugin } from './discover-plugin.js';

const emittedDiscoveryUrl = pathToFileURL(resolve('assets/project-cli/discover-plugin.mjs')).href;

function withTempHome(run: (home: string) => void | Promise<void>) {
  const home = mkdtempSync(join(tmpdir(), 'struct-docs-discover-'));
  return Promise.resolve()
    .then(() => run(home))
    .finally(() => {
      assert.ok(relative(tmpdir(), home).startsWith('struct-docs-discover-'));
      rmSync(home, { recursive: true, force: true });
    });
}

function createBundle(pluginDir: string) {
  const bundle = join(pluginDir, 'bin', 'docs-lint.mjs');
  mkdirSync(dirname(bundle), { recursive: true });
  writeFileSync(bundle, '#!/usr/bin/env node\n');
  return pluginDir;
}

function writeClaudeRegistry(home: string, content: string) {
  const registry = join(home, '.claude', 'plugins', 'installed_plugins.json');
  mkdirSync(dirname(registry), { recursive: true });
  writeFileSync(registry, content);
}

test('shipped discoverPlugin tries STRUCT_DOCS_ROOT, Claude registry, Claude skill, Codex cache and Antigravity in order', async () => {
  const { discoverPlugin: shippedDiscover } = await import(emittedDiscoveryUrl) as {
    discoverPlugin: typeof discoverPlugin;
  };
  for (const lookup of [discoverPlugin, shippedDiscover]) {
    await withTempHome((home) => {
      const envRoot = createBundle(join(home, 'from-env'));
      const claudeRegRoot = createBundle(join(home, 'from-claude-registry'));
      const claudeSkillRoot = createBundle(join(home, '.claude', 'skills', 'struct-docs'));
      const codexRoot = createBundle(join(home, '.codex', 'plugins', 'cache', 'local', 'struct-docs', '0.1.0'));
      const agyRoot = createBundle(join(home, '.gemini', 'config', 'plugins', 'struct-docs'));
      writeClaudeRegistry(home, JSON.stringify({
        version: 2,
        plugins: {
          'struct-docs@local': [{ scope: 'user', installPath: claudeRegRoot, version: '0.1.0' }],
        },
      }));

      // 1. STRUCT_DOCS_ROOT wins over all other installed locations.
      assert.equal(lookup({ home, env: { STRUCT_DOCS_ROOT: envRoot } }), envRoot);

      // 2. Claude installed_plugins.json wins when STRUCT_DOCS_ROOT is absent.
      assert.equal(lookup({ home, env: {} }), claudeRegRoot);

      // 3. ~/.claude/skills/struct-docs wins when registry candidate is removed.
      rmSync(claudeRegRoot, { recursive: true, force: true });
      assert.equal(lookup({ home, env: {} }), claudeSkillRoot);

      // 4. Codex cache wins when ~/.claude/skills/struct-docs is removed.
      rmSync(claudeSkillRoot, { recursive: true, force: true });
      assert.equal(lookup({ home, env: {} }), codexRoot);

      // 5. Antigravity plugin dir wins when Codex cache is removed.
      rmSync(codexRoot, { recursive: true, force: true });
      assert.equal(lookup({ home, env: {} }), agyRoot);

      // 6. Returns undefined when no candidate remains.
      rmSync(agyRoot, { recursive: true, force: true });
      assert.equal(lookup({ home, env: {} }), undefined);
    });
  }
});

test('invalid candidates fall through and missing or malformed registries return undefined without throwing', async () => {
  await withTempHome((home) => {
    const emptyEnvDir = join(home, 'empty-env');
    mkdirSync(emptyEnvDir, { recursive: true });
    assert.equal(discoverPlugin({ home, env: { STRUCT_DOCS_ROOT: emptyEnvDir } }), undefined);

    writeClaudeRegistry(home, '{ malformed json');
    assert.equal(discoverPlugin({ home, env: {} }), undefined);

    writeClaudeRegistry(home, JSON.stringify({
      version: 2,
      plugins: {
        'struct-docs@local': [{ installPath: join(home, 'missing-install-path') }],
      },
    }));
    const validFallback = createBundle(join(home, '.gemini', 'config', 'plugins', 'struct-docs'));
    assert.equal(discoverPlugin({ home, env: { STRUCT_DOCS_ROOT: emptyEnvDir } }), validFallback);
  });
});

test('highest version wins in Codex cache without writing any install path into the project', async () => {
  await withTempHome((home) => {
    const project = join(home, 'project');
    mkdirSync(project, { recursive: true });
    createBundle(join(home, '.codex', 'plugins', 'cache', 'market', 'struct-docs', '0.1.0'));
    const highest = createBundle(join(home, '.codex', 'plugins', 'cache', 'market', 'struct-docs', '0.10.0'));
    createBundle(join(home, '.codex', 'plugins', 'cache', 'market', 'struct-docs', '0.2.0'));

    assert.equal(discoverPlugin({ home, env: {} }), highest);
    assert.deepEqual(readdirSync(project), []);
  });
});
