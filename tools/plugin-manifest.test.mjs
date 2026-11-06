import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { isPending } from '../hooks/pending.mjs';
import { copiedPlugin, repository } from './plugin-files.mjs';
import { validatePlugin } from './plugin-manifest.mjs';

function changeJson(root, relativePath, mutate) {
  const path = join(root, relativePath);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  mutate(value);
  writeFileSync(path, JSON.stringify(value));
}

function changeManifest(root, mutate) {
  changeJson(root, '.claude-plugin/plugin.json', mutate);
}

test('the real plugin and its six auto-discovered skills reference existing bundled commands and assets', () => {
  assert.deepEqual(validatePlugin(repository), []);
  assert.equal(existsSync(join(repository, 'CLAUDE.md')), true);
  assert.equal(existsSync(join(repository, 'AGENTS.md')), true);
  copiedPlugin((install) => {
    assert.deepEqual(validatePlugin(install), []);
    assert.equal(existsSync(join(install, 'CLAUDE.md')), false);
    assert.equal(existsSync(join(install, 'AGENTS.md')), false);
  });
});

test('missing referenced bundle, asset, manifest and hook target fail plugin validation across all hosts', () => {
  for (const path of ['bin/docs-lint.mjs', 'assets/code-review-v1.md', 'hooks/pending.mjs', 'hooks.json']) {
    copiedPlugin((root) => {
      rmSync(join(root, path));
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing referenced file: ${path}`)));
    });
  }
  for (const manifestPath of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.antigravity-plugin/plugin.json']) {
    copiedPlugin((root) => {
      rmSync(join(root, manifestPath));
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing or invalid ${manifestPath}`)));
    });
  }
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => { manifest.hooks.Stop[0].hooks[0].command = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/missing.mjs"'; });
    assert.ok(validatePlugin(root).some((message) => message.includes('hooks/missing.mjs')));
  });
  copiedPlugin((root) => {
    changeJson(root, '.codex-plugin/hooks.json', (config) => {
      config.hooks.Stop[0].hooks[0].command = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/missing-codex.mjs"';
    });
    assert.ok(validatePlugin(root).some((message) => message.includes('hooks/missing-codex.mjs')));
  });
  copiedPlugin((root) => {
    changeJson(root, 'hooks.json', (hooks) => {
      hooks['struct-docs'].Stop[0].command = 'node ./hooks/missing-antigravity.mjs';
    });
    assert.ok(validatePlugin(root).some((message) => message.includes('hooks/missing-antigravity.mjs')));
  });
});

test('a missing skill file, mismatched skill name, or skill set that differs between hosts fails validation', () => {
  copiedPlugin((root) => {
    const path = join(root, 'skills/review/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('name: review', 'name: another-review'));
    assert.ok(validatePlugin(root).some((message) => message.includes('skill directory/name mismatch')));
    rmSync(path);
    assert.ok(validatePlugin(root).some((message) => message.includes('skills/review/SKILL.md')));
  });
  copiedPlugin((root) => {
    rmSync(join(root, 'skills/execute-roadmap/SKILL.md'));
    assert.ok(validatePlugin(root).some((message) => message.includes('skills/execute-roadmap/SKILL.md')));
  });
  for (const [host, manifestPath] of [
    ['claude', '.claude-plugin/plugin.json'],
    ['codex', '.codex-plugin/plugin.json'],
    ['antigravity', '.antigravity-plugin/plugin.json'],
  ]) {
    copiedPlugin((root) => {
      changeJson(root, manifestPath, (manifest) => { manifest.skills = ['./skills/audit', './skills/init']; });
      assert.ok(validatePlugin(root).some((message) => message.includes(`skill set differs between hosts (${host})`)));
    });
    copiedPlugin((root) => {
      mkdirSync(join(root, 'partial-skills/audit'), { recursive: true });
      cpSync(join(root, 'skills/audit/SKILL.md'), join(root, 'partial-skills/audit/SKILL.md'));
      changeJson(root, manifestPath, (manifest) => { manifest.skills = './partial-skills'; });
      assert.ok(validatePlugin(root).some((message) => message.includes(`skill set differs between hosts (${host})`)));
    });
  }
});

test('both hook events and host matchers are required in every host registration', () => {
  for (const event of ['PostToolUse', 'Stop']) {
    copiedPlugin((root) => {
      changeManifest(root, (manifest) => { delete manifest.hooks[event]; });
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing or invalid ${event} hook (claude)`)));
    });
    copiedPlugin((root) => {
      changeJson(root, '.codex-plugin/hooks.json', (config) => { delete config.hooks[event]; });
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing or invalid ${event} hook (codex)`)));
    });
    copiedPlugin((root) => {
      changeJson(root, 'hooks.json', (hooks) => { delete hooks['struct-docs'][event]; });
      assert.ok(validatePlugin(root).some((message) => message.includes(`missing or invalid ${event} hook (antigravity)`)));
    });
  }
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => { manifest.hooks.PostToolUse[0].matcher = 'Read'; });
    assert.ok(validatePlugin(root).some((message) => message.includes('must match Write|Edit')));
  });
  copiedPlugin((root) => {
    changeJson(root, 'hooks.json', (hooks) => { hooks['struct-docs'].PostToolUse[0].matcher = 'write_file'; });
    assert.ok(validatePlugin(root).some((message) => message.includes('must match write_file|edit_file (antigravity)')));
  });
  copiedPlugin((root) => {
    changeManifest(root, (manifest) => {
      manifest.hooks.PostToolUse[0].matcher = 'Read';
      manifest.hooks.PostToolUse.push({ matcher: 'Write|Edit', hooks: [] }, null, { hooks: [null] });
    });
    assert.ok(validatePlugin(root).some((message) => message.includes('missing or invalid PostToolUse hook')));
  });
});

test('skills resolve the CLI relative to SKILL.md without host variables and reject outside or host-variable paths', () => {
  copiedPlugin((root) => {
    const previous = {
      CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT,
      CODEX_PLUGIN_ROOT: process.env.CODEX_PLUGIN_ROOT,
      PLUGIN_ROOT: process.env.PLUGIN_ROOT,
    };
    delete process.env.CLAUDE_PLUGIN_ROOT;
    delete process.env.CODEX_PLUGIN_ROOT;
    delete process.env.PLUGIN_ROOT;
    try {
      assert.deepEqual(validatePlugin(root), []);
      const expected = resolve(root, 'bin/docs-lint.mjs');
      for (const entry of readdirSync(join(root, 'skills'), { withFileTypes: true }).filter((item) => item.isDirectory())) {
        const skillFile = join(root, 'skills', entry.name, 'SKILL.md');
        const source = readFileSync(skillFile, 'utf8');
        const matches = [...source.matchAll(/^[ \t]*node[ \t]+(?:"([^"]+)"|(\S+))[ \t]+([^\s`]+)/gm)];
        assert.ok(matches.length > 0, `expected CLI invocation in ${skillFile}`);
        for (const match of matches) {
          assert.equal(resolve(dirname(skillFile), match[1] ?? match[2]), expected);
        }
      }
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  for (const replacement of ['/bin/docs-lint.mjs" invented-command', '/scripts/commands/manage-docs.mjs" audit']) copiedPlugin((root) => {
    const path = join(root, 'skills/audit/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('/bin/docs-lint.mjs" audit', replacement));
    assert.ok(validatePlugin(root).some((message) => message.includes('unknown bundled command')));
  });
  for (const outside of ['../../../outside/docs-lint.mjs', 'C:/old-plugin/docs-lint.mjs']) copiedPlugin((root) => {
    const path = join(root, 'skills/audit/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('../../bin/docs-lint.mjs', outside));
    const errors = validatePlugin(root);
    assert.ok(errors.some((message) => message.includes('plugin reference must stay inside the install')));
    assert.ok(errors.some((message) => message.includes('unknown bundled command')));
  });
  for (const variable of ['${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs', '$PLUGIN_ROOT/bin/docs-lint.mjs']) copiedPlugin((root) => {
    const path = join(root, 'skills/audit/SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('../../bin/docs-lint.mjs', variable));
    assert.ok(validatePlugin(root).some((message) => message.includes('skill references host variable')));
  });
});

test('a git-style copy runs both real hooks and the bundle without node_modules', () => {
  copiedPlugin((install, container) => {
    assert.deepEqual(validatePlugin(install), []);
    assert.equal(existsSync(join(install, 'node_modules')), false);
    const root = join(container, 'project');
    mkdirSync(join(root, 'docs/specs'), { recursive: true });
    writeFileSync(join(root, 'docs/README.md'), '# Docs\n\n<!-- struct-docs:index -->\n\n<!-- /struct-docs:index -->\n');
    writeFileSync(join(root, 'docs/specs/Bad_Name.md'), '---\ntitle: Example\ntype: spec\nstatus: active\npurpose: Explain policy\nowns: [policy]\n---\n');
    const env = { ...process.env, NODE_PATH: '', CLAUDE_PLUGIN_ROOT: install };
    const post = spawnSync(process.execPath, [join(install, 'hooks/post-write-check.mjs')], {
      cwd: root, env, encoding: 'utf8',
      input: JSON.stringify({ cwd: root, tool_name: 'Write', tool_input: { file_path: 'docs/specs/Bad_Name.md' } }),
    });
    assert.ifError(post.error);
    assert.equal(post.status, 0, post.stderr);
    assert.equal(post.stderr, '');
    assert.match(post.stdout, /specs\/Bad_Name.md:\d+ - .*kebab-case/);
    assert.equal(isPending(root), true);
    const stop = spawnSync(process.execPath, [join(install, 'hooks/stop-repair.mjs')], {
      cwd: root, env, encoding: 'utf8', input: JSON.stringify({ cwd: root }),
    });
    assert.ifError(stop.error);
    assert.equal(stop.status, 0, stop.stderr);
    assert.equal(stop.stdout, '');
    assert.equal(stop.stderr, '');
    assert.equal(isPending(root), false);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /specs\/Bad_Name.md/);
  });
});
