# Struct Docs

A Claude Code plugin for configurable documentation structure and roadmap progress.
It ships six skills: `init`, `audit`, `roadmap`, `review`, `fold` and `execute-roadmap`.
Node 22+ and Claude Code are required. The committed CLI includes Commander and YAML;
plugin users do not run `npm install`.

## Install from git

Clone the repository, then load it for a Claude Code session in your project:

```sh
git clone <repository-url> /path/to/struct-docs
cd /path/to/your-project
claude --plugin-dir /path/to/struct-docs
```

Use `/struct-docs:init` to survey existing content and propose a concrete adoption plan.
Existing structures, inferred ownership topics and migration moves require approval.
The other skills are `/struct-docs:audit`, `/struct-docs:roadmap`,
`/struct-docs:review`, `/struct-docs:fold` and `/struct-docs:execute-roadmap <file>`.
Execution validates the entire dependency graph before changing files or branches, then
works only within the named index or milestone. It never pushes or merges.
The plugin adds no global `CLAUDE.md` or `settings.json` entries.

For local Windows development, an optional junction can give the checkout a stable path.
Choose an unused link location; these commands do not replace an existing directory:

```powershell
$pluginLink = 'C:\plugins\struct-docs'
New-Item -ItemType Directory -Force -Path (Split-Path $pluginLink)
New-Item -ItemType Junction -Path $pluginLink -Target 'C:\developer\struct-docs'
claude --plugin-dir $pluginLink
```

Loading with `--plugin-dir` applies only to that session. No global settings edit is needed.

## CLI and hooks

Run the bundle from the project whose docs you want to inspect:

```sh
node /path/to/struct-docs/bin/docs-lint.mjs init
node /path/to/struct-docs/bin/docs-lint.mjs audit
node /path/to/struct-docs/bin/docs-lint.mjs audit --fix --verbose
node /path/to/struct-docs/bin/docs-lint.mjs check docs/specs/example.md
node /path/to/struct-docs/bin/docs-lint.mjs repair
node /path/to/struct-docs/bin/docs-lint.mjs status docs/roadmaps/v1/index.md
```

`init` previews; `init --apply` applies safe setup after the approved semantic changes.
Audit is silent when clean. Errors exit 1; usage and execution failures exit 2.
Status is read-only and prints the tree and next ready leaf, or the reason none is ready.
Root `.struct-docs.yml` configures document types, fields and exclusions.

Both hooks require the ordered `struct-docs:index` marker pair in `docs/README.md`.
PostToolUse checks only the file written or edited, with bounded feedback. Docs writes
and root config writes set a repository-specific temp sentinel. Stop checks that sentinel
before reading docs, silently repairs derived statuses and index content, and clears it
only after success. Every hook exits zero. Outside edits and git operations do not arm
the sentinel; use `audit --fix` for those changes.

## Development

```sh
npm ci
npm run build
npm run check
claude plugin validate . --strict
```

`npm run check` runs lint, type checking, tests, manifest/path checks and bundle freshness.
The freshness test rebuilds in a temporary directory and compares exact bytes with
`bin/docs-lint.mjs`; regenerate with `npm run build` when stale. Claude plugin validation
is an additional local check when Claude Code is installed. No CI or npm publication
setup is required.

Start at [docs/README.md](docs/README.md) for the generated documentation index and specs.
