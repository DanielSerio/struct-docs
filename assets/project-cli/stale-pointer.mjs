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

// scripts/check/stale-pointer-rule.ts
var STALE_PATTERNS = [
  { regex: /first milestone/i, label: "first milestone" },
  { regex: /decided later/i, label: "decided later" },
  { regex: /added here later/i, label: "added here later" },
  { regex: /\bTBD\b/, label: "TBD" },
  { regex: /\bTODO\b/, label: "TODO" }
];
function stalePointerRule(document, dirs = DEFAULT_HOUSE_STYLE_DIRS) {
  if (!inHouseStyleScope(document.path, dirs)) return [];
  const findings = [];
  let inCodeBlock = false;
  for (let index = bodyStartLine(document); index < document.lines.length; index += 1) {
    const line = document.lines[index] ?? "";
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || line.includes("stale-pointer")) continue;
    for (const pattern of STALE_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          file: document.path,
          line: index + 1,
          rule: "stale-pointer",
          severity: "error",
          message: `defers to later work ("${pattern.label}")`
        });
      }
    }
  }
  return findings;
}
export {
  stalePointerRule
};
