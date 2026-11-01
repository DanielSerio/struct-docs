---
title: Document schema and ownership
type: spec
status: active
purpose: Non-roadmap frontmatter, naming, references and declared topic ownership.
owns: [document-frontmatter, document-references, topic-ownership]
---

## Frontmatter

Port the manage-docs reader and its rejection tests. Keep flat, one-field-per-line scalars
and inline sequences; reject nested values, block lists, anchors and multiline scalars.
Retain BOM, quotes and inline-comment handling. A space followed by # starts an unquoted
comment; quote a value containing a literal hash after a space. Config YAML is unrestricted
by this frontmatter subset.

The config registry supplies required and optional fields. Reject unknown fields and invalid
field values, preserving source lines. There is no general id or updated field: the kebab-case
filename stem is the id. Type compares the author's classification with actual placement;
it remains useful even though the directory predicts the expected value.

## Ownership

`owns` is a required nonempty inline list of unique kebab-case topic strings unless the
doctype disables it. Reviews, questions and roadmaps disable it by default. A topic claimed
by two governed live documents is an error at the owns field line, naming the other owner
and its line. Gitignored doctypes never take part (`specs/config`); exclude living, templates
and explicit ignores too. Report repeated topics within a document as invalid values.

Why gitignored documents own nothing: a source of truth that exists on one machine is not a
source of truth, and counting it would make ownership errors differ between checkouts.

Ownership catches declared overlap only. Repeated prose and unclaimed semantic overlap need
human review. A cross-reference to a topic owner is permitted; claiming its topic is not.

## References

Document references are docs-relative `<directory>/<id>` paths without `.md`; nested paths
can identify roadmap files. Reject bare ids, absolute paths and traversal outside docs.
Resolve on disk, never through an archive overlay. A deleted target is an error at the
referring field. A reference's `to` restriction requires that directory. Templates are
existence-checked but their bodies and frontmatter remain free-form.

A tracked document may not reference a document in a gitignored doctype, even when the target
is present locally: the reference would break on any fresh clone. A gitignored document may
reference anything.

Optional fields are omitted rather than filled with sentinel strings. Review subject is
free-form text, not a reference. General superseded-by references obey the same resolver.

## Questions and reasons

A rule and its reason live together. There is no decision type or separate rationale tree;
legacy `decisions` fields are errors pointing to fold. Ask the user about undecided behavior
with a recommendation. Only an answer the user cannot give becomes a plain bullet in
`docs/open-questions.md`; resolving it writes the answer into its owner and deletes the bullet.
The CLI cannot enforce this prose convention.
