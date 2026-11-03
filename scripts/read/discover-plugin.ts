import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export type DiscoverPluginOptions = {
  readonly home?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
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

function claudeRegistryCandidates(home: string): string[] {
  const registryPath = join(home, '.claude', 'plugins', 'installed_plugins.json');
  try {
    const raw = JSON.parse(readFileSync(registryPath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const record = raw as Record<string, unknown>;
    const plugins = record.plugins && typeof record.plugins === 'object' && !Array.isArray(record.plugins)
      ? (record.plugins as Record<string, unknown>)
      : record;
    const matches: { installPath: string; version: string }[] = [];
    for (const [key, value] of Object.entries(plugins)) {
      if (key !== 'struct-docs' && !key.startsWith('struct-docs@')) continue;
      const items = Array.isArray(value) ? value : [value];
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

function codexCacheCandidates(home: string, env: Readonly<Record<string, string | undefined>>): string[] {
  const codexHome = env.CODEX_HOME?.trim() ? env.CODEX_HOME : join(home, '.codex');
  const cacheRoot = join(codexHome, 'plugins', 'cache');
  if (!existsSync(cacheRoot)) return [];
  try {
    const versioned: { path: string; version: string }[] = [];
    const collectVersions = (pluginDir: string) => {
      for (const entry of readdirSync(pluginDir, { withFileTypes: true })) {
        if (entry.isDirectory()) versioned.push({ path: join(pluginDir, entry.name), version: entry.name });
      }
    };
    for (const entry of readdirSync(cacheRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'struct-docs') {
        collectVersions(join(cacheRoot, entry.name));
        continue;
      }
      const nested = join(cacheRoot, entry.name, 'struct-docs');
      if (existsSync(nested)) collectVersions(nested);
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
    join(home, '.gemini', 'config', 'plugins', 'struct-docs'),
    join(home, '.antigravity', 'plugins', 'struct-docs'),
  ];
  return candidates.find(hasBundle);
}
