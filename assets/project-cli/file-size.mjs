// scripts/check/house-style-scope.ts
var DEFAULT_HOUSE_STYLE_DIRS = ["docs/specs"];
function inHouseStyleScope(path, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!/\.md$/i.test(normalized) || !normalized.includes("/")) return false;
  const parent = normalized.slice(0, normalized.lastIndexOf("/"));
  return dirs.some((dir) => {
    const clean = dir.replaceAll("\\", "/").replace(/\/+$/, "");
    return parent === clean || clean.startsWith("docs/") && parent === clean.slice(5);
  });
}

// scripts/check/file-size-rule.ts
var FILE_SIZE_LIMIT_MB = 0.05;
var BYTES_PER_MB = 1e6;
function fileSizeRule(document, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const sizeMb = Buffer.byteLength(document.source, "utf8") / BYTES_PER_MB;
  if (sizeMb <= FILE_SIZE_LIMIT_MB) return [];
  return [{
    file: document.path,
    line: 1,
    rule: "file-size",
    severity: "warning",
    message: `${sizeMb.toFixed(3)} MB, over the ${FILE_SIZE_LIMIT_MB} MB guide; split it by topic`
  }];
}
export {
  fileSizeRule
};
