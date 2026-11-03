---
id: whole-roadmap-execution
title: Whole roadmap execution
type: roadmap-node
status: in-progress
intent: Execute a roadmap on a branch with verified task commits and predictable blocking.
---

## Tasks

### rehearsal-fixture <!-- status: done -->
Intent: Execution can be rehearsed repeatedly on a disposable project where a mistake costs nothing.
Acceptance:
- [x] A committed fixture holds a small code project with a check command and a multi-task roadmap whose tasks depend on each other, and it audits clean.
- [x] One command copies it into a fresh git repository outside this checkout, with a local bare remote, so a push or merge would be visible.
- [x] Variants add a task whose check fails and a task needing a decision only the user can make.

Notes:
- 2026-11-03 npm run check passed all 252 tests; every variant audits clean and the one-command creator makes fresh external Git and bare-remote baselines without changing the source fixture.

### execution-preflight <!-- status: done -->
Intent: `execute-roadmap <file>` refuses unsafe starts before it changes anything.
Acceptance:
- [x] A malformed or cyclic roadmap, and an unsatisfied dependency outside the named file's scope, each stop the run before any file or branch changes.
- [x] The run creates or reuses a dedicated work branch, and unrelated uncommitted changes are left intact or the run stops and says why.
- [x] The skill ships as `skills/execute-roadmap/SKILL.md`, and manifest tests pass with six skills whose command paths exist in the bundled CLI.
Deps: rehearsal-fixture

Notes:
- 2026-11-03 npm run check passed all 256 tests and strict local plugin validation passed. Retained preflight evidence proves read-only malformed/cyclic/external-gate/overlap rejection and preservation of staged unrelated work across branch creation/reuse.

### task-loop <!-- status: todo -->
Intent: Tasks run one at a time in the order `docs-lint status` gives, each verified and committed before the next starts.
Acceptance:
- [ ] On the fixture, every task runs in dependency order with one subagent per task, and an in-progress leaf is resumed before any other task starts.
- [ ] Each task produces one commit holding only its implementation, docs, ticked acceptance, dated note and done status.
- [ ] After every commit, `docs-lint audit` is clean and a repair changes nothing, and the skill's order matches `docs-lint status` with no algorithm of its own.
Deps: execution-preflight

### blocking <!-- status: todo -->
Intent: The first failed check or user-only decision stops execution with a factual record and nothing published.
Acceptance:
- [ ] On each fixture variant, the run stops at the first blocked task, starts no later task, and marks that leaf blocked with a dated note.
- [ ] Incomplete work stays uncommitted for inspection, while earlier verified task commits remain.
- [ ] The bare remote and `main` are unchanged, and the report names the task, evidence, remaining work and decision needed.
Deps: task-loop

### entry-points <!-- status: todo -->
Intent: A roadmap index and a broken-out milestone are both valid entry points, and neither leaks outside its scope.
Acceptance:
- [ ] From an index, a milestone with no breakout is broken out when its work begins, and an existing breakout is kept with its progress.
- [ ] From a milestone file, only that file's descendants change, and the final report lists the branch, task commits and remaining work.
- [ ] Statuses on parents and roots are derived by repair in both entry points, and only leaf statuses are authored.
Deps: task-loop
