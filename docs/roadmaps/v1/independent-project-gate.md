---
id: independent-project-gate
title: Independent project gate
type: roadmap-node
status: in-progress
intent: A project can run structural checks and its own copied rules from one Commander CLI.
---

## Tasks

### house-style-rules <!-- status: done -->
Intent: The four house-style rules exist as pure rules a project can copy unchanged.
Acceptance:
- [x] `line-length`, `heading-gap`, `stale-pointer` and `file-size` are ported from SDLC-docs' `.agents/cli/lib/docs-lint.ts` with its focused tests, with spec-size renamed to file-size and the documented exemptions and severities in `specs/project-cli`.
- [x] Each rule takes one parsed document, reads only its path, source, lines and frontmatter, and returns findings; none reads files, prints or imports Commander.
- [x] By default each rule covers only Markdown files directly under `docs/specs/`, so roadmap acceptance lines and ignored working notes produce no findings.

### project-cli-assets <!-- status: done -->
Intent: The plugin ships a copyable CLI kit built from the same sources as its bundle.
Acceptance:
- [x] `npm run build` emits the Commander setup, document reader, finding reporter and the four rules as plain `.mjs` under `assets/project-cli/`, and the emitted files import only each other and Commander.
- [x] The freshness test fails when any emitted file differs by a byte from a fresh build, and names the regeneration command.
- [x] For the same fixture document, the emitted reader and reporter print the same `file:line - problem` lines and exit status as the bundle.
Deps: house-style-rules

### plugin-discovery <!-- status: done -->
Intent: A copied CLI finds an installed plugin in any supported host without remembering where it was.
Acceptance:
- [x] One lookup function, shipped in `assets/project-cli/`, tries `STRUCT_DOCS_ROOT`, the Claude `installPath` from `~/.claude/plugins/installed_plugins.json`, `~/.claude/skills/struct-docs`, the Codex plugin cache and the Antigravity plugin directory, in that order, and returns the first that contains `bin/docs-lint.mjs`.
- [x] Fixture tests with a temporary home cover each source winning, an invalid candidate falling through, and a missing or malformed registry returning no plugin without throwing.
- [x] Where the Codex cache holds several versions of struct-docs, the highest version wins, and no install path is written into the project.
Deps: project-cli-assets

### generated-cli <!-- status: todo -->
Intent: Init leaves a project with one docs-lint command that runs plugin checks and its own rules.
Acceptance:
- [ ] On a fixture with a `package.json`, applying the project CLI writes `tools/docs-cli/` with the selected rules, adds Commander with the project's package manager and a `docs-lint` script, and keeps unrelated scripts byte-for-byte; on a fixture without one, it writes a private `tools/docs-cli/package.json` and leaves the project root untouched.
- [ ] The generated CLI forwards structural commands and flags to the discovered bundle via `process.execPath` with an argument array from the project root, then runs the local rules over a project-owned directory list, and exits 1 when either reports an error.
- [ ] With discovery unavailable, local rules still run and their errors still exit 1, while a missing plugin alone prints a warning naming host installation or `STRUCT_DOCS_ROOT` and exits 0; a discovered plugin that fails is an error.
- [ ] `skills/init/SKILL.md` offers the project CLI with selectable rules and applies only what the user approves.
Deps: plugin-discovery

### commit-gate <!-- status: todo -->
Intent: A project's commits run the generated CLI without losing the checks it already had.
Acceptance:
- [ ] On a fixture with an existing pre-commit hook and one with an existing check script, adding the gate keeps prior behavior, and the generated CLI runs once per commit.
- [ ] In a fixture repository, a commit with a local rule error is blocked, while a commit with only a missing plugin or only warnings succeeds and prints the warning.
- [ ] `skills/init/SKILL.md` offers the gate after the project CLI, uses the project's package manager, and respects a decline.
Deps: generated-cli
