---
title: Roadmap schema and body grammar
type: spec
status: active
purpose: How roadmap files are structured and parsed. Status and deps are in specs/roadmap-rollup.
owns: [roadmap-grammar]
---

Governs `roadmaps/**`. Root and breakout files share one node schema at different depths.
Frontmatter carries only the root node; children live in the body.

How status is derived from these files, and how deps resolve, is `specs/roadmap-rollup`.

## Files

Root — `docs/roadmaps/<roadmap>/index.md`:

```yaml
---
id: v1
title: V1 Launch
type: roadmap
status: in-progress           # derived; written by the CLI, never by hand
intent: Ship usable product to first 10 users.
specs: [specs/sync-layer, specs/auth-model]
---
```

Breakout — `docs/roadmaps/<roadmap>/<id>.md`:

```yaml
---
id: billing
title: Take money
type: roadmap-node
status: in-progress
intent: Stripe checkout + webhook.
---
```

A roadmap root is always `index.md`, and its `id` is the roadmap directory name: the CLI
checks `id == basename(dirname(file))`.

There is no `date` field and no `active` field. A roadmap is active iff its `status` is
`in-progress`.

Roadmap directories are never hardcoded. Concurrent roadmaps are expected.

## Node fields

| field | required | rule |
|-------|----------|------|
| `id` | yes | stable kebab-case slug, **unique across the whole roadmap tree** — root, every breakout, every depth. Never rename once referenced. |
| `title` | file-level | short human name. Required in a root's or breakout's frontmatter; **optional on a body node**, where the heading text already names it. Owned by the breakout file when the node has one |
| `status` | yes | `todo` \| `in-progress` \| `blocked` \| `done` \| `cut` |
| `intent` | yes | one line: the outcome / why it exists. Owned by the breakout file when the node has one |
| `acceptance` | leaf | checklist of testable done-when criteria |
| `deps` | no | bare id = this roadmap; `<roadmap>:<id>` = any roadmap. Omit if none |
| `breakout` | no | **`./<id>.md`** — a sibling file in this roadmap directory, stemmed on the node's own id. Omit when detail is inline |
| `superseded-by` | no | `<roadmap>:<id>` — pairs with `cut` to record why it was dropped |
| `specs` | no | **root only** — the documents this roadmap is built against. `<dir>/<id>` document references, resolved like any other reference. `audit` warns on a root without one only when a specs doctype is configured |
| `notes` | no | append-only dated log |

Roadmap nodes carry no `purpose`, no `updated` and no `date`.

**Two reference grammars meet on this type, and they are not interchangeable.** `specs`
entries are `<dir>/<id>` document references, resolved against existing files under `docs/`. `superseded-by` and `deps` are `<roadmap>:<id>` deps, resolved against the roadmap
tree. One checker for both would reject every valid `superseded-by`, so the grammar belongs
to the field rather than to the type.

`title` is the one field whose requirement differs by level, and the reason is the same one
that cut `id` from general docs: under `### webhooks`, a `Title: Webhooks` line stores a
second copy of a value the heading already carries, and two fields that can disagree are
worse than one that cannot. A file-level node has no heading, so it needs the field.

Tree-wide unique ids are what let `<roadmap>:<id>` address any node at any depth, with a
bare id meaning "this roadmap".

## Body grammar

Children are `###` sections under a `## Milestones` (root) or `## Tasks` (breakout) heading.
Status rides in an HTML comment on the heading so it stays greppable.

A **leaf** carries its own detail:

```markdown
### webhooks <!-- status: in-progress -->
Intent: Keep subscription state in sync with Stripe.
Acceptance:
- [ ] Webhook updates subscription
- [ ] Replayed events are idempotent
Deps: auth
Notes:
- 2026-07-22 started, stripe keys in vault
```

A node **with a breakout** carries only what walking the tree needs:

```markdown
### billing <!-- status: in-progress -->
Deps: auth
Breakout: ./billing.md
```

A **cut** node records why it was dropped — either a note, or the node that replaced it:

```markdown
### mobile-app <!-- status: cut -->
Intent: Native client.
Superseded-by: v2:mobile
```

Body field keys are the frontmatter field in heading case, so `superseded-by` is written
`Superseded-by:` and takes the same `<roadmap>:<id>` dep grammar there as it does in
frontmatter. A hyphenated key outside the field list is an error, not prose.

**The breakout file's frontmatter is authoritative for that node's authored fields**
(`title`, `intent`). The parent's `###` section is a routing table — `id`, `status`, `deps`,
`Breakout:` — enough to walk the tree and roll up without opening the child file.

A parent carrying `title` or `intent` anyway is an **error**, not a stale copy to repair:
the field belongs to the breakout, so the fix is to delete the line rather than correct it.
`status` is the one value a parent stores about its child, and that one is derived.

**The CLI owns this grammar.** Skills that write roadmap files carry worked examples, not a
specification.

**Invariant:** a node holds inline children OR points to a `breakout` file, never both.

This one is held by the **grammar**, not by a check. A file defines exactly one `###` level,
so a body node has no way to carry a child, and the state is unwriteable rather than
forbidden. There is deliberately no error for it: an error nothing can trigger is a spec
describing a check that does not exist.

## Size

Roadmap files are capped by **child count** (~12) rather than lines, as a warning. Their
split mechanism is `roadmap breakout`.
