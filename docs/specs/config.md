---
title: Configuration and schema registry
type: spec
status: draft
purpose: How root configuration defines doctypes, field kinds and exclusions.
owns: [configuration, field-kinds, ignore-patterns]
---

## Configuration

Read `.struct-docs.yml` at the repository root with a real YAML parser. An absent file uses
defaults; malformed YAML, duplicate keys, unknown options and invalid schemas produce
source-located errors, never a partially applied configuration.

`doctypes` maps immediate docs directory names to definitions. Merge supplied entries over
defaults; a null entry removes a default, and a field set to null removes an inherited custom
field. Omitted entries and fields retain defaults. Directory and type names use kebab-case.
`type`, `owns`, `gitignored` and `fields` are the definition options. `owns` defaults to true;
`gitignored` defaults to false. `gitignored: true` turns `owns` off, and setting both to true
is an error (`specs/doc-schema`). The repository config is a worked example.

Defaults: `product` maps to `prd`; `specs` maps to `spec` with required status values draft,
active and superseded, plus optional `superseded-by` reference; `reviews` maps to `review`,
disables owns, is gitignored and requires string subject and reference template to templates.
Projects may change or remove these defaults. Schema dispatch is by directory definition,
not a hardcoded branch for each type.

## Locked policy

Every non-roadmap document requires nonempty string `title`, `type` and `purpose`. Config
cannot redefine or remove these fields. `owns` is system-managed schema policy controlled
by the doctype flag, not a custom field. Exact root file `open-questions.md` has type
questions and owns disabled. README is generated and has no frontmatter.

The roadmaps directory and its roadmap and roadmap-node types, structure and grammar cannot
be changed, removed, renamed, or ignored. Reject ignore patterns matching roadmap paths,
including broad globs. `templates` and `living` are reserved directory keys; `living` has
only a top-level `gitignored` boolean, default true, because its lint exclusion is permanent.
Reject definitions that reuse locked roadmap types or system-owned field names.

## Field kinds

A field definition has `kind` and optional boolean `required` (default false).

| Kind | Value | Additional options |
| --- | --- | --- |
| string | Nonempty scalar string | None |
| enum | One string from a nonempty unique string list | Required `values` |
| list | Inline sequence of nonempty strings | None |
| reference | One document reference | Optional directory `to` |

Reject unsupported kinds, incompatible options and non-boolean flags. A reference target
restriction names a docs directory, including reserved templates. Field grammars resolve
to validator functions stored on the compiled schema fields. No custom code in YAML.

## Ignore patterns

`ignore` is a list of docs-relative patterns. Port manage-docs' tested subset: `*`, `**`,
trailing slash directory matches and leading slash root anchoring. Other characters,
including `?`, are literal. Preserve reasons as YAML comments beside patterns. Exclusions
remove documents from checks and index; gitignored doctypes have different semantics.

Why: one file makes adoption inspectable; four mechanical kinds provide customization
without building a programming language. Locked policy keeps routing and roadmaps reliable.
