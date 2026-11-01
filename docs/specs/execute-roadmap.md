---
title: Execute an entire roadmap
type: spec
status: active
purpose: Branch, task delegation, verification and stopping behavior for roadmap execution.
owns: [roadmap-execution]
---

## Scope and preparation

`execute-roadmap <file>` runs the entire named roadmap index or broken-out milestone, not
just the next task. Parse the full roadmap model to validate dependencies, but restrict work
to descendants of the named file. An unsatisfied dependency outside that scope blocks work;
do not silently expand the requested scope. Reject malformed or cyclic roadmaps first.

Create or use a dedicated work branch; never push or merge. Inspect existing changes first
and preserve unrelated work. A task commit includes only its verified implementation and
associated documentation. If existing changes prevent safe isolation, stop and report why.

## Task loop

Take order from `docs-lint status <file>` rather than a second algorithm in the skill. Walk in
the inherited dependency and document order. Skip done and cut tasks. Resume an
in-progress leaf before starting another eligible task. A blocked task stops execution.
Break milestones into task files when their work begins, preserving existing breakouts.
Ancestor dependency gates apply to descendants, so a task cannot bypass its milestone's deps.

Use one subagent per task, supplying relevant owners, acceptance criteria, allowed scope and
checks. The coordinating agent verifies the result and owns sequencing and commits. Run
tasks sequentially so the first blocker is observed before later tasks start. Do not delegate
all future tasks speculatively.

Mark authored leaf status in-progress when work begins. Run applicable project checks and
verify every acceptance criterion with observable evidence. Tick a box only after its
criterion holds. Set done only after all criteria and checks pass, then run the CLI's derived
repair and audit. Commit after each verified task, including its status and acceptance
updates. Continue until every in-scope task is done or cut, or a blocker occurs.

## Stop behavior

At the first failed check, failed acceptance, unsatisfied external dependency or decision
requiring the user, stop. Record the leaf as blocked with a dated factual Notes entry and
repair derived statuses when safe. Preserve incomplete work for inspection; do not commit
it as a verified task. Report the task, evidence, remaining work and decision needed.
Never choose an unresolved product decision to keep the loop moving.

Why: later tasks may build on the blocked one, so continuing risks stacking work on a bad base
and leaves a branch that is harder to review. Per-task commits give a rollback point at each
step, and never pushing or merging keeps publishing the work in the user's hands.

Final reporting identifies the branch, verified task commits, remaining tasks and blocker,
if any. No pushes, merges or automatic restart after a decision request.
