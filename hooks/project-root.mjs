// Generated from scripts/read/project-root.ts by npm run build; do not edit.

// scripts/read/project-root.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// scripts/read/containment.ts
import { isAbsolute, sep } from "node:path";
var isWithin = (local) => !isAbsolute(local) && local !== ".." && !local.startsWith(`..${sep}`);

// scripts/read/project-root.ts
function isAdopted(root) {
  try {
    const lines = readFileSync(join(root, "docs", "README.md"), "utf8").split(/\r?\n/).map((line) => line.trim());
    const open = lines.flatMap((line, index) => line === "<!-- struct-docs:index -->" ? [index] : []);
    const close = lines.flatMap((line, index) => line === "<!-- /struct-docs:index -->" ? [index] : []);
    return open.length === 1 && close.length === 1 && Number(open[0]) < Number(close[0]);
  } catch {
    return false;
  }
}
function* ancestors(start) {
  let dir = resolve(start);
  for (; ; ) {
    yield dir;
    const parent = dirname(dir);
    if (parent === dir || existsSync(join(dir, ".git"))) return;
    dir = parent;
  }
}
function findProjectRoot(start) {
  return [...ancestors(start)].find(isAdopted) ?? resolve(start);
}
export {
  ancestors,
  findProjectRoot,
  isAdopted,
  isWithin
};
