import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cliPath = fileURLToPath(new URL('../bin/docs-lint.mjs', import.meta.url));
const antigravityWriteTools = new Set(['write_file', 'edit_file']);

/**
 * Every observed Antigravity payload carries these two and no Claude or Codex payload does.
 * Requiring more would silently stop the hooks if a later version omits an empty field.
 */
const isAntigravityPayload = (value) => Array.isArray(value.workspacePaths) && typeof value.conversationId === 'string';

/** Extract surviving file paths from a Codex apply_patch command string. */
export function parsePatchFiles(command) {
  if (typeof command !== 'string' || !command.includes('*** Begin Patch')) return [];
  const entries = [];
  for (const rawLine of command.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('*** Add File: ')) {
      entries.push({ path: line.slice('*** Add File: '.length).trim(), deleted: false });
    } else if (line.startsWith('*** Update File: ')) {
      entries.push({ path: line.slice('*** Update File: '.length).trim(), deleted: false });
    } else if (line.startsWith('*** Move to: ')) {
      const moved = line.slice('*** Move to: '.length).trim();
      if (entries.length && !entries[entries.length - 1].deleted) entries[entries.length - 1].path = moved;
      else entries.push({ path: moved, deleted: false });
    } else if (line.startsWith('*** Delete File: ')) {
      entries.push({ path: line.slice('*** Delete File: '.length).trim(), deleted: true });
    }
  }
  return [...new Set(entries.filter((entry) => !entry.deleted && entry.path).map((entry) => entry.path))];
}

/** Normalize Claude Code, Codex and Antigravity payloads before shared hook logic runs. */
export async function readPayload() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  if (isAntigravityPayload(value)) {
    // A multi-root workspace lists every root; a write or a repair may belong to any of them.
    const roots = value.workspacePaths.filter((path) => typeof path === 'string' && path);
    const file = antigravityWriteTools.has(value.toolCall?.name) ? value.toolCall?.args?.Path : undefined;
    return {
      host: 'antigravity',
      roots,
      files: typeof file === 'string' && file ? [file] : [],
      stop: roots.length > 0 && !('toolCall' in value),
    };
  }
  if (typeof value.cwd !== 'string' || !value.cwd) return undefined;
  // Codex's exec_command takes a `workdir`, where a patch's relative headers start. If a payload
  // carries it, try it before the session directory.
  const workdir = value.tool_input?.workdir;
  const roots = typeof workdir === 'string' && workdir ? [resolve(value.cwd, workdir), value.cwd] : [value.cwd];
  const written = (value.tool_name === undefined || ['Write', 'Edit'].includes(value.tool_name)) &&
    typeof value.tool_input?.file_path === 'string' && value.tool_input.file_path;
  const patched = !written && ['Bash', 'apply_patch', 'exec_command'].includes(value.tool_name)
    ? parsePatchFiles(value.tool_input?.command)
    : [];
  return {
    host: 'default',
    roots,
    files: written ? [value.tool_input.file_path] : patched,
    // Patch headers may be relative to a directory the payload does not name.
    patch: patched.length > 0,
    stop: !('tool_name' in value) && !('tool_input' in value),
  };
}

export async function guard(run) {
  try {
    await run();
  } catch {
    // Hooks are unattended feedback; their own failures never interrupt a session.
  }
  process.exitCode = 0;
}
