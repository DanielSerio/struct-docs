import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { applyProjectCli } from './project-cli.js';

const repoRoot = resolve('.');

function withTempProject(run: (root: string) => void | Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'struct-docs-project-cli-'));
  return Promise.resolve()
    .then(() => run(root))
    .finally(() => {
      assert.ok(relative(tmpdir(), root).startsWith('struct-docs-project-cli-'));
      rmSync(root, { recursive: true, force: true });
    });
}

function write(root: string, file: string, content: string) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

test('applying project CLI with package.json writes selected rules, uses project package manager and keeps unrelated scripts byte-for-byte', async () => {
  await withTempProject((root) => {
    const rawScripts = [
      '    "build": "tsc -p tsconfig.build.json",',
      '    "test": "node --test \\"tests/**/*.test.mjs\\" --reporter=spec"',
    ].join('\n');
    const pkgBefore = `{\n  "name": "fixture-app",\n  "scripts": {\n${rawScripts}\n  }\n}\n`;
    write(root, 'package.json', pkgBefore);
    write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');

    const calls: { command: string; args: readonly string[]; cwd: string }[] = [];
    const result = applyProjectCli(root, {
      rules: ['line-length', 'heading-gap'],
      runPackageManager: (command, args, cwd) => { calls.push({ command, args, cwd }); },
    });

    assert.equal(result.packageManager, 'pnpm');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.command, 'pnpm');
    assert.deepEqual(calls[0]?.args.slice(0, 2), ['add', '-D']);
    assert.match(calls[0]?.args[2] ?? '', /^commander@/);

    const pkgAfter = readFileSync(join(root, 'package.json'), 'utf8');
    assert.ok(pkgAfter.includes(rawScripts), 'unrelated scripts must be preserved byte-for-byte');
    const parsed = JSON.parse(pkgAfter) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    assert.equal(parsed.scripts['docs-lint'], 'node tools/docs-cli/index.mjs');
    assert.ok(parsed.devDependencies.commander);

    assert.equal(existsSync(join(root, 'tools/docs-cli/line-length.mjs')), true);
    assert.equal(existsSync(join(root, 'tools/docs-cli/heading-gap.mjs')), true);
    assert.equal(existsSync(join(root, 'tools/docs-cli/stale-pointer.mjs')), false);
    assert.equal(existsSync(join(root, 'tools/docs-cli/file-size.mjs')), false);
  });
});

test('applying project CLI without root package.json writes private tools/docs-cli/package.json and leaves root untouched', async () => {
  await withTempProject((root) => {
    write(root, 'README.md', '# Plain Repo\n');
    applyProjectCli(root, { rules: ['stale-pointer'] });

    assert.deepEqual(readdirSync(root).sort(), ['README.md', 'tools']);
    assert.equal(existsSync(join(root, 'package.json')), false);
    const privatePkg = JSON.parse(readFileSync(join(root, 'tools/docs-cli/package.json'), 'utf8')) as {
      private: boolean;
      type: string;
      dependencies: Record<string, string>;
    };
    assert.equal(privatePkg.private, true);
    assert.equal(privatePkg.type, 'module');
    assert.ok(privatePkg.dependencies.commander);
  });
});

test('generated CLI forwards commands/flags to discovered bundle from project root, runs local rules over project dirs and combines exit codes', async () => {
  await withTempProject((root) => {
    const home = join(root, 'home');
    mkdirSync(home, { recursive: true });
    const proj = join(root, 'project');
    mkdirSync(proj, { recursive: true });

    applyProjectCli(proj, {
      rules: ['line-length', 'heading-gap'],
      dirs: ['docs/specs', 'docs/guides'],
    });
    const cliEntry = join(proj, 'tools/docs-cli/index.mjs');
    const envWithPlugin = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      STRUCT_DOCS_ROOT: repoRoot,
    };

    // 1. Forward init --apply to real bundle from project root.
    write(proj, 'docs/specs/auth.md', '---\ntitle: Auth\ntype: spec\nstatus: active\npurpose: Sign in.\nowns: [auth]\n---\n\n# Auth\n\nClean body.\n');
    const initRun = spawnSync(process.execPath, [cliEntry, 'init', '--apply'], {
      cwd: proj, encoding: 'utf8', env: envWithPlugin,
    });
    assert.equal(initRun.status, 0, initRun.stderr + initRun.stdout);
    assert.match(initRun.stdout, /wrote docs\/README\.md/);

    // 2. Both plugin and local rules pass -> exits 0.
    const cleanAudit = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj, encoding: 'utf8', env: envWithPlugin,
    });
    assert.equal(cleanAudit.status, 0, cleanAudit.stderr + cleanAudit.stdout);
    assert.equal(cleanAudit.stdout, '');

    // 3. Local rule error in project-owned docs/guides/ fails audit even when plugin structural check passes.
    write(proj, '.struct-docs.yml', 'doctypes:\n  guides:\n    type: guide\n    owns: false\n');
    write(proj, 'docs/guides/setup.md', '---\ntitle: Setup\ntype: guide\npurpose: Setup guide.\n---\n\n## Heading\nMissing blank line after heading.\n');
    spawnSync(process.execPath, [cliEntry, 'repair'], { cwd: proj, encoding: 'utf8', env: envWithPlugin });
    const localErrorAudit = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj, encoding: 'utf8', env: envWithPlugin,
    });
    assert.equal(localErrorAudit.status, 1);
    assert.match(localErrorAudit.stdout, /guides\/setup\.md:7 - heading must be followed by a blank line/);

    // 4. Structural error from plugin fails audit even when local rules pass.
    write(proj, 'docs/guides/setup.md', '---\ntitle: Setup\ntype: spec\npurpose: Wrong type for guides.\n---\n\n## Heading\n\nBlank line present.\n');
    const pluginErrorAudit = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj, encoding: 'utf8', env: envWithPlugin,
    });
    assert.equal(pluginErrorAudit.status, 1);
    assert.match(pluginErrorAudit.stdout, /guides\/setup\.md.*expected `guide`/);
  });
});

test('missing plugin warns and exits 0 when local rules pass, local rule errors still exit 1, and a failing discovered plugin exits 1', async () => {
  await withTempProject((root) => {
    const emptyHome = join(root, 'empty-home');
    mkdirSync(emptyHome, { recursive: true });
    const proj = join(root, 'project');
    mkdirSync(proj, { recursive: true });
    applyProjectCli(proj, { rules: ['stale-pointer', 'file-size'] });
    const cliEntry = join(proj, 'tools/docs-cli/index.mjs');

    const envNoPlugin = {
      ...process.env,
      HOME: emptyHome,
      USERPROFILE: emptyHome,
      CODEX_HOME: join(emptyHome, '.codex'),
      STRUCT_DOCS_ROOT: '',
    };

    write(proj, 'docs/specs/clean.md', '---\ntitle: Clean\ntype: spec\nstatus: active\npurpose: Clean.\nowns: [clean]\n---\n\nClean prose.\n');
    const missingClean = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj, encoding: 'utf8', env: envNoPlugin,
    });
    assert.equal(missingClean.status, 0);
    assert.match(missingClean.stdout, /warning:.*install the plugin in a supported host or set STRUCT_DOCS_ROOT/);

    write(proj, 'docs/specs/todo.md', '---\ntitle: Todo\ntype: spec\nstatus: active\npurpose: Todo.\nowns: [todo]\n---\n\nTODO: finish later.\n');
    const missingWithLocalError = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj, encoding: 'utf8', env: envNoPlugin,
    });
    assert.equal(missingWithLocalError.status, 1);
    assert.match(missingWithLocalError.stdout, /STRUCT_DOCS_ROOT/);
    assert.match(missingWithLocalError.stdout, /specs\/todo\.md:9 - defers to later work \("TODO"\)/);

    const brokenPlugin = join(root, 'broken-plugin');
    write(brokenPlugin, 'bin/docs-lint.mjs', 'process.exit(1);\n');
    rmSync(join(proj, 'docs/specs/todo.md'));
    const failingPluginRun = spawnSync(process.execPath, [cliEntry, 'audit'], {
      cwd: proj,
      encoding: 'utf8',
      env: { ...envNoPlugin, STRUCT_DOCS_ROOT: brokenPlugin },
    });
    assert.equal(failingPluginRun.status, 1);
  });
});

test('skills/init/SKILL.md offers the project CLI with selectable rules and applies only what the user approves', () => {
  const skill = readFileSync(join(repoRoot, 'skills/init/SKILL.md'), 'utf8');
  for (const rule of ['line-length', 'heading-gap', 'stale-pointer', 'file-size']) {
    assert.match(skill, new RegExp(rule));
  }
  assert.match(skill, /Apply only what the user approves/);
  assert.match(skill, /tools\/docs-cli\//);
});
