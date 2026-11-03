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

// scripts/check/heading-gap-rule.ts
function headingGapRule(document, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const findings = [];
  let inCodeBlock = false;
  for (let index = bodyStartLine(document); index < document.lines.length; index += 1) {
    const line = document.lines[index] ?? "";
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.startsWith("#") && index < document.lines.length - 1 && (document.lines[index + 1] ?? "").trim() !== "") {
      findings.push({
        file: document.path,
        line: index + 1,
        rule: "heading-gap",
        severity: "error",
        message: "heading must be followed by a blank line"
      });
    }
  }
  return findings;
}
export {
  headingGapRule
};
