---
title: Roadmap status, dependencies and order
type: spec
status: active
purpose: How roadmap status is derived, how deps resolve, and what the next ready node means.
owns: [roadmap-rollup, roadmap-dependencies, roadmap-order]
---

## Status rollup

Every node is exactly one of two kinds:

- A **leaf** — a **body node** (a `###` section) with no inline children and no `breakout`.
  Its status is **authored**. The CLI never computes a leaf status and `--fix` never touches
  one.
- A **derived node** — anything else: a body node with inline children or a `breakout`, and
  **always** the two file-level nodes, a roadmap root and a breakout file's own frontmatter.
  Its status is computed and is in the auto-repairable class.

File-level nodes are derived **whether or not their file currently holds children**, because
they exist to aggregate.

For derived nodes, **`cut` is ignored throughout**.

The rollup is an **ordered, disjoint** decision, evaluated top to bottom, where *children*
means the node's children minus those with status `cut`. **Order is normative.**

```
1. the node has no children                → `todo`
2. children is empty (every child `cut`)   → `cut`
3. any child `in-progress`                 → `in-progress`
4. any child `blocked`                     → `blocked`
5. all children `done`                     → `done`
6. all children `todo`                     → `todo`
7. otherwise (mixed `done` / `todo`)       → `in-progress`
```

A node with a `breakout` rolls up from that file's children.

**A dependency is satisfied when its status is `done` or `cut`.**

## Dependency resolution

A bare id resolves **within the roadmap it is written in**. `<roadmap>:<id>` resolves in the
roadmap it names, and in no other.

Ids are unique within a roadmap tree and **not** across roadmaps, so two roadmaps may each
hold an `auth`. Resolution therefore happens over every roadmap at once, and the qualifier is
never dropped: dropping it and looking the id up locally answers with a same-named node in
the wrong roadmap, which is worse than not resolving at all.

A dep resolving to **no node is an error**. It can never be satisfied, so the node it sits on
is gated forever, and nothing else in the system would say why.

A node with a `breakout` resolves at that file's rolled-up status — the same substitution the
rollup makes, so a dep and a rollup can never disagree about the node they share.

## Document order

`docs-lint status` reports the next ready node as *the first `todo` node in document order whose every
dep is satisfied*. **Document order is the order the tree is read:** depth-first, a node
before its children, breakout tasks where their milestone sits.

It is the same walk the progress tree is printed in, so the printed order and the offered
work cannot disagree. Ordering by file instead puts every breakout task after every
milestone, which offers a task from a milestone nobody has started ahead of a ready one
inside the milestone under way.
