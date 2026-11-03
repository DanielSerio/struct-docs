---
name: execute-roadmap
description: Execute an entire roadmap index or milestone on a dedicated branch, with sequential delegated tasks, verified commits and a stop at the first blocker.
user-invocable: true
---

Run the entire file the user names, not merely its next task. An index scopes all its
descendants; a breakout scopes only that file's descendants. Read the named file, its
parents and linked task files without rewriting existing progress. Clarify a missing or
ambiguous entry point before changing anything.

## Read-only preflight

From the project root, use the bundled CLI to load the complete graph and scoped report:

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" audit
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" status
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" status "<file>"
```

Replace `<file>` with the actual project-relative roadmap file. No `--fix`, `repair`,
file edits or branch changes belong in preflight. Stop on malformed input, audit errors,
an unmodelable roadmap, or a cyclic report, naming the CLI evidence. Exit 2 also stops
the run. Warnings and stale derived values alone do not authorize content changes or
fail preflight; their repair waits until work is safely isolated.

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

## Run one verified task at a time

Keep the original entry file fixed for the whole run. Before selecting each task, refresh
its scoped report with the same command used in preflight:

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" status "<file>"
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
once, passing the task id, owners, acceptance, allowed paths, known changes to preserve
and required checks. Do not spawn later tasks speculatively or replace delegation with
inline work. If delegation is unavailable, stop and report that limitation. Keep branch,
roadmap status, verification and commits with the coordinator.

Wait for that agent, then inspect its exact diff. Run applicable checks and verify every
acceptance criterion with observable evidence. A reported success alone is insufficient.
Tick only criteria whose evidence holds; add a dated factual Notes entry and set the leaf
done only after all criteria and checks pass. Never hand-author aggregate statuses.

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" repair
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" audit
```

Inspect every repair and the complete proposed task diff. Commit exactly that task's
implementation, associated docs, ticked acceptance, dated note and done status, including
derived ancestors/index when changed. Use explicit paths, never `git add --all` or a
blanket commit. With unrelated staged work, `git commit --only -- <owned paths>` can keep
it staged; inspect the index and stop if changes cannot be isolated safely.

After the commit, inspect its paths and verify unrelated contents/staging stayed intact.
Run audit again and confirm a second repair changes no bytes or modification times:

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" audit
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" repair
```

Do not select or start another leaf until that commit and its checks are verified. Repeat
from the original scoped status command until every in-scope task is done or cut, or a
blocker occurs. Never push or merge; neither is part of a verified task commit.

## Stop and report

After work starts, a failed check, failed acceptance or user-only decision stops the run:
record the active leaf blocked with a dated factual note, repair derived values when safe,
and leave incomplete work uncommitted. Start no later task and never choose the user's
answer. Report the branch, verified task commits, blocked task/evidence, remaining work
and decision needed. Do not restart automatically after asking for a decision.
