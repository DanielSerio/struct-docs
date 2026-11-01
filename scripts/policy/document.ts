import type { Classification } from './classify.js';
import type { Config } from './config-types.js';
import type { Finding, SourceSpan } from './findings.js';

export type FrontmatterValue = string | readonly string[];
export type FrontmatterResult =
  | { ok: true; data: Readonly<Record<string, FrontmatterValue>>;
      locations: Readonly<Record<string, SourceSpan>>; endLine: number; }
  | { ok: false; line: number; reason: string };
export type DocumentContext = {
  readonly config: Config;
  readonly files?: ReadonlySet<string>;
  readonly documents?: readonly ParsedDocument[];
};
export type ParsedDocument<Context extends DocumentContext = DocumentContext> = {
  readonly path: string;
  readonly source: string;
  readonly lines: readonly string[];
  readonly frontmatter: FrontmatterResult;
  readonly classification: Classification;
  readonly context?: Readonly<Context>;
};

// A rule receives all context explicitly and never owns I/O or command behavior.
export type Rule<Context extends DocumentContext = DocumentContext> =
  (document: ParsedDocument<Context>) => readonly Finding[];
