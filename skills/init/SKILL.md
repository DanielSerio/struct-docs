---
name: init
description: Initialize or migrate project documentation from existing content through an approved config, ownership and per-file plan.
user-invocable: true
---

Seed from the project's README, PRD and actual docs. Read before proposing structure;
do not interview the user about documents they have not written or create placeholders.
Create a directory only when its first real file is ready.

## Survey without writing

Read existing docs, root config, legacy config, index markers, gitignore, local CLI and
inbound references. Run the read-only survey (`../../bin/docs-lint.mjs` relative to this
`SKILL.md`) from the project root:

```sh
node "../../bin/docs-lint.mjs" init
```

Legacy migration refusals are a request for the skill's plan, not permission to bypass it.
Read unrouted content before proposing its type. A directory name alone is not evidence.
Offer a custom doctype for project material, or an exclusion with a recorded reason for
generated/vendor content or a declined type. Remember the decision in `.struct-docs.yml`.
Preserve compatible custom fields, explicit exclusions and their reasons.

## Show a concrete plan before changing an existing setup

Show the proposed root `.struct-docs.yml` and a per-file table of old path, destination,
type, metadata changes and references to update throughout the repository. Include:

- Proposed `owns` topics for approval, checking existing owners for uniqueness.
- Converted custom types/fields and ignore patterns with their retained reasons.
- Marker changes, gitignore reconciliation and template preservation or verbatim seeding.
- Local CLI/integration changes, collisions, deletions and content dispositions.

Get approval for that concrete plan before writing. Existing explicit approval remains
valid; ask again only when the plan exceeds it. The CLI cannot infer ownership from prose.
Proposed or inferred `owns` topics need approval even when the docs tree is new.
Ask about undecided behavior with a recommendation. Only questions the user cannot answer
go to `docs/open-questions.md`; keep rules and their reasons together.

## Apply only the approved migration

Remove old clean-docs/manage-docs adoption markers before writing the replacement layout
or activating Struct Docs markers. Preserve authored README content outside generated
blocks; account for any authored content found inside a legacy block in the plan.

Convert `docs/.doctypes` and `docs/.docsignore` into root configuration, retaining choices,
compatible custom fields and nearby reasons. Validate the new config before deleting old
config; distinguish config findings from the remaining legacy-migration refusals.
Perform the approved moves and metadata changes, and rewrite inbound references across
the repository. Rename scratch to living and migrate legacy roadmap files into
`docs/roadmaps/<name>/` without losing grammar, checked acceptance, notes or leaf progress.
Convert dated reviews to stable subject slugs only after resolving collisions with a
content-preservation plan. Add only approved ownership claims.

Inventory archive material and inbound links. Fold useful material or delete obsolete
files only through an explicitly approved source/disposition plan; remove an archive only
after every part is accounted for. There is no archive reference overlay or implicit
decisions source. Preserve unrelated wrapper commands and package-manager conventions.

The skill performs semantic migration; the CLI applies only its safe derived setup:

```sh
node "../../bin/docs-lint.mjs" init --apply
```

This seeds `assets/code-review-v1.md` verbatim into `docs/templates/code-review-v1.md`
when missing, preserves an existing project template, reconciles managed gitignore policy
and generates the index. Do not author a replacement template or create empty directories.

## Verify and offer integration

```sh
node "../../bin/docs-lint.mjs" audit
node "../../bin/docs-lint.mjs" repair
node "../../bin/docs-lint.mjs" audit
node "../../bin/docs-lint.mjs" init --apply
```

Resolve findings within the approved scope and verify the repeated apply changes nothing.
Report what moved, ownership/config choices, preserved content and remaining findings.
Offer the project CLI with selectable house-style rules, then a pre-commit hook or an
existing-check integration. Respect declines. Use shipped capabilities; if a requested
capability is not yet shipped, say so rather than inventing commands, flags or assets.
Edit no global settings or hooks, and never migrate another original repository as a
side effect. Work on an explicitly named disposable copy for migration rehearsals.
