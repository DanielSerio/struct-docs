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

### structural-cli <!-- status: done -->
Deps: configurable-schema
Breakout: ./structural-cli.md

### roadmap-status <!-- status: done -->
Deps: structural-cli
Breakout: ./roadmap-status.md

### documentation-workflows <!-- status: in-progress -->
Deps: roadmap-status
Breakout: ./documentation-workflows.md

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
