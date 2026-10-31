---
title: Project CLI and house-style rule library
type: spec
status: draft
purpose: Generated Commander wrapper, plugin discovery and project-owned body rules.
owns: [project-cli, plugin-discovery, house-style-rules, commit-integration]
---

## Generated wrapper

Init offers a small project-local Commander program at `tools/docs-cli/`, written as plain
`.mjs`, and copies into it the selected rules plus the plugin's Commander setup, document
reader and finding reporter. The project imports no runtime code from the plugin, so local
rules keep running without it.

If the project has a `package.json`, add Commander to its dev dependencies with its existing
package manager and expose `docs-lint` through its scripts. If not, write a private
`tools/docs-cli/package.json` holding Commander, leaving the project root untouched, and run
it with `node tools/docs-cli/index.mjs`. Integrate into an existing CLI where appropriate,
preserving unrelated commands and scripts.

Which docs directories each rule covers is a project-owned list in the generated CLI. It does
not read `.struct-docs.yml`, so the copy needs no YAML parser.

Forward structural commands and flags to the plugin bundle via process.execPath with an
argument array and project-root cwd. Do not interpolate shell commands or duplicate core
checks. Run local rules even if plugin discovery or structural checks fail; combine results
so any actual error fails the gate. Missing plugin alone is a warning, not a failed commit.

Why a wrapper: one set of structural rules, so projects cannot drift from the plugin. Why
`.mjs`: Node runs it directly, with no build step or TypeScript setup in the project. Why a
missing plugin only warns: someone without the plugin should not be blocked from committing.
The accepted cost is that such commits skip the structural checks, and with no CI nothing
catches them later.

## Discovery

One isolated lookup function tries STRUCT_DOCS_ROOT, then installPath from
~/.claude/plugins/installed_plugins.json for struct-docs, then ~/.claude/skills/struct-docs.
Validate that a candidate contains bin/docs-lint.mjs; fall through when invalid. Handle a
missing or malformed registry without crashing. Registry layout is an implementation detail
isolated behind this function and fixture tests; never persist version-specific install paths.

If none exists, warn that plugin checks were skipped and name installation via Claude Code's
`/plugin install <Struct Docs repository URL>` or STRUCT_DOCS_ROOT. Local rules still run.
A discovered but failing plugin is an actual failure, not a missing-plugin skip.

## Rule library

Copy chosen templates into project-owned files. Each follows the parsed-document-to-findings
contract; no Commander, printing or filesystem access inside rules. Projects can edit or
remove them without plugin updates replacing their work. Default scope is immediate specs
Markdown files, avoiding roadmap acceptance syntax and ignored working notes.

| Rule | Initial behavior | Severity |
| --- | --- | --- |
| line-length | Prose over 100 characters outside frontmatter, fences, tables and headings | Error |
| heading-gap | Heading followed by nonblank content | Error |
| stale-pointer | Mechanical deferred-work phrases from SDLC-docs, excluding the rule definition | Error |
| file-size | UTF-8 file over 50,000 bytes; no line cap | Warning |

Port SDLC-docs' docs-lint implementation and focused tests; rename spec-size to file-size.
Preserve the documented exemptions. Add other rules only for equally mechanical needs
shown by real documents. No semantic rationale checks or configuration language for bodies.

Why copied: SDLC-docs had to write these rules itself, so shipping them saves every project
that work, while house style stays the project's to edit without a plugin update undoing it.

## Local commit gate

Offer a pre-commit hook or addition to the existing check script. Preserve existing hook
behavior, use the project's package manager, and avoid double-running a gate. A missing
plugin allows commit with an installation warning; local rule errors still block it.
Warnings alone exit zero. Output format and exit semantics match the shared CLI skeleton.
