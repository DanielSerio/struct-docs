# Struct Docs

A coding-agent plugin for configurable documentation structure and roadmap progress, built
for Claude Code, Codex and Antigravity.
It ships six skills: `init`, `audit`, `roadmap`, `review`, `fold` and `execute-roadmap`.
Node 22+ is required. The committed CLI includes Commander and YAML;
plugin users do not run `npm install`.

## Install from git

Clone the repository once:

```sh
git clone <repository-url> /path/to/struct-docs
```

### Claude Code

Load the checkout for a session in your project:

```sh
cd /path/to/your-project
claude --plugin-dir /path/to/struct-docs
```

For local Windows development, an optional junction can give the checkout a stable path.
Choose an unused link location; these commands do not replace an existing directory:

```powershell
$pluginLink = 'C:\plugins\struct-docs'
New-Item -ItemType Directory -Force -Path (Split-Path $pluginLink)
New-Item -ItemType Junction -Path $pluginLink -Target 'C:\developer\struct-docs'
claude --plugin-dir $pluginLink
```

Loading with `--plugin-dir` applies only to that session. No global `CLAUDE.md` or
`settings.json` edit is needed. It records no install, so if `init` generates a project CLI,
set `STRUCT_DOCS_ROOT=/path/to/struct-docs` where you commit, or its structural checks are skipped.

### Codex

Register a local marketplace directory pointing at the cloned plugin and install it:

```sh
mkdir -p /path/to/marketplace/.agents/plugins /path/to/marketplace/plugins
git clone <repository-url> /path/to/marketplace/plugins/struct-docs
printf '%s\n' '{"name":"local","plugins":[{"name":"struct-docs","source":{"source":"local","path":"./plugins/struct-docs"}}]}' > /path/to/marketplace/.agents/plugins/marketplace.json
codex plugin marketplace add /path/to/marketplace
codex plugin add struct-docs@local
```

Enable Codex hooks with `codex --enable hooks` (or set `codex_hooks = true` under `[features]`
in `~/.codex/config.toml`). Codex fingerprints plugin hooks and requires hook trust before
running `PostToolUse` and `Stop`: approve the hook trust prompt when starting a session in
your project, or pass `--dangerously-bypass-hook-trust` for non-interactive `codex exec` runs.

### Antigravity

Install the cloned plugin into Antigravity's plugin directory (or place a copy under
`<your-project>/.agents/plugins/struct-docs`):

```sh
agy plugin install /path/to/struct-docs
```

### Skills

Use `/struct-docs:init` (`$struct-docs:init` in Codex, or the `init` skill in Antigravity)
to survey existing content and propose a concrete adoption plan. Existing structures,
inferred ownership topics and migration moves require approval. The other skills are
`audit`, `roadmap`, `review`, `fold` and `execute-roadmap <file>`.
Execution validates the entire dependency graph before changing files or branches, then
works only within the named index or milestone. It never pushes or merges.

## CLI and hooks

Run the bundle from the project whose docs you want to inspect, or any directory inside it:

```sh
node /path/to/struct-docs/bin/docs-lint.mjs init
node /path/to/struct-docs/bin/docs-lint.mjs audit
node /path/to/struct-docs/bin/docs-lint.mjs audit --fix --verbose
node /path/to/struct-docs/bin/docs-lint.mjs check docs/specs/example.md
node /path/to/struct-docs/bin/docs-lint.mjs repair
node /path/to/struct-docs/bin/docs-lint.mjs status docs/roadmaps/v1/index.md
```

`init` previews; `init --apply` applies safe setup after the approved semantic changes.
Add `--project-cli <rules>` to write a project-owned `tools/docs-cli/` with house-style
rules, and `--commit-gate auto` to run it on every commit.
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
node tools/plugin-files.mjs claude plugin validate --strict
node tools/plugin-files.mjs agy plugin validate --strict
```

`npm run check` runs lint, type checking, tests, manifest/path checks and bundle freshness.
The freshness test rebuilds in a temporary directory and compares exact bytes with
`bin/docs-lint.mjs`; regenerate with `npm run build` when stale. Host plugin validation
runs against the copied shipped plugin when Claude Code or Antigravity is installed. No CI or npm publication
setup is required.

Start at [docs/README.md](docs/README.md) for the generated documentation index and specs.

For an execution rehearsal, run `npm run rehearse:execution -- success` and use the
returned project with `/struct-docs:execute-roadmap docs/roadmaps/release/index.md`, or
name `docs/roadmaps/release/greeting.md` to restrict work to that milestone. The
[fixture guide](tests/fixtures/execution/README.md) documents blocking variants; retained
[execution evidence](tests/fixtures/execution/evidence/task-loop.md) records real delegated runs.
