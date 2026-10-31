---
title: Checks and safe repairs
type: spec
status: draft
purpose: Finding severity, audit scope and the boundary of automatic repair.
owns: [structural-checks, finding-severity, derived-repairs]
---

## Errors

Errors fail audit: malformed configuration or frontmatter; missing required fields; unknown
fields; invalid kind values; type-directory mismatches; non-kebab filenames; invalid or
missing references; a tracked document referencing a gitignored one; duplicate topic claims;
forbidden root files; and attempts to alter or ignore locked policy. A legacy decisions field
points at fold.

Port the roadmap check suite: duplicate tree-wide ids, missing leaf acceptance, missing or
misnamed breakouts (must be `./<id>.md`), invalid node fields, missing dependency targets,
cycles within or across roadmaps, and cut leaves lacking either superseded-by or Notes.
A breakout parent cannot duplicate its child's title or intent. File-level identities and
root placement obey the locked grammar. Superseded-by uses qualified roadmap node references.

Retain the draft-spec gate: an in-progress or done milestone cannot depend on a draft spec.
Do not treat custom documents without spec status as draft specs. A superseded spec is not
an implementation authority. Missing documents that nobody references never cause findings.

## Warnings

Count warnings by default; enumerate with --verbose. Warn once per unrouted directory,
pointing at init, or fold for legacy decisions. Warn on roadmap files over about twelve
children. A root with no specs references warns only when the project has a specs doctype.
Document size is no longer a plugin check; the copied file-size rule handles it locally.

Warnings alone do not fail the local gate. Audit and repair stay silent when clean. Roadmap
progress and next-ready work come from `docs-lint status` (`specs/cli`), never from audit.

Why: manage-docs printed this report on every audit, so a clean audit in a repo with a roadmap
was never silent. Moving it to its own command keeps both the silence and the report.

## Repairs

Only derived roadmap statuses, breakout heading statuses and the generated index are
repairable. Never invent purpose, topics, missing fields, acceptance or semantic resolutions.
Compute all derived statuses together to a fixpoint. Withhold status writes for a roadmap
with any error, including a failed parse in a descendant; do not freeze unrelated roadmaps.
The index remains repairable because it is a listing.

Report stale derived values as repairable findings, not authored violations. They are always
listed and never affect exit status; --fix labels successful repairs. Repair-only execution
never emits an audit. A second repair is a no-op.

Why: a value only the CLI writes cannot be an author's mistake, and purpose, topics and
acceptance are never invented because a tool that makes them up produces docs nobody trusts.
