import { COMMANDER_VERSION } from './package-json.js';

export type HouseStyleRuleName = 'line-length' | 'heading-gap' | 'stale-pointer' | 'file-size';
export const ALL_HOUSE_STYLE_RULES: readonly HouseStyleRuleName[] = [
  'line-length', 'heading-gap', 'stale-pointer', 'file-size',
];

const RULE_EXPORTS: Readonly<Record<HouseStyleRuleName, string>> = {
  'line-length': 'lineLengthRule',
  'heading-gap': 'headingGapRule',
  'stale-pointer': 'stalePointerRule',
  'file-size': 'fileSizeRule',
};

/** Render the private tools/docs-cli/package.json used when the project root has no package.json. */
export function renderPrivatePackageJson(): string {
  return `${JSON.stringify({
    private: true,
    type: 'module',
    dependencies: { commander: COMMANDER_VERSION },
  }, null, 2)}\n`;
}

/** Render the project-owned tools/docs-cli/index.mjs entry point with selected rules and directories. */
export function renderProjectCliIndex(
  rules: readonly HouseStyleRuleName[] = ALL_HOUSE_STYLE_RULES,
  dirs: readonly string[] = ['docs/specs'],
): string {
  const ruleImports = rules.map((name) => `import { ${RULE_EXPORTS[name]} } from './${name}.mjs';`);
  const ruleRefs = rules.map((name) => RULE_EXPORTS[name]).join(', ');
  return [
    '#!/usr/bin/env node',
    "import { spawnSync } from 'node:child_process';",
    "import { dirname, join, resolve } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "import { createCommandShell, registerCommands, runProgram } from './command-shell.mjs';",
    "import { discoverPlugin } from './discover-plugin.mjs';",
    "import { frontmatterFindings, readProjectDocument, readProjectDocuments } from './read-document.mjs';",
    ...ruleImports,
    '',
    `export const DOCS_DIRS = ${JSON.stringify(dirs)};`,
    `const LOCAL_RULES = [${ruleRefs}];`,
    'const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");',
    "const MISSING_PLUGIN_WARNING = 'warning: struct-docs plugin not found; structural checks skipped (install the plugin in a supported host or set STRUCT_DOCS_ROOT)\\n';",
    '',
    'function buildForwardArgs(name, options) {',
    '  const args = [name];',
    "  if (name === 'init' && options.apply) args.push('--apply');",
    "  if (name === 'audit') { if (options.fix) args.push('--fix'); if (options.verbose) args.push('--verbose'); }",
    "  if ((name === 'check' || name === 'status') && options.file) args.push(options.file);",
    '  return args;',
    '}',
    '',
    'function forwardPlugin(name, options, writeErr) {',
    '  const pluginRoot = discoverPlugin();',
    '  if (!pluginRoot) return { discovered: false, stdout: MISSING_PLUGIN_WARNING, exitCode: 0 };',
    "  const bundle = join(pluginRoot, 'bin', 'docs-lint.mjs');",
    "  const result = spawnSync(process.execPath, [bundle, ...buildForwardArgs(name, options)], { cwd: options.root, encoding: 'utf8' });",
    '  if (result.stderr) writeErr(result.stderr);',
    '  const failed = Boolean(result.error) || result.status !== 0;',
    "  return { discovered: true, stdout: result.stdout ?? '', exitCode: failed ? (result.status && result.status > 0 ? result.status : 1) : 0 };",
    '}',
    '',
    'const runDoc = (doc, includeFm) => [...(includeFm ? frontmatterFindings(doc) : []), ...LOCAL_RULES.flatMap((rule) => rule(doc, DOCS_DIRS))];',
    '',
    'export function runLocalCli(args = process.argv.slice(2), options = {}) {',
    '  const root = options.root ?? defaultRoot;',
    '  const writeErr = options.writeErr ?? ((text) => process.stderr.write(text));',
    '  const create = () => {',
    '    const shell = createCommandShell({ ...options, root, handlers: {',
    "      init: (opts) => ({ ...forwardPlugin('init', opts, writeErr), findings: [] }),",
    "      repair: (opts) => ({ ...forwardPlugin('repair', opts, writeErr), findings: [] }),",
    "      status: (opts) => ({ ...forwardPlugin('status', opts, writeErr), findings: [] }),",
    '      audit: (opts) => {',
    "        const fwd = forwardPlugin('audit', opts, writeErr);",
    '        const findings = readProjectDocuments(opts.root, DOCS_DIRS).flatMap((doc) => runDoc(doc, !fwd.discovered));',
    '        return { stdout: fwd.stdout, exitCode: fwd.exitCode, findings };',
    '      },',
    '      check: (opts) => {',
    "        const fwd = forwardPlugin('check', opts, writeErr);",
    '        const doc = opts.file ? readProjectDocument(opts.root, opts.file) : undefined;',
    '        return { stdout: fwd.stdout, exitCode: fwd.exitCode, findings: doc ? runDoc(doc, !fwd.discovered) : [] };',
    '      },',
    '    } });',
    '    registerCommands(shell.program);',
    '    return shell;',
    '  };',
    '  return runProgram(args, create, { writeErr });',
    '}',
    '',
    'if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await runLocalCli();',
    '',
  ].join('\n');
}
