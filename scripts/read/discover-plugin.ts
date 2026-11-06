import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export type DiscoverPluginOptions = {
  readonly home?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Project root, for an Antigravity install placed in the workspace. */
  readonly project?: string;
};

function hasBundle(candidate: string | undefined): candidate is string {
  if (!candidate) return false;
  try {
    return statSync(join(candidate, 'bin', 'docs-lint.mjs')).isFile();
  } catch {
    return false;
  }
}

function compareVersionsDesc(left: string, right: string): number {
  const [leftCore = '', leftPre] = left.replace(/^v/i, '').split('-', 2);
  const [rightCore = '', rightPre] = right.replace(/^v/i, '').split('-', 2);
  const coreCmp = rightCore.localeCompare(leftCore, undefined, { numeric: true, sensitivity: 'base' });
  if (coreCmp !== 0) return coreCmp;
  if (leftPre === undefined && rightPre !== undefined) return -1;
  if (leftPre !== undefined && rightPre === undefined) return 1;
  return (rightPre ?? '').localeCompare(leftPre ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Install paths from Claude's registry, in the one layout it writes:
 * `{ plugins: { "<plugin>@<marketplace>": [{ installPath, version }] } }`. Anything else yields none.
 */
function claudeRegistryCandidates(home: string): string[] {
  const registryPath = join(home, '.claude', 'plugins', 'installed_plugins.json');
  try {
    const raw = JSON.parse(readFileSync(registryPath, 'utf8')) as unknown;
    if (!isRecord(raw) || !isRecord(raw.plugins)) return [];
    const matches: { installPath: string; version: string }[] = [];
    for (const [key, items] of Object.entries(raw.plugins)) {
      if (!key.startsWith('struct-docs@') || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const entry = item as Record<string, unknown>;
        if (typeof entry.installPath === 'string' && entry.installPath.trim()) {
          matches.push({
            installPath: entry.installPath,
            version: typeof entry.version === 'string' ? entry.version : '',
          });
        }
      }
    }
    return matches.sort((a, b) => compareVersionsDesc(a.version, b.version)).map((item) => item.installPath);
  } catch {
    return [];
  }
}

/** Versions in Codex's cache, laid out as `cache/<marketplace>/<plugin>/<version>`. */
function codexCacheCandidates(home: string, env: Readonly<Record<string, string | undefined>>): string[] {
  const codexHome = env.CODEX_HOME?.trim() ? env.CODEX_HOME : join(home, '.codex');
  const cacheRoot = join(codexHome, 'plugins', 'cache');
  if (!existsSync(cacheRoot)) return [];
  try {
    const versioned: { path: string; version: string }[] = [];
    for (const marketplace of readdirSync(cacheRoot, { withFileTypes: true })) {
      const pluginDir = join(cacheRoot, marketplace.name, 'struct-docs');
      if (!marketplace.isDirectory() || !existsSync(pluginDir)) continue;
      for (const entry of readdirSync(pluginDir, { withFileTypes: true })) {
        if (entry.isDirectory()) versioned.push({ path: join(pluginDir, entry.name), version: entry.name });
      }
    }
    return versioned.sort((a, b) => compareVersionsDesc(a.version, b.version)).map((item) => item.path);
  } catch {
    return [];
  }
}

/** Locate an installed struct-docs plugin across supported hosts without persisting paths. */
export function discoverPlugin(options: DiscoverPluginOptions = {}): string | undefined {
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;
  const candidates = [
    env.STRUCT_DOCS_ROOT?.trim() ? resolve(env.STRUCT_DOCS_ROOT) : undefined,
    ...claudeRegistryCandidates(home),
    join(home, '.claude', 'skills', 'struct-docs'),
    ...codexCacheCandidates(home, env),
    options.project ? join(options.project, '.agents', 'plugins', 'struct-docs') : undefined,
    join(home, '.gemini', 'config', 'plugins', 'struct-docs'),
  ];
  return candidates.find(hasBundle);
}
