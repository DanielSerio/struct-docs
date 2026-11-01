---
id: v1
title: Struct Docs v1
type: roadmap
status: in-progress
intent: Replace manage-docs with customizable structural checks and prove migration on a repository copy.
specs: [specs/config, specs/doc-schema, specs/layout, specs/checks, specs/cli, specs/roadmap-schema, specs/roadmap-rollup, specs/skills, specs/packaging, specs/execute-roadmap, specs/project-cli, specs/migration]
---

## Milestones

### configurable-schema <!-- status: done -->
Breakout: ./configurable-schema.md

### structural-cli <!-- status: todo -->
Intent: A bundled docs-lint replaces the manage-docs structural gate.
Acceptance:
- [ ] Ported parser, command, roadmap, reference, index and repair tests pass with archive behavior removed.
- [ ] Duplicate owns claims name both owners at source lines; deleted-reference fixtures fail.
- [ ] Clean audit and repair are silent, repairs are idempotent, and gitignored documents never change the index or ownership results.
- [ ] Local lint, typecheck, tests and bundle-freshness checks pass, and the bundle runs without npm install.
Deps: configurable-schema

### roadmap-status <!-- status: todo -->
Intent: A person or skill can ask where a roadmap stands and what is next.
Acceptance:
- [ ] `docs-lint status` prints the progress tree and next ready node, and names finished, gated and cyclic trees.
- [ ] `docs-lint status <file>` limits the report to that file's descendants and writes nothing.
Deps: structural-cli

### documentation-workflows <!-- status: todo -->
Intent: The five familiar skills and two hooks work under Struct Docs policy.
Acceptance:
- [ ] Init, audit, roadmap, review and fold skills invoke existing bundled paths and pass manifest checks.
- [ ] Init proposes migration and asks approval for owns values.
- [ ] Fold requires named sources, and repeat reviews use stable filenames.
- [ ] Hook fixtures prove marker gating, single-file-only reporting, config-triggered sentinel and silent safe repair.
Deps: roadmap-status

### whole-roadmap-execution <!-- status: todo -->
Intent: Execute a roadmap on a branch with verified task commits and predictable blocking.
Acceptance:
- [ ] A multi-task fixture executes in dependency order using one subagent per task and commits each verified task.
- [ ] A failed check and a user-only decision each stop at the first blocked task without pushing or merging.
- [ ] Index and milestone entry points preserve scope, acceptance evidence and CLI-derived statuses.
Deps: documentation-workflows

### independent-project-gate <!-- status: todo -->
Intent: A project can run structural checks and its own copied rules from one Commander CLI.
Acceptance:
- [ ] Generated CLI uses the copied setup, reader and reporter, and resolves all three plugin discovery sources in order.
- [ ] Selected line-length, heading-gap, stale-pointer and file-size templates run after the plugin is unavailable.
- [ ] Hook or existing-check integration preserves prior behavior; missing plugin warns while local rule errors fail.
Deps: structural-cli, documentation-workflows

### migrated-repository <!-- status: todo -->
Intent: A copy of SDLC-docs demonstrates a safe, repeatable replacement of manage-docs.
Acceptance:
- [ ] An approved copy-only migration retains custom doctypes, ignore reasons, references and roadmap progress.
- [ ] The migrated copy passes structural audit and a second repair produces no changes.
- [ ] Reviews present or absent yield identical index content, and missing plugin leaves local rules active.
- [ ] Rehearsal evidence records the migration diff and confirms both original repositories were unchanged.
Deps: independent-project-gate
