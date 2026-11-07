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

Preflight is read-only: run audit without `--fix` and full/scoped status before file or
branch changes. Check every scoped node's external dependencies and inherited ancestor
gates, including later tasks. Preflight rejection reports the evidence without changing
leaf status or Notes. Stale derived values alone are not authored errors.

Only audit errors in the scoped roadmap files, or ones that stop the graph from being
modeled, reject the run. Other audit errors are reported as context and become the run's
baseline: later audits fail only on errors that baseline does not hold.

Authored changes stay within the named descendants. Related derived ancestor statuses
and the generated index may change through repair, without expanding implementation
scope. Account for prospective repair paths during preflight; stop before global repair
would change unrelated roadmaps outside that boundary.

Create or use a dedicated work branch; never push or merge. Inspect existing changes first
and preserve unrelated work. A task commit includes only its verified implementation and
associated documentation. If existing changes prevent safe isolation, stop and report why.

## Task loop

An index includes its existing breakout trees and inline milestones. Preserve every
existing breakout's progress. When an eligible inline milestone begins, create its task
file using the roadmap skill's grammar, move title/intent/detail out of the parent and
retain only routing there. Do not create breakouts up front or overwrite an existing
target. Refresh the original scoped status after this structural change and include the
breakout in its first verified task commit. A milestone-file entry never selects siblings.

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

Keep the original entry file for every scoped status refresh. Delegation uses the host's
real subagent mechanism; if unavailable, stop rather than claiming inline work was
delegated. The coordinator inspects the implementation and verifies acceptance itself.
Commit explicit task paths, preserving unrelated staging. After each commit, inspect its
paths, run audit and confirm another repair changes no bytes or modification times before
selecting another leaf. A finished scoped report never authorizes work elsewhere.

## Fix budget

An ordinary failure is part of the task, not a blocker. A failed lint, type, test or audit
check, or an unmet acceptance criterion, that the task's own change caused and that can be
fixed inside its allowed paths is fixed and re-run. Each distinct failure gets at most three
fix attempts. Stop sooner when an attempt brings back the same failure with nothing new
learned, or when the fix would leave the allowed paths, weaken or skip a check, or
contradict a spec. A failure the task did not cause is not the task's to fix. A verification
command that fails before it tests anything, such as a shell quoting or syntax error, a wrong
path or a server not yet started, is not a failed check: the command is corrected and run
again, by the agent or the coordinator, without spending the budget.

The coordinator sends a failure it finds while verifying back to the same subagent with its
evidence, at most twice per task, rather than stopping on it. Implementation details that
the specs and project conventions leave open are the agent's to choose, recorded in the
task's Notes; behavior a spec should state is a user decision.

Why: a lint error or a failing test is ordinary development work, and stopping on one makes
the run do less than a developer would. The fixed budget keeps an agent from spending the
run on an approach that will not work.

## Stop behavior

After an authorized task starts, stop when a failure outlives or falls outside its fix
budget, at an unsatisfied external dependency, or at a user-only decision. Tell each
subagent to surface that blocker as soon as it is one, without hiding it, bypassing a gate
or choosing a product default. Start no later task and stop any active work on that leaf.

Record the authored leaf blocked with a dated factual Notes entry: the command, exit
code and relevant output with the fixes already tried, or the precise unanswered decision. Repair derived statuses
when safe and inspect the diff. Preserve incomplete code, docs and new files uncommitted
for inspection; keep earlier verified task commits intact. Do not commit a blocked status
or note as though the task were verified, and do not discard or stash incomplete work.

Report the branch, verified commit SHAs, blocked task, evidence, remaining in-scope work
and needed input. Say when no product decision is needed and a failed check instead needs
resolution. Never select the user's answer or restart automatically after requesting one;
resume only on subsequent user direction. Preflight rejection remains read-only.

Why: later tasks may build on the blocked one, so continuing risks stacking work on a bad base
and leaves a branch that is harder to review. Per-task commits give a rollback point at each
step, and never pushing or merging keeps publishing the work in the user's hands.

Final reporting identifies the branch, verified task commits, remaining tasks and blocker,
if any. No pushes, merges or automatic restart after a decision request.

A finished report explicitly names no remaining in-scope work, blocker or needed decision.
Distinguish commits made in this run from preserved earlier verified progress; untouched
sibling work is context, not permission to continue outside the original entry point.
