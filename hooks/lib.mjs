import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cliPath = fileURLToPath(new URL('../bin/docs-lint.mjs', import.meta.url));
const antigravityWriteTools = new Set([
  'write_file', 'edit_file', 'write_to_file', 'Write', 'Edit', 'replace_file_content', 'multi_replace_file_content',
]);

/** Only an unambiguous ordered marker pair opts a project into either hook. */
export function isAdopted(root) {
  try {
    const lines = readFileSync(join(root, 'docs/README.md'), 'utf8').split(/\r?\n/).map((line) => line.trim());
    const open = lines.flatMap((line, index) => line === '<!-- struct-docs:index -->' ? [index] : []);
    const close = lines.flatMap((line, index) => line === '<!-- /struct-docs:index -->' ? [index] : []);
    return open.length === 1 && close.length === 1 && open[0] < close[0];
  } catch {
    return false;
  }
}

export function writtenFile(root, value) {
  if (typeof value !== 'string' || !value) return undefined;
  const file = resolve(root, value.replaceAll('\\', '/'));
  try {
    return lstatSync(file).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

export function isUnderDocs(root, file) {
  const path = relative(resolve(root, 'docs'), file);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Extract surviving file paths from a Codex apply_patch command string. */
export function parsePatchFiles(command) {
  if (typeof command !== 'string' || !command.includes('*** Begin Patch')) return [];
  const entries = [];
  for (const rawLine of command.split(/\r?\n|`n/)) {
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
  const isAntigravity = Array.isArray(value.workspacePaths) || 'toolCall' in value ||
    'conversationId' in value || 'terminationReason' in value || 'artifactDirectoryPath' in value;
  if (isAntigravity) {
    const root = Array.isArray(value.workspacePaths) && typeof value.workspacePaths[0] === 'string' &&
      value.workspacePaths[0] ? value.workspacePaths[0] : undefined;
    const args = value.toolCall?.args;
    const file = antigravityWriteTools.has(value.toolCall?.name)
      ? (args?.Path ?? args?.path ?? args?.TargetFile ?? args?.targetFile ?? args?.filePath ?? args?.file_path)
      : undefined;
    return {
      host: 'antigravity',
      root,
      files: typeof file === 'string' && file ? [file] : [],
      result: typeof value.result === 'string' ? value.result : '',
      stop: root !== undefined && !('toolCall' in value),
    };
  }
  if (typeof value.cwd !== 'string' || !value.cwd) return undefined;
  const files = (value.tool_name === undefined || ['Write', 'Edit'].includes(value.tool_name)) &&
    typeof value.tool_input?.file_path === 'string' && value.tool_input.file_path
    ? [value.tool_input.file_path]
    : ['Bash', 'apply_patch', 'exec_command'].includes(value.tool_name)
      ? parsePatchFiles(value.tool_input?.command)
      : [];
  return {
    host: 'default',
    root: value.cwd,
    files,
    result: '',
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
