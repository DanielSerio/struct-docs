---
id: documentation-workflows
title: Documentation workflows
type: roadmap-node
status: in-progress
intent: The five familiar skills and two hooks work under Struct Docs policy.
---

## Tasks

### post-write-hook <!-- status: done -->
Intent: Each Write or Edit under docs gets fast single-file feedback, and only in adopted projects.
Acceptance:
- [x] Hook fixtures without the `struct-docs:index` marker pair, including one with only a `manage-docs:index` marker, produce no output and no sentinel.
- [x] A write under docs reports only naming, type-placement and frontmatter-parse findings for that file, bounded in count, and never repairs or runs cross-document checks.
- [x] Writes under docs and to root `.struct-docs.yml` create the sentinel keyed by repository path hash, and writes elsewhere create none.
- [x] Malformed payloads, missing files and execution failures exit 0 with nothing printed.

Notes:
- 2026-11-02 npm run check passed all 236 tests; marker gating, single-file bounded feedback, path-keyed config/docs sentinels and silent failures are verified by real hook processes.

### stop-hook <!-- status: done -->
Intent: Derived statuses and the index stay current at the end of a turn without a tree scan on quiet turns.
Acceptance:
- [x] With no sentinel, the hook exits without reading the docs tree.
- [x] With a sentinel, it repairs only derived statuses and index content, prints nothing, and clears the sentinel only after the repair succeeds.
- [x] A failed repair keeps the sentinel for a retry and still exits 0.
Deps: post-write-hook

Notes:
- 2026-11-02 npm run check passed all 242 tests; quiet-turn read probes, derived-only repairs, shared sentinel handoff and failure/timeout retries are verified.

### audit-roadmap-skills <!-- status: done -->
Intent: Audit and roadmap skills drive the bundled CLI rather than reasoning about compliance themselves.
Acceptance:
- [x] The audit skill passes `--fix` and `--verbose` only when asked, and answers progress or next-work questions by relaying `docs-lint status`.
- [x] The roadmap skill's `new` and `breakout` follow `specs/skills`, and a breakout that already exists is reported rather than regenerated.
- [x] Both skills call `bin/docs-lint.mjs` through `CLAUDE_PLUGIN_ROOT`, with no manage-docs path and no status algorithm of their own.

Notes:
- 2026-11-02 npm run check passed all 242 tests; both skills were reviewed against their owner spec, and temporary new/breakout examples pass audit with nested next-ready output and an idempotent repair.

### review-skill <!-- status: todo -->
Intent: Reviews follow the project template and a repeat review of one subject replaces the last.
Acceptance:
- [ ] The skill stops and points at init when `docs/templates/code-review-v1.md` or the named template is missing.
- [ ] Reviews are written to `docs/reviews/<slug>.md` with no date prefix, with required `subject` and `template`, and a second review of the same slug overwrites the first.
- [ ] Criticality, the five 1-10 ratings and the flag thresholds match `specs/skills`, and a project template's changes take precedence.

### fold-skill <!-- status: todo -->
Intent: Fold merges only the sources a person names, and deletes them only once their content is accounted for.
Acceptance:
- [ ] With no named source, the skill asks for one; there is no default source, marker or flag.
- [ ] It shows a source-to-destination plan, including new purposes or topics and discarded material with reasons, before changing any file.
- [ ] After approval, references are rewritten throughout the repo, legacy `decisions` fields are removed, sources are deleted, and `docs-lint audit --fix` runs.

### init-skill <!-- status: todo -->
Intent: Init seeds docs from what a project already has and changes an existing setup only with approval.
Acceptance:
- [ ] On a legacy manage-docs fixture copy, the skill shows the proposed config, per-file moves and `owns` topics, and writes nothing before approval.
- [ ] It applies through `docs-lint init --apply`, seeding the review template verbatim, and creates no empty directories or placeholder documents.
- [ ] Unrouted documents get a custom type or a recorded exclusion with a reason, never a type guessed from a directory name.

### plugin-manifest <!-- status: todo -->
Intent: A git install loads five skills and two hooks with no npm install or global settings edits.
Acceptance:
- [ ] Manifest tests fail on a missing referenced file, a skill directory not matching its name, or a missing hook, and pass on this repo.
- [ ] Every command path named in a skill exists in the bundled CLI, and both hooks run from a copy with no `node_modules`.
- [ ] Local Claude plugin validation passes, and a root README documents git installation and optional junction setup.
Deps: stop-hook, audit-roadmap-skills, review-skill, fold-skill, init-skill
