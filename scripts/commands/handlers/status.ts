import type { Finding } from '../../policy/findings.js';
import { sortFindings } from '../../policy/finding-order.js';
import { loadConfig } from '../../read/config.js';
import { loadTree } from '../../read/tree.js';
import { formatProgress } from '../../render/progress.js';
import { createRoadmapContext } from '../../roadmap/context.js';
import { unresolvedDeps } from '../../roadmap/deps.js';
import { roadmapFileRule } from '../../roadmap/file-rule.js';
import { roadmapPathKey } from '../../roadmap/files.js';
import { nextReady } from '../../roadmap/next-ready.js';
import { createProgressViews } from '../../roadmap/progress.js';
import { scopeProgress } from '../../roadmap/progress-scope.js';
import { roadmapTreeFindings } from '../../roadmap/tree-checks.js';
import type { CommandOptions, CommandResult } from '../command-types.js';
import { statusPath } from '../status-path.js';

const failure = (file: string, message: string): Finding => ({
  file, line: 1, rule: 'roadmap-status', severity: 'error', message,
});
const cannotModel = (findings: readonly Finding[]): CommandResult => ({ findings: sortFindings(findings.map((finding) =>
  ({ ...finding, message: `${finding.message}; run docs-lint audit` }))) });

/** Status validates only model inputs; unrelated audit errors and stale derived copies do not hide progress. */
export function run(options: CommandOptions): CommandResult {
  const file = options.file === undefined ? undefined : statusPath(options.root, options.file);
  const { config, findings } = loadConfig(options.root);
  if (!config) return { findings };
  const tree = loadTree(options.root, config);
  const context = { ...createRoadmapContext(config, tree.documents), files: new Set(tree.files) };
  const actualFile = context.roadmapDocuments.find((document) => file !== undefined && /\.md$/i.test(file)
    && /\.md$/i.test(document.path) && roadmapPathKey(document.path) === roadmapPathKey(file))?.path ?? file;
  const paths = new Set(context.roadmapDocuments.map((document) => document.path));
  const invalid = [...tree.findings.filter((finding) => paths.has(finding.file)),
    ...context.roadmapDocuments.flatMap((document) => roadmapFileRule(document)),
    ...roadmapTreeFindings(context), ...unresolvedDeps(context.roadmaps, context.depIndex)];
  if (invalid.length) return cannotModel(invalid);
  try {
    const views = createProgressViews(new Map([...context.models].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
    const scopes = views.flatMap((view) => {
      const scope = scopeProgress(view, actualFile);
      return scope ? [scope] : [];
    });
    if (file && !scopes.length) return cannotModel([failure(file, 'file is not a modeled roadmap root or breakout')]);
    const reports = scopes.map((scope) => formatProgress(scope, nextReady(scope, context.depIndex)));
    return { findings: [], stdout: reports.length ? `${reports.join('\n\n')}\n` : 'No roadmaps found.\n' };
  } catch (error) {
    return cannotModel([failure(file ?? 'roadmaps', error instanceof Error ? error.message : String(error))]);
  }
}
