---
title: Layout, routing and document removal
type: spec
status: draft
purpose: Path classification, generated index contents and retirement of documents.
owns: [path-classification, document-routing, generated-index, document-retirement]
---

## One classifier

`classify()` alone determines path policy; init and audit share its unrouted predicate.
There is no archived classification or existence overlay.

| Docs-relative path | Policy |
| --- | --- |
| README.md | Generated index, no frontmatter |
| open-questions.md | Governed exact root filename |
| Any other root file | Error, including non-Markdown files |
| living/** | Never linted or indexed |
| templates/** | Free-form, never linted or indexed |
| roadmaps/** | Locked roadmap structure |
| Immediate Markdown child of a configured directory | Governed by that definition |
| Deeper or unknown directory documents | Unrouted, unless excluded |
| Dot-prefixed paths or configured ignore matches | Excluded |

Root restrictions and locked roadmap policy take priority over ignore matches. Other
non-Markdown assets within directories are not document-schema inputs. An archive directory
is legacy content requiring migration, never a special reference target. Create no empty
directories; each appears when its first file does.

## Routing and lifecycle

Route by type and configured directory. Extend the document whose purpose and ownership
cover the material; when two fit, use the narrower. Create a document only if no current
purpose covers it. Keep rationale beside its rule. Ask about undecided content.

When retiring a document, move useful material to its owners, rewrite inbound references
throughout the repo, then delete it. Git retains history. Do not leave an archive copy or
silently satisfy links to a deleted document. Fold handles relocation that requires reading.

## Generated index

Own only the block between `<!-- struct-docs:index -->` and
`<!-- /struct-docs:index -->` in docs/README.md. Preserve content outside it and existing
line endings. Include the routing guidance, present governed docs with purposes, roadmap
roots with intent and status, and unrouted documents grouped by directory without invented
purposes. Use deterministic directory and filename order, retaining default product, specs,
reviews ordering before custom directories. Never list living, templates, ignore matches,
or gitignored doctypes, even when those files exist locally.

Why: gitignored documents vary per machine; indexing them would make a shared index perpetually
stale. Their own fields are still checked whenever present, but they never affect the result
for any other document: no ownership, and no incoming references. README is the routing
entry point rather than another prose source of truth. The initial planning index is seeded before the CLI
exists; subsequent changes to its derived block belong to the CLI.

Init writes `/docs/living/` and `/docs/reviews/` ignore entries by default, respecting config
and preserving unrelated gitignore content. Changes to these defaults must also reconcile
entries managed by init, without overriding independent user patterns silently.
