import type { Config } from './config-types.js';
import { compileIgnores } from './ignore-patterns.js';

export type Classification =
  | { cls: 'live'; type: string; owns: boolean; gitignored: boolean }
  | { cls: 'ungoverned'; excluded?: true }
  | { cls: 'forbidden'; reason: string };

const excluded = { cls: 'ungoverned', excluded: true } as const;
const unrouted = { cls: 'ungoverned' } as const;
const normalize = (path: string) =>
  path.replaceAll('\\', '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
const isUnroutedResult = (result: Classification) =>
  result.cls === 'ungoverned' && !result.excluded;

/** Ported from manage-docs: decide policy once, before applying document checks. */
export function classify(relative: string, config: Config, ignores = compileIgnores(config.ignore)): Classification {
  const path = normalize(relative);
  const segments = path.split('/');
  const [directory = '', ...rest] = segments;

  // Root restrictions cannot be silenced by ignores, dotfiles or asset extensions.
  if (segments.length === 1) {
    if (path === 'README.md') return excluded;
    if (path === 'open-questions.md') {
      return { cls: 'live', type: 'questions', owns: false, gitignored: false };
    }
    return { cls: 'forbidden', reason: 'root-level file - route it into a subdirectory' };
  }

  if (directory === 'living' || directory === 'templates') return excluded;
  if (segments.some((segment) => segment.startsWith('.')) || !path.endsWith('.md')) return excluded;
  // Even a caller-supplied ignore cannot opt a roadmap out of locked structure.
  if (directory === 'roadmaps') {
    return rest.length >= 2
      ? { cls: 'live', type: 'roadmap-tree', owns: false, gitignored: false }
      : unrouted;
  }
  if (ignores.some((pattern) => pattern.test(path))) return excluded;

  const doctype = Object.hasOwn(config.doctypes, directory) ? config.doctypes[directory] : undefined;
  if (!doctype || rest.length !== 1) return unrouted;
  return { cls: 'live', type: doctype.type, owns: doctype.owns, gitignored: doctype.gitignored };
}

/** Init and audit share this predicate rather than reconstructing path policy. */
export const isUnrouted = (relative: string, config: Config) =>
  isUnroutedResult(classify(relative, config));

/** A tree walk compiles patterns once, while all decisions still go through classify. */
export function createClassifier(config: Config) {
  const ignores = compileIgnores(config.ignore);
  const classifyPath = (relative: string) => classify(relative, config, ignores);
  return {
    classify: classifyPath,
    isUnrouted: (relative: string) => isUnroutedResult(classifyPath(relative)),
  };
}
