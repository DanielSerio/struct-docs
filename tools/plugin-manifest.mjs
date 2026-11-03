import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { hookFiles, pluginFile } from './plugin-files.mjs';
import { hostSkills, skillFiles } from './plugin-skills.mjs';

const hostManifestPaths = [
  ['claude', '.claude-plugin/plugin.json'],
  ['codex', '.codex-plugin/plugin.json'],
  ['antigravity', '.antigravity-plugin/plugin.json'],
];
const hookSpecs = [['PostToolUse', 'hooks/post-write-check.mjs', 5], ['Stop', 'hooks/stop-repair.mjs', 15]];
const antigravityMatcher = 'write_file|edit_file|write_to_file|replace_file_content|multi_replace_file_content';

function readJsonObject(root, path, errors) {
  try {
    const parsed = JSON.parse(readFileSync(join(root, path), 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // Missing or malformed JSON is reported below.
  }
  errors.push(`missing or invalid ${path}`);
  return undefined;
}

function checkCommandFiles(root, hooks, errors) {
  for (const hook of hooks) {
    if (typeof hook?.command !== 'string') continue;
    for (const match of hook.command.matchAll(/(?:\$\{(?:CLAUDE_)?PLUGIN_ROOT\}|\.)\/([^"\s]+)/g)) {
      pluginFile(root, match[1], errors);
    }
  }
}

function validateHooksObject(root, host, hooksRoot, expectedMatcher, commandFor, errors) {
  for (const [event, path, timeout] of hookSpecs) {
    const groups = hooksRoot?.[event];
    const hooks = Array.isArray(groups)
      ? groups.flatMap((group) => Array.isArray(group?.hooks) ? group.hooks : [group])
      : [];
    const matches = (hook) => hook?.type === 'command' && hook.command === commandFor(path) && hook.timeout === timeout;
    const valid = Array.isArray(groups) && groups.some((group) => event === 'PostToolUse'
      ? group?.matcher === expectedMatcher && Array.isArray(group?.hooks) && group.hooks.some(matches)
      : (Array.isArray(group?.hooks) ? group.hooks.some(matches) : matches(group)));
    if (!valid) errors.push(`missing or invalid ${event} hook (${host})`);
    if (event === 'PostToolUse' && (!Array.isArray(groups) || !groups.some((group) => group?.matcher === expectedMatcher))) {
      errors.push(`PostToolUse must match ${expectedMatcher} (${host})`);
    }
    checkCommandFiles(root, hooks, errors);
  }
}

/** Development-only checks supplement host validators across Claude Code, Codex and Antigravity. */
export function validatePlugin(root) {
  const errors = [];
  const manifests = {};
  for (const [host, path] of hostManifestPaths) {
    const manifest = readJsonObject(root, path, errors);
    if (!manifest) continue;
    manifests[host] = manifest;
    if (manifest.name !== 'struct-docs') errors.push(`plugin name must be struct-docs (${host})`);
    if (manifest.version !== '0.1.0') errors.push(`plugin version must be 0.1.0 (${host})`);
    if (typeof manifest.logo === 'string') pluginFile(root, manifest.logo.replace(/^\.\//, ''), errors);
  }
  if (!manifests.claude) return errors;
  for (const path of ['README.md', 'assets/code-review-v1.md']) pluginFile(root, path, errors);
  const entry = pluginFile(root, 'bin/docs-lint.mjs', errors);
  const commands = new Set();
  if (entry) {
    const result = spawnSync(process.execPath, [entry, '--help'], { encoding: 'utf8', timeout: 5000 });
    if (result.error || result.status !== 0) errors.push('bundled CLI help failed');
    else for (const match of result.stdout.matchAll(/^ {2}([a-z][a-z-]*)\s/gm)) commands.add(match[1]);
  }
  const names = skillFiles(root, commands, errors);
  hostSkills(root, manifests, names, errors);
  for (const [, path] of hookSpecs) hookFiles(root, path, errors);
  for (const [host, matcher] of [['claude', 'Write|Edit'], ['codex', 'Write|Edit|Bash|apply_patch|exec_command']]) {
    const manifest = manifests[host];
    if (!manifest) continue;
    const hooksConfig = typeof manifest.hooks === 'string'
      ? (pluginFile(root, manifest.hooks.replace(/^\.\//, ''), errors)
        ? readJsonObject(root, manifest.hooks.replace(/^\.\//, ''), errors)?.hooks
        : undefined)
      : manifest.hooks;
    validateHooksObject(root, host, hooksConfig, matcher, (path) => `node "\${CLAUDE_PLUGIN_ROOT}/${path}"`, errors);
  }
  if (pluginFile(root, 'hooks.json', errors)) {
    const antigravityHooks = readJsonObject(root, 'hooks.json', errors)?.['struct-docs'];
    validateHooksObject(root, 'antigravity', antigravityHooks, antigravityMatcher, (path) => `node ./${path}`, errors);
  }
  return errors;
}
