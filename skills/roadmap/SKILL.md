---
name: roadmap
description: Create an agreed roadmap with new <name>, or expand a starting milestone into tasks with breakout <id>, preserving existing progress.
user-invocable: true
---

These are skill operations, not additional CLI commands. Run CLI commands from the
project root using the bundled path below (`../../bin/docs-lint.mjs` relative to this
`SKILL.md`); the CLI owns grammar and derived values.

## new <name>

Create only `docs/roadmaps/<name>/index.md`; never overwrite an existing file or generate
breakouts up front. The name supplies the directory and id, not the scope. Use the user's
intent and milestones. If either is missing, propose it and get agreement before writing.
Do not pad an explicit milestone list with invented work.

When proposing a roadmap, use four to eight demonstrable capabilities, each with two to
four observable acceptance lines. Prefer outcomes such as "session survives reload" to
activities such as "work on authentication". Add dependencies only when work cannot start
without a predecessor, not merely to express a preferred order.

This worked example assumes these four milestones were agreed. Use the actual project
spec references; do not create placeholder specs to populate `specs`.

```markdown
---
id: launch
title: Subscription launch
type: roadmap
status: todo
intent: Customers can subscribe and manage their receipts.
specs: [specs/billing]
---

## Milestones

### auth <!-- status: todo -->
Intent: Customers can access their account.
Acceptance:
- [ ] A customer can sign in
- [ ] A session survives reload

### billing <!-- status: todo -->
Intent: Customers can subscribe.
Acceptance:
- [ ] Checkout creates a subscription
- [ ] A payment event updates subscription state
Deps: auth

### receipts <!-- status: todo -->
Intent: Customers can keep payment records.
Acceptance:
- [ ] A paid invoice appears in the account
- [ ] Its receipt can be downloaded
Deps: billing

### cancellation <!-- status: todo -->
Intent: Customers can end a subscription.
Acceptance:
- [ ] A customer can cancel from the account
- [ ] Access ends at the paid-through date
Deps: billing
```

Use stable kebab-case ids unique within the whole roadmap tree. Bare deps address this
roadmap; `<roadmap>:<id>` addresses another. Link only existing nodes. Roadmap files use
`intent`, never `purpose`, `date` or `updated`. Seed required file statuses with `todo`;
then let the CLI derive file and breakout-heading statuses. Only leaf statuses are authored.

## breakout <id>

Locate the milestone in the named roadmap; clarify which one if ambiguous. Create a task
file only when work on that milestone starts. If `Breakout` is already set, or the target
file already exists, stop and report its contents. Never regenerate checked acceptance,
dated notes or in-progress tasks.

Create `docs/roadmaps/<roadmap>/<id>.md`. Move title and intent to its frontmatter, with
`id: <id>`, `type: roadmap-node` and an initial `status: todo`. Translate the agreed outcome
into observable leaf tasks, without inventing scope. Carry existing acceptance, checked
evidence and dated notes into the file unchanged in meaning; keep historical context
before `## Tasks` when it does not belong to one task. Each task has its own authored
heading status, intent and acceptance. For example, billing may start with:

```markdown
---
id: billing
title: Subscriptions
type: roadmap-node
status: todo
intent: Customers can subscribe.
---

## Tasks

### checkout <!-- status: todo -->
Intent: Create subscriptions through checkout.
Acceptance:
- [ ] Checkout creates a subscription

### payment-events <!-- status: todo -->
Intent: Keep subscription state current.
Acceptance:
- [ ] A payment event updates subscription state
Deps: checkout
```

The parent retains only its routing heading, existing status and deps, plus
`Breakout: ./<id>.md`. Remove its title, intent and moved detail; do not duplicate them.
Depth comes from breakout files, not nested heading levels.

## Verify and report

```sh
node "../../bin/docs-lint.mjs" audit --fix
node "../../bin/docs-lint.mjs" status
```

Relay findings and the progress report without a status or next-work algorithm of your
own. Ask about undecided behavior with a recommendation; only a question the user cannot
answer goes to `docs/open-questions.md`. Keep reasons beside rules. Edit no global settings.
