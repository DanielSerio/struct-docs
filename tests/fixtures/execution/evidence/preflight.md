# Read-only execution preflight rehearsal

Date: 2026-11-03. These are coordinator rehearsals following the execute-roadmap skill,
with fresh copies from the committed fixture. They record actual CLI/Git observations;
they are not an autonomous executor or a claim that skill prose is unit-tested.

## Reproduce

Run `node --test tools/execution-preflight.test.mjs` from the checkout. Its four tests
arrange the same six cases with `createRehearsal`, `arrangePreflight`, `projectState` and
`preflightReports`. Each setup happens before its snapshot. Test copies are cleaned only
after the generated temp root is checked; the observed copies below were retained.

For each copy, preflight ran only `docs-lint audit`, full `docs-lint status`, and
`docs-lint status docs/roadmaps/release/greeting.md`, using the committed bundle.
Snapshots cover every non-.git file SHA-256 and mtime, staged/untracked status, current
branch, HEAD, main, all local refs and every bare-remote ref. Aggregate hashes include
that entire state. No rejection authored a blocked status, note, file or branch.

Raw observations were saved outside the checkout at `C:\Users\dseri\AppData\Local\Temp\struct-docs-preflight-evidence-1793708415979.json`.

## malformed

Reject: malformed roadmap frontmatter; status cannot model the graph.

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-189sES`
- Baseline main/HEAD: `4348dd801e6edec211932004e3c6b3abe8b87eaf`
- Before state SHA-256: `874df4532ec604b1aa841181db14dba349777da6ecbf148d3b31cbaf407f7187`
- After read-only state SHA-256: `874df4532ec604b1aa841181db14dba349777da6ecbf148d3b31cbaf407f7187`
- Audit/full status/scoped status exits: 1/1/1.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

## cycle

Reject: named-greeting -> emphasis -> named-greeting is cyclic.

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-kwxyP7`
- Baseline main/HEAD: `35410d254af14459e00f938573d7ea110cb1f0bf`
- Before state SHA-256: `9b6ba4e6d42e907c5c4aaf1e23e08ce4be0602052b8bd2b812ab320db087557b`
- After read-only state SHA-256: `9b6ba4e6d42e907c5c4aaf1e23e08ce4be0602052b8bd2b812ab320db087557b`
- Audit/full status/scoped status exits: 1/0/0.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

## external-ancestor

Reject: ancestor greeting depends on out-of-scope prerequisite:approve [todo].

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-4VMeSl`
- Baseline main/HEAD: `22a0347413fa428037665abc7cdbfdea63fef8c7`
- Before state SHA-256: `b8ac6c57d25ffe83add1dcac31b527b79908d920a0f876c5df293fb29045ace1`
- After read-only state SHA-256: `b8ac6c57d25ffe83add1dcac31b527b79908d920a0f876c5df293fb29045ace1`
- Audit/full status/scoped status exits: 0/0/0.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

## external-later

Reject: later batch-greeting depends on out-of-scope prerequisite:approve [todo].

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-qVQIas`
- Baseline main/HEAD: `b1534b1bb70bddf365ac412d347e3449d2c34465`
- Before state SHA-256: `a19ea77c9ef09fb569937b35712d8bcafca7fe340f3fb149f30319ebe4e96c93`
- After read-only state SHA-256: `a19ea77c9ef09fb569937b35712d8bcafca7fe340f3fb149f30319ebe4e96c93`
- Audit/full status/scoped status exits: 0/0/0.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

## dirty-overlap

Reject: src/greeting.mjs contains unrelated pending changes and is the active task implementation file.

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-uAeTrA`
- Baseline main/HEAD: `4d6c2ff23708f03303a8cd9cf22280417ca6b118`
- Before state SHA-256: `37be3371f5c373e57a3912fb882cc5d1f5cc09baa0916fec0af7f8ad7d871891`
- After read-only state SHA-256: `37be3371f5c373e57a3912fb882cc5d1f5cc09baa0916fec0af7f8ad7d871891`
- Audit/full status/scoped status exits: 0/0/0.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

## safe-unrelated

Pass: staged personal-notes.txt is outside task/repair paths; create then reuse work/release-greeting.

- Retained root: `C:\Users\dseri\AppData\Local\Temp\struct-docs-execution-eWQkkX`
- Baseline main/HEAD: `4a2245495177c097d3757cf9ecdcfc9b6c2a3576`
- Before state SHA-256: `4e107d4709359577e671ad8f8c30a48282eb9d4c2fe46496a2399593af0187e2`
- After read-only state SHA-256: `4e107d4709359577e671ad8f8c30a48282eb9d4c2fe46496a2399593af0187e2`
- Audit/full status/scoped status exits: 0/0/0.
- Branch after read-only preflight: `main`; main and remote remain at baseline.

After those gates passed, the coordinator created `work/release-greeting`.
`personal-notes.txt` remained staged with the same contents/mtime. main, HEAD and
bare-remote refs stayed at baseline. Reusing the current dedicated branch created
no branch or file changes. No push or merge ran.
