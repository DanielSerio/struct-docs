---
id: migrated-repository
title: Migrated repository
type: roadmap-node
status: todo
intent: SDLC-docs runs on Struct Docs in place of manage-docs, with nothing it held lost.
---

## Tasks

### migration-plan <!-- status: todo -->
Intent: The init skill proposes the whole conversion and changes nothing until the user approves it.
Acceptance:
- [ ] SDLC-docs' in-progress work is committed, and the conversion runs on a fresh branch with Struct Docs installed from this repository's `main`.
- [ ] Init proposes a `.struct-docs.yml` keeping the `wireframes`, `forecast` and `wishlist` doctypes and the `plans/` ignore with its reason, the manage-docs marker swap, owns topics, review renames from dated names to subject slugs with any collision named, and the `.agents/cli` wrapper change.
- [ ] SDLC-docs' files are unchanged until the plan is approved, and the starting inventory and the approval, including each owns topic accepted, changed or dropped, are recorded in this file's notes.

### migration-apply <!-- status: todo -->
Intent: Applying the approved plan converts SDLC-docs without losing anything the old setup held.
Acceptance:
- [ ] `docs/.doctypes` and `docs/.docsignore` are removed only after `.struct-docs.yml` holds every type and ignore reason and validates.
- [ ] Every reference to a renamed review or moved file resolves, README content outside the generated block is unchanged, and the generated index is identical with `docs/reviews/` present and removed.
- [ ] The foundation roadmap's leaf statuses, checked acceptance lines and notes match the starting inventory.
- [ ] `audit` is clean, `repair` then changes nothing, and a second `init --apply` changes nothing.
- [ ] Each Struct Docs defect the conversion exposes is fixed here with a test, not worked around in SDLC-docs.
Deps: migration-plan

### wrapper-integration <!-- status: todo -->
Intent: SDLC-docs' own CLI and commit hook run Struct Docs and its house-style rules without losing its other commands.
Acceptance:
- [ ] `.agents/cli`'s `audit` and `docs-lint` commands run the plugin through discovery and the selected house-style rules, and its other commands and their tests still pass.
- [ ] `pnpm check` and `.githooks/pre-commit` run the docs gate once per commit, and nothing else in either changes.
- [ ] With discovery unavailable, a commit with only the missing-plugin warning succeeds and a commit with an injected house-style error is blocked.
- [ ] Rule findings in prose that predates the migration are recorded in this file's notes, and no product prose is rewritten to pass.
Deps: migration-apply
