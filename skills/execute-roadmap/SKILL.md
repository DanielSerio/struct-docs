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

## Execute and report

Use the scoped `status` report for order: resume its first in-progress leaf, otherwise
take its next ready leaf. Skip done and cut work. Use one subagent per task sequentially,
with owners, acceptance, allowed scope and checks; the coordinator verifies and commits.
Mark only authored leaves in-progress, then tick acceptance, add dated evidence and mark
done only after verification. Repair derived values, audit, and make one scoped task
commit before selecting more work. Preserve existing breakouts and create a missing
milestone breakout only when that milestone begins.

After work starts, a failed check, failed acceptance or user-only decision stops the run:
record the active leaf blocked with a dated factual note, repair derived values when safe,
and leave incomplete work uncommitted. Start no later task and never choose the user's
answer. Report the branch, verified task commits, blocked task/evidence, remaining work
and decision needed. Do not restart automatically after asking for a decision.
