# Index and milestone entry-point rehearsals

Date: 2026-11-03. These are real delegated runs on the retained successful fixture copy.
The earlier milestone run is preserved and independently inspected; a new index run
continues its verified tip instead of regenerating that completed breakout. No executor
or simulated agent log was introduced.

## Reproduce

Run `npm run rehearse:execution -- success`, execute the greeting milestone as described
in [task-loop evidence](task-loop.md), then invoke the execute-roadmap skill against
`docs/roadmaps/release/index.md`. Agent ids, temp paths and commit SHAs vary per run.

## Existing milestone entry

- Entry: `docs/roadmaps/release/greeting.md`.
- Branch: `work/release-greeting`.
- Verified commits: `01f90e7366cd29c71a8af726bf35f4886ec07261`,
  `25624c79037ea5e68820b40c612a1a157b882c52`, `ee683dbd12fa5579d7e5ade1684ad1d118be240c`.
- Captured final state SHA-256: `c8ff20903a26daf8187b3b48998ac6e5e09fc391c3752e682f3988c00e6f1d09`.
- The scoped report finished and named no remaining in-scope work, blocker or decision.

Independent history inspection confirms those commits changed only greeting implementation,
its tests, its task file and the derived greeting status in the parent index. The inline
usage milestone was byte-identical in the baseline and that verified tip. README, owner
spec and generated index were untouched; completed evidence and staged notes survived.
This is the prior scoped run, not a claim that the later index run stayed in that scope.

## New index entry

- Retained root: `C:/Users/dseri/AppData/Local/Temp/struct-docs-execution-P10Xog`.
- Original entry for every selection: `docs/roadmaps/release/index.md`.
- New branch: `work/release-index`, created only after unchanged read-only preflight.
- Baseline main and every bare-remote ref: `33c76be4f56d8e8365cda4eeeed31974e4ed016f`.
- Previous verified tip and preserved old work-branch ref: `ee683dbd12fa5579d7e5ade1684ad1d118be240c`.
- Raw observations: `C:/Users/dseri/AppData/Local/Temp/struct-docs-execution-P10Xog/entry-points-observations.json`.
- Before state SHA-256: `c8ff20903a26daf8187b3b48998ac6e5e09fc391c3752e682f3988c00e6f1d09`.
- After branch-isolation state SHA-256: `387a5b90583a4fe61ecadafe73acd5c1e8109324f55ae45eee9e19d50186140d`.

Preflight audit exited 0 silently; full and scoped status exited 0. Every file hash/mtime,
staging state and ref was identical before/after preflight. The new branch preserved the
staged unrelated notes and existing verified progress. The CLI then selected:

```text
release [in-progress]
  [x] greeting
    [x] baseline-contract
    [x] named-greeting  (needs baseline-contract)
    [x] emphasis  (needs named-greeting)
    [x] batch-greeting  (needs emphasis)
  [ ] usage-example  (needs greeting)

next: usage-example
```

`usage-example.md` did not exist at that point. Only then did the coordinator create
it with the original intent and both original acceptance lines in one document-examples
leaf. The parent retained its heading/status, dependency and Breakout route only. The
existing greeting task file was not regenerated. Required file statuses were seeded,
and repair derived their subsequent values. The ORIGINAL index report was refreshed:

```text
release [in-progress]
  [x] greeting
    [x] baseline-contract
    [x] named-greeting  (needs baseline-contract)
    [x] emphasis  (needs named-greeting)
    [x] batch-greeting  (needs emphasis)
  [ ] usage-example  (needs greeting)
    [ ] document-examples

next: document-examples
```

## One delegated task and verified commit

- Real leaf subagent: `/root/execution_entry_points/document_examples`.
- Allowed implementation path: project `README.md` only.
- Coordinator verified the actual runnable README examples:
  named excited output `Hello Ada!`; batch outputs `Hello Ada!` then `Hello Lin!`.
- `npm run check` passed all 5 existing tests; `git diff --check` passed.
- New verified commit: `35203eada5ca72d76e9993014dfd0c0cccc92b75`.
- Exact committed paths:
  - `README.md`
  - `docs/README.md`
  - `docs/roadmaps/release/index.md`
  - `docs/roadmaps/release/usage-example.md`

This is exactly one new task commit above the three earlier verified commits. It includes
the just-in-time breakout, ticked leaf acceptance, dated evidence and done status, plus
CLI-derived root/parent/index updates. The coordinator authored only leaf lifecycle status;
file and parent aggregate values came from repair. There was no preparatory breakout commit.

After the commit, audit exited 0 with empty stdout/stderr. The next repair also exited 0
silently and preserved every file byte/mtime, staging state and ref. The existing greeting
breakout, code, tests, owner spec and unrelated notes retained their exact bytes AND mtimes.
The old work/release-greeting ref, main and every bare-remote ref remained unchanged.
`personal-notes.txt` is still staged with its original blob; it appears in no task commit.
No push or merge ran.

Final state SHA-256: `aba6dee01c14c9606c69fce590f14bd98d6740e37c8d0a60ce56b8d3e08ee0ae`.

```text
release [done]
  [x] greeting
    [x] baseline-contract
    [x] named-greeting  (needs baseline-contract)
    [x] emphasis  (needs named-greeting)
    [x] batch-greeting  (needs emphasis)
  [x] usage-example  (needs greeting)
    [x] document-examples

next: nothing - every node is done or cut
```

## Final report

Branch: `work/release-index`. New verified task commit:
`35203eada5ca72d76e9993014dfd0c0cccc92b75` (document-examples). Earlier preserved verified progress:
`01f90e7`, `25624c7`, `ee683db` on the unchanged `work/release-greeting` ref.
Remaining in-scope work: none. Blocker: none. Decision/input needed: none.
The ORIGINAL index report is finished. The milestone report remains finished too.

Authored work never leaked outside either entry scope. Related parent/root statuses and
generated index content were derived by repair in both runs, without permission to
change unrelated authored work.
