import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { hookFiles, pluginFile } from './plugin-files.mjs';
import { skillFiles } from './plugin-skills.mjs';

/** Development-only checks supplement Claude's schema validator without requiring its install. */
export function validatePlugin(root) {
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
  } catch {
    return ['missing or invalid .claude-plugin/plugin.json'];
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['invalid plugin manifest object'];
  if (manifest.name !== 'struct-docs') errors.push('plugin name must be struct-docs');
  if (manifest.version !== '0.1.0') errors.push('plugin version must be 0.1.0');
  for (const path of ['README.md', 'assets/code-review-v1.md']) pluginFile(root, path, errors);
  const entry = pluginFile(root, 'bin/docs-lint.mjs', errors);
  const commands = new Set();
  if (entry) {
    const result = spawnSync(process.execPath, [entry, '--help'], { encoding: 'utf8', timeout: 5000 });
    if (result.error || result.status !== 0) errors.push('bundled CLI help failed');
    else for (const match of result.stdout.matchAll(/^ {2}([a-z][a-z-]*)\s/gm)) commands.add(match[1]);
  }
  skillFiles(root, commands, errors);
  for (const [event, path, timeout] of [
    ['PostToolUse', 'hooks/post-write-check.mjs', 5], ['Stop', 'hooks/stop-repair.mjs', 15],
  ]) {
    const groups = manifest.hooks?.[event];
    const hooks = Array.isArray(groups) ? groups.flatMap((group) => Array.isArray(group?.hooks) ? group.hooks : []) : [];
    const command = `node "\${CLAUDE_PLUGIN_ROOT}/${path}"`;
    const matches = (hook) => hook?.type === 'command' && hook.command === command && hook.timeout === timeout;
    if (!Array.isArray(groups) || !groups.some((group) =>
      (event !== 'PostToolUse' || group?.matcher === 'Write|Edit') && Array.isArray(group?.hooks) && group.hooks.some(matches))) {
      errors.push(`missing or invalid ${event} hook`);
    }
    if (event === 'PostToolUse' && (!Array.isArray(groups) || !groups.some((group) => group?.matcher === 'Write|Edit'))) {
      errors.push('PostToolUse must match Write|Edit');
    }
    hookFiles(root, path, errors);
    for (const hook of hooks) {
      if (typeof hook?.command !== 'string') continue;
      for (const match of hook.command.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/g)) {
        pluginFile(root, match[1], errors);
      }
    }
  }
  return errors;
}
