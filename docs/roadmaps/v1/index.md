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

### documentation-workflows <!-- status: done -->
Deps: roadmap-status
Breakout: ./documentation-workflows.md

### whole-roadmap-execution <!-- status: done -->
Deps: documentation-workflows
Breakout: ./whole-roadmap-execution.md

### multi-host <!-- status: done -->
Deps: whole-roadmap-execution
Breakout: ./multi-host.md

### independent-project-gate <!-- status: done -->
Deps: structural-cli, documentation-workflows, multi-host
Breakout: ./independent-project-gate.md

### migrated-repository <!-- status: todo -->
Intent: A copy of SDLC-docs demonstrates a safe, repeatable replacement of manage-docs.
Acceptance:
- [ ] An approved copy-only migration retains custom doctypes, ignore reasons, references and roadmap progress.
- [ ] The migrated copy passes structural audit and a second repair produces no changes.
- [ ] Reviews present or absent yield identical index content, and missing plugin leaves local rules active.
- [ ] Rehearsal evidence records the migration diff and confirms both original repositories were unchanged.
Deps: independent-project-gate
