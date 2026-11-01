import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Enumerate explicitly: shell glob expansion differs on Windows and Node 22 releases.
function testFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = join(directory, entry.name);
    return entry.isDirectory() ? testFiles(filename) : /\.test\.(?:js|mjs)$/.test(filename) ? [filename] : [];
  });
}
const result = spawnSync(process.execPath, ['--test', ...testFiles('dist'), ...testFiles('tools')], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
