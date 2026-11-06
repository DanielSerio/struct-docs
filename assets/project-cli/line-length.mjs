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
function bodyStartLine(document) {
  if (document.frontmatter.ok) return document.frontmatter.endLine;
  if (document.lines[0]?.trim() !== "---") return 0;
  const closing = document.lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return closing === -1 ? document.lines.length : closing + 1;
}

// scripts/check/line-length-rule.ts
var MAX_LINE_LENGTH = 100;
function lineLengthRule(document, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const findings = [];
  let inCodeBlock = false;
  for (let index = bodyStartLine(document); index < document.lines.length; index += 1) {
    const line = document.lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || trimmed.startsWith("|") || line.startsWith("#")) continue;
    if (line.length > MAX_LINE_LENGTH) {
      findings.push({
        file: document.path,
        line: index + 1,
        rule: "line-length",
        severity: "error",
        message: `line is ${line.length} characters (max ${MAX_LINE_LENGTH})`
      });
    }
  }
  return findings;
}
export {
  lineLengthRule
};
