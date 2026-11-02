---
name: fold
description: Merge the files or directories the user names into their documentation owners, after an approved content and reference plan, then remove accounted-for sources.
user-invocable: true
---

Relocate existing content so each rule and its reason live with its owner. Do not invent
content to make a source disposable.

## Name and read the sources

Sources are exactly the files or directories the user names. There is no default source,
including `docs/decisions/`, and no marker or flag selects files. If none was named, ask
for the source before changing anything. Do not silently include neighboring files.

Read every selected source fully. Read the project's root config and consult
`docs/README.md` for document purposes; inspect actual `owns` declarations and open each
candidate destination before choosing it. An index purpose says what belongs there, not
what has already been said.

Move a rule and its rationale beside the behavior's owner. Merge duplicate statements
into one precise statement. Preserve useful rejected alternatives with their reasons.
Choose the narrower existing purpose when several fit. Create a document only when no
existing purpose fits; propose its type, purpose and topics under the configured schema.
Do not assign a topic to two owners or turn a local-only document into a shared owner.

## Show the complete plan before writing

Show a source-to-destination plan and get approval before modifying any file. Existing
explicit approval for that concrete plan remains valid; do not ask for it again unless
the proposed changes exceed it. Include:

- Each source part, its destination file and section, and whether it moves or merges.
- New documents and any new or changed `purpose` and `owns` topics.
- Material to discard, with a reason for every omission, including obsolete metadata.
- References to rewrite throughout the repository, legacy fields to remove, and the
  exact source files and any empty directories proposed for deletion.

For example, when the user explicitly names `notes/storage-choice.md`:

| Source part | Destination | Disposition |
| --- | --- | --- |
| Database rule and rationale | `docs/specs/storage.md`, Storage engine | Merge with the existing owner |
| Resolved meeting TODO | None | Discard because the recorded outcome resolves it |

State whether existing purposes and topics remain sufficient, rather than omitting that
decision. Open questions belong in the plan with a recommendation: ask the user first.
Only a question they cannot answer goes to `docs/open-questions.md`, not a hedge in a spec.

## Apply the approved plan

1. Put the content in its destinations in context, preserving the rule and its reason.
   Remove standalone-record framing only where the approved disposition accounts for it.
   Use the project's configured fields for any new document.
2. Search the entire repository for each old file path, link and extensionless reference,
   such as `notes/storage-choice`. Rewrite each affected reference to its actual owner,
   preserving anchors where appropriate. Resolution is on disk; there is no archive
   overlay to preserve references after deleting their targets.
3. Remove legacy `decisions` frontmatter fields after accounting for every value in the
   plan. If a value names an unselected source, do not silently fold or delete it: resolve
   its disposition and preserve its meaning, or ask to expand the scope before proceeding.
4. Delete a selected source only after every part is placed, merged or explicitly discarded
   and its references are handled. Delete empty directories only when included in the
   approved plan. Keep any unaccounted-for source and report the remaining work.

If an unexpected change needs a new decision, prepare the revised concrete plan before
requesting approval. Do not alter unrelated content or global settings.

## Verify and report

Run the bundled structural checks from the project root:

```sh
node "${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs" audit --fix
```

Relay remaining findings without inventing content to quiet them. Report what moved and
where, what was created, what was merged or discarded and why, and which sources were
deleted or retained. Nothing is dropped silently.
