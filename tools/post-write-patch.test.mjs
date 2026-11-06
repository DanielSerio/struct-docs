import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { clearPending, isPending, sentinelPath } from '../hooks/pending.mjs';
import { fixture, invoke, source, write } from './post-write-fixture.mjs';

/** A Codex patch command adding each header, as its PostToolUse payload carries it. */
const patchOf = (...headers) => ['*** Begin Patch', ...headers.map((path) => `*** Add File: ${path}\n+# x`), '*** End Patch'].join('\n');

test('a multi-file Codex apply_patch checks each surviving docs file and arms the sentinel once', () => {
  fixture((root) => {
    write(root, 'docs/specs/Added_Bad.md', source('spec'));
    write(root, 'docs/specs/Deleted_Bad.md', source('review'));
    write(root, 'docs/specs/Moved_Bad.md', source('review'));
    write(root, 'src/index.ts', 'export const x = 1;\n');
    const countFile = join(root, 'sentinel-writes');
    writeFileSync(countFile, '0');
    const preload = write(root, 'count-sentinel.mjs', `import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const orig = fs.writeFileSync;
fs.writeFileSync = (target, data, ...rest) => {
  if (String(target) === process.env.SENTINEL_TARGET) {
    const n = Number(fs.readFileSync(process.env.SENTINEL_COUNT, 'utf8')) + 1;
    orig(process.env.SENTINEL_COUNT, String(n));
  }
  return orig(target, data, ...rest);
};
syncBuiltinESMExports();`);
    const patch = [
      'apply_patch <<\'PATCH\'',
      '*** Begin Patch',
      '*** Add File: docs/specs/Added_Bad.md',
      '+# Added',
      '*** Delete File: docs/specs/Deleted_Bad.md',
      '-# Deleted',
      '*** Update File: docs/specs/Old_Name.md',
      '*** Move to: docs/specs/Moved_Bad.md',
      '@@',
      '+# Moved',
      '*** Update File: src/index.ts',
      '@@',
      '+export const y = 2;',
      '*** End Patch',
      'PATCH',
    ].join('\n');
    const output = invoke(root, '', {
      raw: JSON.stringify({ cwd: root, tool_name: 'Bash', tool_input: { command: patch } }),
      flags: ['--import', pathToFileURL(preload).href],
      env: { SENTINEL_TARGET: sentinelPath(root), SENTINEL_COUNT: countFile },
    });
    assert.match(output, /specs\/Added_Bad\.md:\d+ - .*kebab-case/);
    assert.match(output, /specs\/Moved_Bad\.md:\d+ - .*kebab-case/);
    assert.match(output, /specs\/Moved_Bad\.md:\d+ - .*type `review`/);
    assert.doesNotMatch(output, /Deleted_Bad|Old_Name/);
    assert.equal(isPending(root), true);
    assert.equal(readFileSync(countFile, 'utf8'), '1');
  });
});

test('a patch from a subdirectory checks a workdir path and still arms for an unresolved one', () => {
  fixture((root) => {
    write(root, 'docs/specs/Bad_Name.md', source('review'));
    // A `workdir`, when the payload carries one, is where relative headers start.
    const viaWorkdir = invoke(root, '', { raw: JSON.stringify({ cwd: root, tool_name: 'Bash',
      tool_input: { command: patchOf('specs/Bad_Name.md'), workdir: 'docs' } }) });
    assert.match(viaWorkdir, /specs\/Bad_Name\.md:\d+ - .*kebab-case/);
    assert.equal(isPending(root), true);
    clearPending(root);
    // A `cd` inside the command leaves headers that resolve nowhere: nothing to check, but
    // a docs-looking path still arms the session's project so Stop repairs it.
    const viaCd = (header) => invoke(root, '', { raw: JSON.stringify({ cwd: root, tool_name: 'Bash',
      tool_input: { command: `cd notes && apply_patch <<'PATCH'\n${patchOf(header)}\nPATCH` } }) });
    assert.equal(viaCd('../src/index.ts'), '');
    assert.equal(isPending(root), false);
    assert.equal(viaCd('../docs/specs/Bad_Name.md'), '');
    assert.equal(isPending(root), true);
  });
});

test('checks share one deadline so the hook prints before the host timeout', () => {
  fixture((root) => {
    const files = ['A_Bad.md', 'B_Bad.md', 'C_Bad.md'].map((name) => `docs/specs/${name}`);
    for (const file of files) write(root, file, source());
    // Each stubbed check reports one finding and takes three seconds of a faked clock.
    const preload = write(root, 'slow-check.mjs', `import childProcess from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {basename} from 'node:path';
const now = Date.now;
let offset = 0;
Date.now = () => now() + offset;
childProcess.spawnSync = (command, args, options) => {
  appendFileSync(process.env.CHECK_PROBE, options.timeout + '\\n');
  offset += 3000;
  return {status: 1, stdout: 'specs/' + basename(args[2]) + ':1 - problem\\n'};
};
syncBuiltinESMExports();`);
    const probe = join(root, 'timeouts');
    const output = invoke(root, '', {
      raw: JSON.stringify({ cwd: root, tool_name: 'Bash', tool_input: { command: patchOf(...files) } }),
      flags: ['--import', pathToFileURL(preload).href], env: { CHECK_PROBE: probe },
    });
    const timeouts = readFileSync(probe, 'utf8').trim().split('\n').map(Number);
    assert.equal(timeouts.length, 2, 'the third check starts after the deadline and is skipped');
    assert.ok(timeouts[0] > 3000 && timeouts[0] <= 4000 && timeouts[1] <= 1000, String(timeouts));
    assert.equal(output, 'specs/A_Bad.md:1 - problem\nspecs/B_Bad.md:1 - problem\n');
    assert.equal(isPending(root), true);
  });
});
