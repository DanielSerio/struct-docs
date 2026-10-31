---
title: Plugin bundle and hooks
type: spec
status: draft
purpose: Git installation, committed bundle, hook lifecycle and local plugin verification.
owns: [plugin-packaging, hook-lifecycle, bundle-distribution]
---

## Distribution

Ship a Claude Code plugin with .claude-plugin/plugin.json, six skills, hooks, assets and
bin/docs-lint.mjs. TypeScript sources live under scripts with the CLI layers. Development
uses Commander, a real YAML parser and esbuild; bundle their runtime code into one committed
ESM file for Node 22+. Git installs receive no npm install. The bundle adds nothing to a
consumer project. Remove the zero-runtime-dependency badge: bundled libraries are dependencies.

A local test rebuilds in a temporary directory with pinned tooling and compares exact bundle
bytes to the committed entry. It fails with the regeneration command if stale. Keep the
bundle tracked even if other build output is ignored. Manifest tests verify referenced files,
skill-directory names and both hooks. Local Claude plugin validation supplements those tests.
No CI distribution or npm publishing in v1. Document manual git installation and optional
local junction setup without editing global CLAUDE.md or settings.json.

The build also emits the shared Commander setup, reader, reporter and rule templates as plain
`.mjs` under `assets/project-cli/`, from the same TypeScript sources the bundle uses. These are
committed and covered by the same freshness test. `/init` copies from there.

Why: git installs get no `npm install`, so runtime code must already be in the repo. A single
source means the plugin and generated CLIs cannot disagree on output or parsing.

## Adoption gate

Both hooks require the struct-docs:index marker pair in docs/README.md. Never opt a project
in from a hook. Existing manage-docs and clean-docs hooks may coexist on other repositories;
do not remove their global entries. Migration swaps project markers to retire old behavior.

## PostToolUse

On Write or Edit, run only single-file naming, type-placement and frontmatter-parse checks;
never repair or run cross-document ownership/dependency checks. Bound reported findings.
Writes anywhere under docs, and writes to root .struct-docs.yml, touch a temp sentinel keyed
by the repository path hash. Config is outside docs now, but changes its derived index.

## Stop

If the sentinel is absent, exit immediately without a tree scan. Otherwise repair only
derived roadmap statuses and index content. Never audit or report. Clear the sentinel only
after successful repair so failed attempts retry. Changes made by outside editors or git
create no sentinel; explicit audit --fix covers those.

Every hook path exits zero and handles malformed payloads and execution failures. Hooks
never fail a session. These boundaries avoid recursive writes and changes to files the
agent is editing mid-turn, while keeping derived values maintained without manual reminders.
