// scripts/read/discover-plugin.ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
function hasBundle(candidate) {
  if (!candidate) return false;
  try {
    return statSync(join(candidate, "bin", "docs-lint.mjs")).isFile();
  } catch {
    return false;
  }
}
function compareVersionsDesc(left, right) {
  const [leftCore = "", leftPre] = left.replace(/^v/i, "").split("-", 2);
  const [rightCore = "", rightPre] = right.replace(/^v/i, "").split("-", 2);
  const coreCmp = rightCore.localeCompare(leftCore, void 0, { numeric: true, sensitivity: "base" });
  if (coreCmp !== 0) return coreCmp;
  if (leftPre === void 0 && rightPre !== void 0) return -1;
  if (leftPre !== void 0 && rightPre === void 0) return 1;
  return (rightPre ?? "").localeCompare(leftPre ?? "", void 0, { numeric: true, sensitivity: "base" });
}
var isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function claudeRegistryCandidates(home) {
  const registryPath = join(home, ".claude", "plugins", "installed_plugins.json");
  try {
    const raw = JSON.parse(readFileSync(registryPath, "utf8"));
    if (!isRecord(raw) || !isRecord(raw.plugins)) return [];
    const matches = [];
    for (const [key, items] of Object.entries(raw.plugins)) {
      if (!key.startsWith("struct-docs@") || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const entry = item;
        if (typeof entry.installPath === "string" && entry.installPath.trim()) {
          matches.push({
            installPath: entry.installPath,
            version: typeof entry.version === "string" ? entry.version : ""
          });
        }
      }
    }
    return matches.sort((a, b) => compareVersionsDesc(a.version, b.version)).map((item) => item.installPath);
  } catch {
    return [];
  }
}
function codexCacheCandidates(home, env) {
  const codexHome = env.CODEX_HOME?.trim() ? env.CODEX_HOME : join(home, ".codex");
  const cacheRoot = join(codexHome, "plugins", "cache");
  if (!existsSync(cacheRoot)) return [];
  try {
    const versioned = [];
    for (const marketplace of readdirSync(cacheRoot, { withFileTypes: true })) {
      const pluginDir = join(cacheRoot, marketplace.name, "struct-docs");
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
function discoverPlugin(options = {}) {
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;
  const candidates = [
    env.STRUCT_DOCS_ROOT?.trim() ? resolve(env.STRUCT_DOCS_ROOT) : void 0,
    ...claudeRegistryCandidates(home),
    join(home, ".claude", "skills", "struct-docs"),
    ...codexCacheCandidates(home, env),
    options.project ? join(options.project, ".agents", "plugins", "struct-docs") : void 0,
    join(home, ".gemini", "config", "plugins", "struct-docs")
  ];
  return candidates.find(hasBundle);
}
export {
  discoverPlugin
};
