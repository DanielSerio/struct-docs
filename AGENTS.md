# Repository Guidelines

## Project Structure & Module Organization

Struct Docs is a coding-agent plugin with a bundled Node.js CLI, built for Claude Code, Codex and Antigravity; Claude Code is the only supported host until the `multi-host` milestone lands. TypeScript source lives in `scripts/`, organized into `policy`, `read`, `render`, `roadmap`, `check`, `repair`, and `commands` layers. ESLint enforces their import boundaries (`tools/eslint/layer-imports.mjs`); see `docs/specs/cli.md` before changing dependencies, and add a new layer to that rule before using it.

`skills/` contains six workflows; `hooks/` contains dependency-free hook entry points. `.claude-plugin/plugin.json` registers the plugin. Keep skills and hooks portable across hosts: host differences belong only in manifests and hook payload adapters (`docs/specs/packaging.md`). `assets/` holds the review template, and `bin/docs-lint.mjs` is the committed distribution bundle. Tests are colocated with source and in `tests/`; development utilities and additional tests live in `tools/`. Treat `dist/` as disposable test output. Start documentation discovery at `docs/README.md`.

## Build, Test, and Development Commands

Use Node.js 22 or later.

- `npm ci`: install pinned development dependencies.
- `npm run build`: regenerate the committed CLI bundle with esbuild. Run it after any change under `scripts/`, or the freshness check fails.
- `npm run check`: run ESLint, TypeScript checking, tests, manifest/path validation, and bundle freshness checks. This is the gate.
- `npm test`: clean and compile test output, then run Node's test runner.
- `npm run docs-lint -- audit`: audit this repository; clean output is silent.
- `npm run rehearse:execution -- success`: create an isolated Git rehearsal; variants include `failed-check` and `decision` (see `tests/fixtures/execution/README.md`).
- `claude plugin validate . --strict`: validate plugin metadata when Claude Code is available.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single-quoted strings, and kebab-case filenames. TypeScript uses NodeNext resolution, so relative imports end in `.js`. Prefer inference and literal unions; never use explicit TypeScript `any` or enums. Keep solutions simple, modular, and documented with useful rationale comments. Follow SOLID, YAGNI, and DRY principles.

Source files are limited to 99 code lines, excluding blank lines/comments; tests allow 300, and constant files are exempt. Keep rules pure: a rule takes one parsed document and returns findings, and never touches the filesystem, prints, or imports Commander. Filesystem access and command orchestration belong in their designated layers.

## Testing Guidelines

Use Node's built-in test runner and `node:assert/strict`. Name tests `*.test.ts` or `*.test.mjs`: `*.test.ts` files are compiled into `dist/` before they run, while `tools/**/*.test.mjs` run directly. Test observable behavior, process exits, preservation of authored content, and repair idempotence. No numeric coverage threshold is configured. Regenerate the bundle before checking CLI changes; freshness tests compare exact bytes.

## Documentation

This repository is checked by its own CLI. After editing `docs/`, run `npm run docs-lint -- audit --fix`, then `npm run docs-lint -- audit`, which must print nothing. Only leaf statuses in roadmaps are authored; parent, breakout-file and root statuses, and the index block in `docs/README.md`, are derived by the CLI and never hand-edited.

Specs in `docs/specs/` are normative. When code and a spec disagree, change the code, and ask before editing a spec. Ask about undecided behavior; only questions the user cannot answer go in `docs/open-questions.md`.

## Commit & Pull Request Guidelines

Work on a `work/<milestone>` branch with one commit per verified task, and fast-forward into `main` only when asked. Use imperative, descriptive commit subjects, such as `Add read-only execution preflight`. Keep commits scoped to verified work. PR descriptions should explain the problem, resulting behavior, relevant specs, and validation performed. Include linked issues when applicable; screenshots are generally unnecessary for this CLI plugin. Follow `docs/specs/execute-roadmap.md` for roadmap execution, including delegated tasks and verified task commits. Never push, and never merge without authorization.
