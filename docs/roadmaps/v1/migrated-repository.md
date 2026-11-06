---
id: migrated-repository
title: Migrated repository
type: roadmap-node
status: todo
intent: A copy of SDLC-docs demonstrates a safe, repeatable replacement of manage-docs.
---

## Tasks

### rehearsal-copy <!-- status: todo -->
Intent: Every migration attempt starts from the same disposable copy, so a mistake costs nothing.
Acceptance:
- [ ] One command clones SDLC-docs at a recorded commit into a fresh directory outside this checkout and both originals, and copies the gitignored `docs/plans/` into it on purpose, leaving the original's uncommitted work out.
- [ ] The command records a starting inventory of the copy's docs, config, markers, reviews, roadmaps and `.agents/cli`, and a fingerprint of SDLC-docs and PRD-RAG (HEAD, status and working-tree file hashes).
- [ ] Running the command twice gives two copies with identical inventories, and it never writes inside either original.

### migration-plan <!-- status: todo -->
Intent: The init skill proposes the whole migration and changes nothing until the user approves it.
Acceptance:
- [ ] On the copy, init proposes a `.struct-docs.yml` keeping the `wireframes`, `forecast` and `wishlist` doctypes and the `plans/` ignore with its reason, the manage-docs marker swap, owns topics, review renames from dated names to subject slugs with any collision named, and the `.agents/cli` wrapper change.
- [ ] The copy's files are byte-identical before and after the plan is shown.
- [ ] The user's approval, including each owns topic accepted, changed or dropped, is recorded in the evidence.
Deps: rehearsal-copy

### migration-apply <!-- status: todo -->
Intent: Applying the approved plan converts the copy without losing anything the old setup held.
Acceptance:
- [ ] `docs/.doctypes` and `docs/.docsignore` are removed only after `.struct-docs.yml` holds every type and ignore reason and validates.
- [ ] Every reference to a renamed review or moved file resolves, and README content outside the generated block is unchanged.
- [ ] The foundation roadmap's leaf statuses, checked acceptance lines and notes match the starting inventory.
- [ ] `audit` is clean, `repair` then changes nothing, and a second `init --apply` changes nothing.
Deps: migration-plan

### wrapper-integration <!-- status: todo -->
Intent: The copy's own CLI and commit hook run struct-docs and its house-style rules without losing its other commands.
Acceptance:
- [ ] `.agents/cli`'s `audit` and `docs-lint` commands run the plugin through discovery and the selected house-style rules, and its other commands and their tests still pass.
- [ ] `pnpm check` and `.githooks/pre-commit` run the docs gate once per commit, and nothing else in either changes.
- [ ] With discovery unavailable, a commit with only the missing-plugin warning succeeds and a commit with an injected house-style error is blocked.
- [ ] Rule findings in prose that predates the migration are recorded separately, and no product prose is rewritten to pass.
Deps: migration-apply

### rehearsal-evidence <!-- status: todo -->
Intent: The rehearsal leaves a record that someone can check without rerunning it.
Acceptance:
- [ ] Evidence under `tests/fixtures/migration/evidence/` records the source commit, the approved plan, the full migration diff and the pre-existing findings.
- [ ] Generated index content is identical with `docs/reviews/` present and removed.
- [ ] A second rehearsal from a fresh copy with the same approvals gives the same migration diff.
- [ ] The SDLC-docs and PRD-RAG fingerprints taken after the rehearsals match those taken before.
Deps: wrapper-integration
