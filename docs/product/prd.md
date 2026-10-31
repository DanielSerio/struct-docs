---
title: Struct Docs
type: prd
purpose: The problem, users, product requirements and scope of Struct Docs.
owns: [product-scope, product-success]
---

## Problem and users

Much is written about what project documentation should contain, and little about how it
should contain it. Struct Docs takes on the how: a customizable frontmatter schema that keeps
documents free of conflict and redundancy, and a CLI that runs the deterministic checks most
people spend a model on.

Developers working with coding agents need documentation whose location and authority stay
clear. Deciding where content belongs is expensive; duplicated rules drift and agents read
unnecessary files to find the current truth. Struct Docs replaces the manage-docs Claude
Code plugin with configurable document schemas and deterministic structural checks.

The original brief calls for customizable frontmatter, a single configuration file, the
existing documentation workflows plus roadmap execution, an ignored living directory, and
self-governance. These requirements are retained here; their detailed behavior belongs in
the specifications linked from the documentation index.

## Requirements

- One root `.struct-docs.yml` replaces scattered `.doctypes` and `.docsignore` files.
- Frontmatter and directory routing make misfiling mechanically detectable. Projects can
  customize document types and fields while the base fields and roadmap grammar stay locked.
- Declared topic ownership identifies competing sources of truth. It catches declared
  overlap, not repeated prose: the CLI does not interpret meaning.
- The CLI checks frontmatter, structure and roadmap grammar. House-style prose rules belong
  to optional project-owned rules, so they remain available without the plugin.
- Six skills cover initialization, auditing, roadmap creation, review, folding named sources
  and execution of an entire roadmap. Two hooks keep derived values current.
- Missing documents never create findings. What an author writes must be complete; the tool
  never demands more documents. Clean checks are silent.
- Derived values have one writer, the CLI. Rule rationale stays beside the rule, and only
  questions the user could not answer go into `docs/open-questions.md`.
- Git holds history. Retired documents are removed after content and references are resolved.
- Installation from git requires no install step and adds no dependencies to the consuming
  project. Choosing a generated project CLI explicitly adds Commander as a dev dependency.
- Migrate existing manage-docs repositories without losing content or changing source repos
  during the migration rehearsal. Dogfood this repository from the planning stage.

## Scope

Node 22+, TypeScript, Commander, a real YAML config parser and a committed single esbuild
bundle are required. The gate is local. Directory creation is lazy, and absent documents,
templates and roadmaps are valid states. No global settings or global CLAUDE.md are edited.

Deferred: CI and npm distribution, other coding agents, additional field kinds, a body-rule
configuration language and cross-document staleness tracking. Subject scoring and trends
remain excluded: model ratings are not comparable across sessions. Review finding ratings
remain useful within a single review.

## Success

A new project gets a useful routing index immediately. Existing projects can customize
schemas without losing checks. A migrated copy of SDLC-docs passes structural checks and
continues running its selected local rules when the plugin is unavailable. The tool remains
installed because maintenance costs less than the confusion it removes.
