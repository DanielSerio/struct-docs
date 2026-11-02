---
id: roadmap-status
title: Roadmap status
type: roadmap-node
status: in-progress
intent: A person or skill can ask where a roadmap stands and what is next.
---

## Tasks

### progress-view <!-- status: done -->
Intent: Each roadmap reads as one nested tree, built from the same model that computes rollups.
Acceptance:
- [x] Fixtures show breakout tasks nested under their milestone in document order, not after every milestone.
- [x] A node with a breakout shows its file's rolled-up status even while its heading status is stale.
- [x] Every roadmap in the tree gets its own view, with root id and derived root status.

Notes:
- 2026-11-02 npm run check passed all 211 tests; nested document order, effective breakout statuses and guarded recursion are verified.

### next-ready <!-- status: todo -->
Intent: The next ready node is the first startable leaf, and when there is none the reason is named.
Acceptance:
- [ ] A fixture with a broken-out milestone in progress offers its first ready task, never the milestone or a later milestone's task.
- [ ] A leaf whose ancestor has an unmet dep is not offered, and qualified deps resolve across roadmaps.
- [ ] Fixtures distinguish finished (every node done or cut), gated (naming the blocking deps) and open work with no todo leaf.
- [ ] A roadmap in a dependency cycle is reported as cyclic, naming the cycle, rather than hanging or reporting gated.
Deps: progress-view

### status-command <!-- status: todo -->
Intent: `docs-lint status [file]` prints the report and changes nothing.
Acceptance:
- [ ] `docs-lint status` prints every roadmap's tree and next ready node and exits 0, even when the report is unchanged.
- [ ] `docs-lint status <file>` reports only that roadmap file's descendants, with deps still resolved against every roadmap, and a path outside `docs/roadmaps/` is a usage error exiting 2.
- [ ] A roadmap that cannot be modeled exits 1 and points at `docs-lint audit`, and a process test proves no file is written in any case.
- [ ] The committed bundle passes its freshness check, and `docs-lint status` on this repo names a leaf as next.
Deps: next-ready
