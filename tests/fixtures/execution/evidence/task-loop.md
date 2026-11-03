# Verified task-loop rehearsal

Date: 2026-11-03. This is a real delegated execution of the committed fixture, not
a simulated worker log or an autonomous execution engine. Three separate subagents
implemented the three active leaves sequentially; their coordinator verified and committed.

## Reproduce

Run `npm run rehearse:execution -- success`, then follow the execute-roadmap skill against
`docs/roadmaps/release/greeting.md` in the returned external project. Keep a separate staged
unrelated file to verify index isolation. Agent ids and commit hashes vary on a new run.

## Successful copy

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-P10Xog`
- Branch: `work/release-greeting`
- Baseline main and bare-remote main: `33c76be4f56d8e8365cda4eeeed31974e4ed016f`
- Raw observations: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-P10Xog\task-loop-observations.json`
- Baseline includes `.gitattributes` with `* text=auto`; CRLF edits pass `git diff --check`.
- The completed baseline-contract section remained byte-identical, including its dated note.
- `personal-notes.txt` stayed staged with identical bytes and mtime throughout. It is in no task commit.

Initial scoped status showed named-greeting in progress, while its next-ready line was
gated on active dependencies. The coordinator resumed that authored leaf instead of
selecting a derived node or waiting on the next-ready line. Its own baseline dep was done.

## Actual task sequence

### named-greeting

- Real subagent: `/root/execution_task_loop/named_greeting_attributes`
- Coordinator verification: both named and unnamed outputs; npm run check passes 2 tests.
- Commit: `01f90e7366cd29c71a8af726bf35f4886ec07261`
- Exact committed paths: `docs/roadmaps/release/greeting.md`, `src/greeting.mjs`, `test/greeting.test.mjs`.
- Post-commit state SHA-256: `c1dc56abcfc9323050e89c393ca754c653880a25505a251ba2396e56dcd09ec6`
- Audit exit 0, empty stdout/stderr. Second repair exit 0, empty stdout/stderr,
  with identical full file hashes/mtimes, staging and refs before and after.

```text
greeting [in-progress]
  [x] baseline-contract
  [x] named-greeting  (needs baseline-contract)
  [ ] emphasis  (needs named-greeting)
  [ ] batch-greeting  (needs emphasis)

next: emphasis
```

### emphasis

- Real subagent: `/root/execution_task_loop/emphasis`
- Coordinator verification: optional emphasis and unchanged default outputs; npm run check passes 3 tests.
- Commit: `25624c79037ea5e68820b40c612a1a157b882c52`
- Exact committed paths: `docs/roadmaps/release/greeting.md`, `src/greeting.mjs`, `test/greeting.test.mjs`.
- Post-commit state SHA-256: `4502747974ba24b7117319230699120c52fc6838afdaa9d31e608652ae331b72`
- Audit exit 0, empty stdout/stderr. Second repair exit 0, empty stdout/stderr,
  with identical full file hashes/mtimes, staging and refs before and after.

```text
greeting [in-progress]
  [x] baseline-contract
  [x] named-greeting  (needs baseline-contract)
  [x] emphasis  (needs named-greeting)
  [ ] batch-greeting  (needs emphasis)

next: batch-greeting
```

### batch-greeting

- Real subagent: `/root/execution_task_loop/batch_greeting`
- Coordinator verification: ordered excited and default batches, empty input and earlier API; npm run check passes 5 tests.
- Commit: `ee683dbd12fa5579d7e5ade1684ad1d118be240c`
- Exact committed paths: `docs/roadmaps/release/greeting.md`, `docs/roadmaps/release/index.md`, `src/greeting.mjs`, `test/greeting.test.mjs`.
- Post-commit state SHA-256: `c8ff20903a26daf8187b3b48998ac6e5e09fc391c3752e682f3988c00e6f1d09`
- Audit exit 0, empty stdout/stderr. Second repair exit 0, empty stdout/stderr,
  with identical full file hashes/mtimes, staging and refs before and after.

```text
greeting [done]
  [x] baseline-contract
  [x] named-greeting  (needs baseline-contract)
  [x] emphasis  (needs named-greeting)
  [x] batch-greeting  (needs emphasis)

next: nothing - every node is done or cut
```

Every commit has one parent and contains only that task's implementation/tests, its
ticked acceptance, dated coordinator evidence and done status; the last also includes
the derived greeting heading in its parent index. No later agent started before the
preceding commit and its audit/no-op repair were verified.

## Scope and publication boundary

The scoped report finished, so execution stopped. The root still has an untouched inline
usage-example milestone; no breakout or README implementation was created for it. The
parent index changed only the CLI-derived greeting status. Project README, owner spec,
generated index and unrelated staged notes retained both bytes and mtimes.

Main and every bare-remote ref stayed at baseline. Exactly three linear task commits
exist above it on the work branch. No push or merge was run.

Final report: branch `work/release-greeting`; the three commits above; no remaining
in-scope tasks, blocker or needed decision. Usage-example remains outside this entry scope.
Final observed state SHA-256: `c8ff20903a26daf8187b3b48998ac6e5e09fc391c3752e682f3988c00e6f1d09`.

## Stopped diagnostic and superseded setup

The earlier retained copy `struct-docs-execution-eWQkkX` stopped at its first coordinator
`git diff --check` failure: CRLF source edits were classified as trailing whitespace
without fixture attributes. Its named-greeting leaf is blocked with a dated factual note;
its implementation remains uncommitted, later tasks did not start, and main/remote are
unchanged. Raw evidence is `formatting-blocker.json` under that copy's root. It was not
resumed or counted as the successful run.

A separate LF-only setup `struct-docs-execution-4Z62EK` was superseded before any task
commit when the fixture contract was corrected. The successful run above was created
fresh after adding `.gitattributes`; the automated CRLF regression verifies that fix.
