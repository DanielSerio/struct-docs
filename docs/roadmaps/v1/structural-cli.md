---
id: structural-cli
title: Structural CLI
type: roadmap-node
status: in-progress
intent: A bundled docs-lint replaces the manage-docs structural gate.
---

## Tasks

### command-shell <!-- status: done -->
Intent: One Commander entry and one reporter decide every command's output and exit status.
Acceptance:
- [x] Findings, including those from a malformed `.struct-docs.yml`, print as `file:line - problem` through the shared reporter.
- [x] Process tests prove error findings exit 1, clean, warnings-only and repairable-only runs exit 0, and usage errors and execution failures exit 2.
- [x] Each command module exports `register(program)`, and its handler is tested without spawning a process.

Notes:
- 2026-11-01 npm run check passed all 69 tests; handler and process tests verify reporting, registration and every exit class.

### document-reader <!-- status: done -->
Intent: Every rule receives one parsed document, read by the frontmatter subset ported from manage-docs.
Acceptance:
- [x] Ported reader tests pass for BOM, quotes and inline comments, and reject nested values, block lists, anchors and multiline scalars.
- [x] A parsed document carries its docs-relative path, raw source, lines, frontmatter values with source lines, and classification.
- [x] The tree reader returns only files, including `.MD` names with their case preserved, and no archive behavior survives the port.

Notes:
- 2026-11-01 npm run check passed all 89 tests; ported subset, source spans, numeric keys and file-only tree inventory are verified.

### document-rules <!-- status: done -->
Intent: Schema, naming and placement rules run from the compiled registry, through `docs-lint check`.
Acceptance:
- [x] Fixtures produce errors with source lines for missing, unknown and invalid fields, a type-directory mismatch and a non-kebab filename.
- [x] A legacy `decisions` field is an error pointing at fold, and a custom doctype needs no status field.
- [x] Rules are tested with plain objects, and importing Commander or the file system from a rule fails a test.
- [x] `docs-lint check <file>` reports parse, naming and type-placement findings for one file without scanning the tree.
Deps: command-shell, document-reader

Notes:
- 2026-11-01 npm run check passed all 102 tests; plain-object rules, import purity and real single-file command behavior are verified.

### reference-checks <!-- status: done -->
Intent: Document references resolve on disk, with no archive overlay and no dependence on local-only files.
Acceptance:
- [x] A deleted target is an error at the referring field, and bare ids, absolute paths and traversal outside docs are rejected.
- [x] A `to` restriction rejects a target in another directory, and a template target is checked only for existence.
- [x] A tracked document referencing a gitignored one is an error even when the target exists locally, while a gitignored document may reference anything.
Deps: document-rules

Notes:
- 2026-11-01 npm run check passed all 115 tests; reference grammar, inventory resolution, templates and local-only stability are verified without an archive overlay.

### topic-ownership <!-- status: done -->
Intent: Two documents cannot claim one topic, and only shared documents count.
Acceptance:
- [x] A duplicate `owns` topic is an error at the field line, naming the other owner and its line, in both documents.
- [x] A repeated topic within one document is an invalid value, and `owns` is required unless the doctype disables it.
- [x] Fixtures prove gitignored, living, template and ignored documents never create or satisfy a claim.
Deps: document-rules

Notes:
- 2026-11-01 npm run check passed all 126 tests; duplicate owners, repeated values and excluded/local-only scope are verified at source lines.

### roadmap-model <!-- status: todo -->
Intent: Roadmap files parse into one tree over all roadmaps, with derived statuses and resolved deps.
Acceptance:
- [ ] Ported body-parser, model, rollup and deps tests pass, including every ordered rollup rule and all-`cut` children.
- [ ] A bare dep resolves only in its own roadmap and a qualified dep only in the roadmap it names, with two roadmaps holding the same id.
- [ ] A node with a breakout resolves at that file's rolled-up status, in rollup and in deps alike.
Deps: document-reader

### roadmap-checks <!-- status: todo -->
Intent: The ported roadmap suite and draft-spec gate report at source lines.
Acceptance:
- [ ] Fixtures produce errors for duplicate tree-wide ids, missing leaf acceptance, misnamed breakouts, invalid node fields, missing deps and cycles within and across roadmaps.
- [ ] A cut leaf lacking both superseded-by and Notes, a parent duplicating its breakout's title or intent, and a root id unlike its directory are errors.
- [ ] An in-progress or done milestone depending on a draft spec is an error, while a custom document without a status is not treated as a draft spec.
Deps: roadmap-model, reference-checks

### audit-command <!-- status: todo -->
Intent: `docs-lint audit` runs every structural check over the tree and stays silent when clean.
Acceptance:
- [ ] A clean fixture and a repo with no docs print nothing and exit 0, including one with a roadmap, since progress belongs to `status`.
- [ ] Forbidden root files are errors, and unrouted directories and roadmap files over about twelve children count as warnings that `--verbose` lists.
- [ ] Fixture findings arrive from document, reference, ownership and roadmap rules in one run with deterministic order.
Deps: topic-ownership, roadmap-checks

### derived-repair <!-- status: todo -->
Intent: Only derived statuses and the generated index are ever written, and repairing twice changes nothing.
Acceptance:
- [ ] Ported index and repair tests pass: the block between `struct-docs:index` markers is rewritten, with outside content and line endings preserved.
- [ ] `docs-lint repair` prints nothing, a second run writes nothing, and `audit --fix` labels each repair it made.
- [ ] A roadmap holding any error, including a failed descendant parse, keeps its statuses while unrelated roadmaps and the index still repair.
- [ ] The index is byte-identical with gitignored documents present and absent, and repairs never invent purpose, topics or acceptance.
Deps: audit-command

### init-command <!-- status: todo -->
Intent: `docs-lint init` surveys and plans without writing, and writes only under `--apply`.
Acceptance:
- [ ] Ported survey and plan tests pass on fixtures with content, with no docs, and with legacy `.doctypes` and `.docsignore`, and a plan writes nothing.
- [ ] `--apply` creates the marker block, generated index and verbatim review template, with no empty directories or placeholder documents.
- [ ] Running `--apply` twice produces no further changes, and no prose is interpreted to invent `owns` values.
Deps: derived-repair

### plugin-bundle <!-- status: todo -->
Intent: One committed esbuild bundle carries the CLI, and this repo passes its own gate.
Acceptance:
- [ ] `bin/docs-lint.mjs` runs `audit` from a temporary copy with no `node_modules`.
- [ ] `npm run check` rebuilds in a temporary directory, compares exact bytes, and when stale fails naming the regeneration command.
- [ ] `docs-lint audit` on this repo exits 0 and prints nothing after `docs-lint repair`.
Deps: init-command
