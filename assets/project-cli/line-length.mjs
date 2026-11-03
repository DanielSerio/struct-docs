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
