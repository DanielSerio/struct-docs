// scripts/policy/docs-dir.ts
function docsRelativeDir(dir) {
  const clean = dir.replaceAll("\\", "/");
  if (/^(?:[a-z]:)?\//i.test(clean)) return void 0;
  const parts = clean.split("/").filter((part) => part !== "" && part !== ".");
  if (parts[0] === "docs") parts.shift();
  return parts.includes("..") ? void 0 : parts.join("/");
}

// scripts/check/house-style-scope.ts
var DEFAULT_HOUSE_STYLE_DIRS = ["docs/specs"];
function inHouseStyleScope(path, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  const normalized = path.replaceAll("\\", "/");
  if (!/\.md$/i.test(normalized)) return false;
  const parent = docsRelativeDir(normalized.slice(0, Math.max(normalized.lastIndexOf("/"), 0)));
  return parent !== void 0 && dirs.some((dir) => docsRelativeDir(dir) === parent);
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
