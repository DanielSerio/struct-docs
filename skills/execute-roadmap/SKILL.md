---
name: execute-roadmap
description: Execute an entire roadmap index or milestone on a dedicated branch, with sequential delegated tasks, verified commits, a bounded budget for fixing ordinary failures and a stop at the first real blocker.
user-invocable: true
---

Run the entire file the user names, not merely its next task. An index scopes all its
descendants; a breakout scopes only that file's descendants. Read the named file, its
parents and linked task files without rewriting existing progress. Clarify a missing or
ambiguous entry point before changing anything.

Implementation and authored leaf changes stay in that scope. Related derived ancestor
statuses and the generated index may change through repair; that does not authorize
other authored work. Account for the audit's prospective repair paths during preflight,
and stop before a global repair would change unrelated roadmaps outside that boundary.

## Read-only preflight

From the project root, use the bundled CLI (`../../bin/docs-lint.mjs` relative to this
`SKILL.md`) to load the complete graph and scoped report:

```sh
node "../../bin/docs-lint.mjs" audit
node "../../bin/docs-lint.mjs" status
node "../../bin/docs-lint.mjs" status "<file>"
```

Replace `<file>` with the actual project-relative roadmap file. No `--fix`, `repair`,
file edits or branch changes belong in preflight. Stop on malformed input, audit errors
in the scoped roadmap files, an unmodelable roadmap, or a cyclic report, naming the CLI
evidence. Exit 2 also stops the run. Audit errors elsewhere are reported as context, not
fixed, and form the run's baseline: later audits fail only on errors it does not hold.
Warnings and stale derived values alone do not authorize content changes or fail
preflight; their repair waits until work is safely isolated.

Use the full report to resolve every dependency of every node in scope, including later
tasks and dependencies inherited from ancestors outside the displayed subtree. A bare id
belongs to its roadmap; a qualified id belongs to the roadmap it names. The CLI's effective
`done` or `cut` status satisfies a dependency. If any dependency outside the requested
scope is unsatisfied, stop before any change, even when an earlier internal task could
run. Name the dependency and its status; never expand scope to implement it. Internal
pending dependencies stay in the scope's CLI order. Before resuming an in-progress leaf,
check its own and inherited gates too: an unmet gate makes the active state unsafe, so
report it without resuming or starting another leaf. Do not build a separate status,
rollup, dependency-order or next-ready algorithm.

Inspect the current branch, staged and unstaged diffs, untracked files and applicable
project instructions/checks. Identify which existing changes belong to this requested
work and which are unrelated. Leave unrelated contents, staging and deletions intact.
If a task, a derived repair or its commit would mix with unrelated changes in the same
file and cannot be isolated safely, stop and explain the overlap. Never stash, reset,
clean, discard or commit the user's unrelated work to get past preflight.

Preflight rejection is read-only: report the entry point, blocker, evidence and needed
input without marking a leaf blocked or adding Notes. A currently blocked task within
the requested scope also stops the run; an unrelated blocked roadmap does not. This
differs from a failure after an authorized task has started.

## Isolate only after preflight passes

Create a dedicated `work/<roadmap-or-milestone>` branch, or reuse the current branch
when it is already dedicated to this scope or explicitly selected by the user. Never
execute on `main` or `master`, or silently repurpose an unrelated branch. If the chosen
branch already exists elsewhere, inspect it and preserve the current work before
switching; stop if safe reuse is uncertain. An existing dedicated branch needs no new
branch or confirmation. Never push or merge, including local remotes.

## Enter an index or an existing milestone

With a milestone file, follow only its descendants and retain the original file as the
selection entry point. Do not continue with a sibling merely because full status lists it.
With an index, follow its existing breakouts in the CLI's nested document order, keeping
their checked acceptance, dated notes and active progress. Never regenerate those files.

When the index's next eligible milestone has no breakout, create one only as its work
begins, following the roadmap skill. Move title and intent to the task file's frontmatter
and carry its agreed acceptance, evidence and notes into tasks or historical context.
Keep only routing fields in the parent: its heading/status, deps and `Breakout` path.
If a target file already exists, read and report it instead of replacing it; resolve any
route mismatch before writing. Breakout is a skill operation, not a bundled CLI command.

Seed the new file's required status, then let repair derive file and parent values.
Refresh `status "<file>"` using the ORIGINAL index entry after the structural change;
delegate the resulting authored leaf, not the milestone aggregate. Keep breakout creation
with the first verified task's commit rather than making an unverified preparatory commit.

## Run one verified task at a time

Keep the original entry file fixed for the whole run. Before selecting each task, refresh
its scoped report with the same command used in preflight:

```sh
node "../../bin/docs-lint.mjs" status "<file>"
```

Skip done and cut work. Resume the first authored in-progress leaf shown in that tree,
after checking its own and inherited gates. Otherwise take the CLI's printed next ready
leaf. A leaf has no children or `Breakout`; never delegate a file-level aggregate or a
derived parent. A blocked leaf stops the run. A finished scoped report ends it, even if
the full graph offers work elsewhere. If no leaf is ready, relay the CLI's reason rather
than inventing another order. Preserve existing breakouts; create a missing milestone
breakout only when that milestone begins, following the roadmap skill's grammar.

For that one leaf, read its owning documents, acceptance and project instructions/checks.
Mark its authored status in-progress if necessary. Use the host's real subagent mechanism
once, passing the task id, owners, acceptance, allowed paths, known changes to preserve,
required checks and the fix budget below. Do not spawn later tasks speculatively or replace
delegation with inline work. If delegation is unavailable, stop and report that limitation.
Keep branch, roadmap status, verification and commits with the coordinator.

### Fix budget

Tell the agent that ordinary failures are its work, not reasons to stop. A lint, type, test
or audit failure, or an unmet criterion, that its own change caused and that it can fix
inside the allowed paths gets fixed and the check re-run. Each distinct failure gets at
most three attempts. A verification command that fails before it tests anything, such as
shell quoting, a syntax error in the command, a wrong path or a server not yet started, is
not a failed check: correct the command and run it again, without spending the budget.
Return early, with the failure, its output and what was tried, when:

- an attempt brings back the same failure and taught nothing new;
- the fix would leave the allowed paths, weaken or skip a check, or contradict a spec;
- the task did not cause the failure, such as a required gate that was already red;
- a product decision is needed that the specs leave unanswered.

Implementation details the specs and project conventions leave open (names, helper
layout, test shape) are the agent's to choose; it reports them so the Notes entry can
record them. Only behavior a spec should state is a user decision.

Wait for that agent, then inspect its exact diff. Run applicable checks and verify every
acceptance criterion with observable evidence. A reported success alone is insufficient.
Correct your own broken verification commands the same way before judging the result.
When a check or criterion fails and the failure is inside the budget, send it back to the
same agent (continue it rather than spawning a new one) with the command and output, at
most twice per task. Tick only criteria whose evidence holds; add a dated factual Notes
entry and set the leaf done only after all criteria and checks pass. Never hand-author
aggregate statuses.

```sh
node "../../bin/docs-lint.mjs" repair
node "../../bin/docs-lint.mjs" audit
```

Inspect every repair and the complete proposed task diff. Commit exactly that task's
implementation, associated docs, ticked acceptance, dated note and done status, including
derived ancestors/index when changed. Use explicit paths, never `git add --all` or a
blanket commit. With unrelated staged work, `git commit --only -- <owned paths>` can keep
it staged; inspect the index and stop if changes cannot be isolated safely.

After the commit, inspect its paths and verify unrelated contents/staging stayed intact.
Run audit again, comparing it with the preflight baseline, and confirm a second repair
changes no bytes or modification times:

```sh
node "../../bin/docs-lint.mjs" audit
node "../../bin/docs-lint.mjs" repair
```

Do not select or start another leaf until that commit and its checks are verified. Repeat
from the original scoped status command until every in-scope task is done or cut, or a
blocker occurs. Never push or merge; neither is part of a verified task commit.

## Finish the requested scope

When the original scoped report says every node is done or cut, report the branch and
verified task commit SHAs, remaining in-scope work (explicitly none when finished), and
any blocker or needed decision. Distinguish prior verified progress from commits made in
this run. Mention untouched sibling work only as context; do not start it automatically.

## Stop and report

After a task starts, stop when a failure outlives or falls outside the fix budget, at an
unsatisfied external gate, or at a decision only the user can make. Retain the command,
exit code, relevant output and the fixes tried, or the precise unanswered question. Do not
keep retrying past the budget, weaken a check, fix a deliberately failing rehearsal gate,
or choose a product default. No later task or agent starts; stop any still-running work on
the active leaf.

Mark that authored leaf blocked and append a dated factual Notes entry identifying the
failure, evidence and attempts. Keep earlier verified task commits and completed evidence intact.
When safe, run only derived repair, inspect its diff, and leave the blocked task's code,
docs and new files uncommitted for inspection. Do not discard, stash or publish incomplete
work, and do not make a blocked task look verified by committing its status or note.
Preflight rejection remains read-only; it does not author this blocked record.

End the run with the branch, verified task commit SHAs, blocked task, command/output or
unanswered decision, remaining in-scope work and input needed to continue. State when no
product decision is needed and a failing check instead needs resolution. A user-only
question is not an entry in open-questions unless the user says they cannot answer it.
Never choose the answer, push, merge or restart automatically after requesting a decision.
Resume only on subsequent user direction, preserving the verified checkpoints.
