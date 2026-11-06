// scripts/read/project-document.ts
import { existsSync, lstatSync as lstatSync2, readdirSync, readFileSync, realpathSync } from "node:fs";
import { relative as relative2, resolve as resolve2, sep as sep3 } from "node:path";

// scripts/policy/docs-dir.ts
function docsRelativeDir(dir) {
  const clean = dir.replaceAll("\\", "/");
  if (/^(?:[a-z]:)?\//i.test(clean)) return void 0;
  const parts = clean.split("/").filter((part) => part !== "" && part !== ".");
  if (parts[0] === "docs") parts.shift();
  return parts.includes("..") ? void 0 : parts.join("/");
}

// scripts/read/containment.ts
import { isAbsolute, sep } from "node:path";
var isWithin = (local) => !isAbsolute(local) && local !== ".." && !local.startsWith(`..${sep}`);

// scripts/read/frontmatter-quoted.ts
var backslash = "\\";
var escapeWidths = { x: 2, u: 4, U: 8 };
var escapes = {
  "0": "\0",
  a: "\x07",
  b: "\b",
  t: "	",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r",
  e: "\x1B",
  " ": " ",
  '"': '"',
  "/": "/",
  [backslash]: backslash,
  N: "",
  _: " ",
  L: "\u2028",
  P: "\u2029"
};
function quotedScalar(raw) {
  const quote = raw[0];
  let value = "";
  for (let index = 1; index < raw.length; index += 1) {
    const character = raw[index] ?? "";
    if (character === quote) {
      if (quote === "'" && raw[index + 1] === "'") {
        value += "'";
        index += 1;
        continue;
      }
      return { value, length: index + 1 };
    }
    if (quote === '"' && character === backslash) {
      const escape = raw[++index] ?? "";
      const width = escapeWidths[escape];
      if (width) {
        const digits = raw.slice(index + 1, index + 1 + width);
        if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(digits)) throw new Error("invalid quoted escape");
        const code = Number.parseInt(digits, 16);
        if (code > 1114111 || code >= 55296 && code <= 57343) throw new Error("invalid quoted escape");
        value += String.fromCodePoint(code);
        index += width;
      } else {
        if (!Object.hasOwn(escapes, escape)) throw new Error("invalid quoted escape");
        value += escapes[escape];
      }
    } else value += character;
  }
  throw new Error("unclosed quoted scalar");
}

// scripts/read/frontmatter-value.ts
var onlyComment = (suffix) => suffix.trim() === "" || /^\s+#/.test(suffix);
function scalar(raw, flow) {
  if (raw[0] === '"' || raw[0] === "'") return quotedScalar(raw);
  if (/^!/.test(raw)) throw new Error("tags are outside the subset");
  if (/^-\s/.test(raw)) throw new Error("block sequence - use inline [a, b]");
  if (/^[&*]/.test(raw)) throw new Error("anchors are outside the subset");
  if (/^[|>]/.test(raw)) throw new Error("multi-line scalar is outside the subset");
  if (/^[{[]/.test(raw)) throw new Error("nested value is outside the subset");
  const boundary = flow ? raw.search(/[,\]]/) : -1;
  const candidate = boundary < 0 ? raw : raw.slice(0, boundary);
  const comment = candidate.search(/(^|\s)#/);
  const value = (comment < 0 ? candidate : candidate.slice(0, comment)).trimEnd();
  if (!value) throw new Error("scalar has no value");
  if (/:\s/.test(value) || flow && /[{}[\]]/.test(value)) {
    throw new Error("nested value is outside the subset");
  }
  return { value, length: value.length };
}
function sequence(raw) {
  const value = [];
  let offset = 1;
  let afterComma = false;
  while (offset < raw.length) {
    offset += raw.slice(offset).length - raw.slice(offset).trimStart().length;
    if (raw[offset] === "]") return { value, length: offset + 1 };
    if (afterComma && raw[offset] === ",") throw new Error("empty inline sequence item");
    const token = scalar(raw.slice(offset), true);
    value.push(token.value);
    offset += token.length;
    offset += raw.slice(offset).length - raw.slice(offset).trimStart().length;
    if (raw[offset] === "]") return { value, length: offset + 1 };
    if (raw[offset] !== ",") throw new Error("unclosed inline sequence");
    offset += 1;
    afterComma = true;
  }
  throw new Error("unclosed inline sequence");
}
function frontmatterValue(raw) {
  const token = raw.startsWith("[") ? sequence(raw) : scalar(raw, false);
  if (!onlyComment(raw.slice(token.length))) throw new Error("unexpected text after value");
  return token;
}

// scripts/read/frontmatter.ts
var failure = (line, reason) => ({ ok: false, line, reason });
function parseFrontmatter(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return failure(1, "no frontmatter");
  const data = /* @__PURE__ */ Object.create(null);
  const locations = /* @__PURE__ */ Object.create(null);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const number = index + 1;
    if (line.trim() === "---") {
      return Object.keys(data).length ? { ok: true, data, locations, endLine: number } : failure(number, "empty frontmatter");
    }
    if (!line.trim()) continue;
    if (/^\s/.test(line)) return failure(number, "indented line (nesting is outside the subset)");
    if (line.startsWith("#")) continue;
    if (line.startsWith("- ")) return failure(number, "block sequence - use inline [a, b]");
    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_-]*):(.*)$/);
    if (!match) return failure(number, "not a `key: value` line");
    const key = match[1] ?? "";
    const rest = match[2] ?? "";
    if (Object.hasOwn(data, key)) return failure(number, `duplicate key \`${key}\``);
    const raw = rest.trimStart();
    if (!raw || raw.startsWith("#")) {
      const next = lines[index + 1] ?? "";
      if (/^\s*-\s/.test(next)) return failure(number + 1, "block sequence - use inline [a, b]");
      if (/^\s+\S/.test(next)) return failure(number + 1, "indented line (nesting is outside the subset)");
      return failure(number, `\`${key}\` has no value`);
    }
    try {
      const token = frontmatterValue(raw);
      data[key] = token.value;
      const start = line.indexOf(":") + 1 + rest.length - raw.length;
      locations[key] = { line: number, start, end: start + token.length };
    } catch (error) {
      return failure(number, error instanceof Error ? error.message : "invalid frontmatter value");
    }
  }
  return failure(lines.length, "unterminated frontmatter");
}

// scripts/read/checked-file.ts
import { lstatSync } from "node:fs";
import { relative, resolve, sep as sep2 } from "node:path";
function checkedDocsPath(root, file) {
  const absolute = resolve(root, file.replaceAll("\\", "/"));
  let directory;
  try {
    directory = lstatSync(absolute).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new Error(`no such file: ${file}`);
    throw error;
  }
  if (directory) throw new Error("check requires a file, not a directory");
  const local = relative(resolve(root, "docs"), absolute);
  if (!isWithin(local)) return void 0;
  return local.split(sep2).join("/");
}

// scripts/read/project-document.ts
function parseProjectDocument(path, source) {
  return {
    path,
    source,
    lines: source.split(/\r?\n/),
    frontmatter: parseFrontmatter(source)
  };
}
function frontmatterFindings(document) {
  if (document.frontmatter.ok) return [];
  return [{
    file: document.path,
    line: document.frontmatter.line,
    rule: "frontmatter",
    severity: "error",
    message: `frontmatter: ${document.frontmatter.reason}`
  }];
}
function readDocsSource(root, path) {
  const docs = resolve2(root, "docs");
  const clean = path.replaceAll("\\", "/").replace(/^\.\//, "");
  const rel = clean.startsWith("docs/") ? clean.slice(5) : clean;
  const absolute = resolve2(docs, rel);
  const local = relative2(docs, absolute);
  if (!isWithin(local)) throw new Error("document path must stay inside docs/");
  const normalized = local.split(sep3).join("/");
  try {
    if (lstatSync2(docs).isSymbolicLink()) throw new Error("docs/ must not be a symbolic link");
    if (!isWithin(relative2(realpathSync(docs), realpathSync(absolute)))) {
      throw new Error("document path must stay inside docs/");
    }
    return { path: normalized, source: readFileSync(absolute, "utf8") };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return void 0;
    throw error;
  }
}
function readProjectDocument(root, path) {
  const raw = readDocsSource(root, path);
  return raw ? parseProjectDocument(raw.path, raw.source) : void 0;
}
function readProjectDocuments(root, dirs = ["docs/specs"]) {
  const docs = resolve2(root, "docs");
  if (!existsSync(docs)) return [];
  const documents = [];
  for (const dir of dirs) {
    const relDir = docsRelativeDir(dir);
    if (relDir === void 0) throw new Error(`docs directory must stay inside docs/: ${dir}`);
    const absDir = resolve2(docs, relDir);
    if (!existsSync(absDir)) continue;
    const files = readdirSync(absDir, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.md$/i.test(entry.name)).map((entry) => entry.name).sort();
    for (const name of files) {
      const doc = readProjectDocument(root, relDir ? `${relDir}/${name}` : name);
      if (doc) documents.push(doc);
    }
  }
  return documents;
}
export {
  checkedDocsPath,
  frontmatterFindings,
  parseProjectDocument,
  readDocsSource,
  readProjectDocument,
  readProjectDocuments
};
