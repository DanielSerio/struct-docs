---
title: Manage-docs migration and SDLC-docs conversion
type: spec
status: active
purpose: Legacy conversion, reference preservation and acceptance for converting SDLC-docs.
owns: [legacy-migration, sdlc-docs-conversion]
---

## Plan and conversion

Init surveys docs, config, markers, gitignore, local CLI and references before proposing a
per-file plan. Ask approval for the config, ownership claims and moves before applying them.
The CLI cannot infer owns from prose; proposals and approval belong to the skill.

Convert docs/.doctypes directory/type pairs into root config and docs/.docsignore patterns
into ignore entries, retaining nearby reasons. Preserve compatible custom types and fields.
Remove old config only after the new config preserves every choice and validates. Rename
scratch to living with reference updates; reconcile gitignore entries with configured policy.

Remove clean-docs and manage-docs adoption markers before activating the struct-docs marker
pair. Preserve README content outside generated blocks. Migrate a legacy roadmap tree into
roadmaps/<name>/ without rewriting its grammar or losing progress. Do not edit global hooks.

Inventory archive content and inbound links. Propose folding useful content into current
owners or deleting obsolete files, updating every affected reference. No archive overlay
survives. Legacy decisions can be explicitly named as sources in a fold plan; there is no
implicit source or deletion marker. Remove an archive only after all content is accounted for.

Add approved owns fields and validate uniqueness. Convert review names to stable subject
slugs; identify collisions before overwriting anything, with a content-preservation plan.
Update local wrappers to dynamic discovery and selected body rules, preserving unrelated
commands and package-manager conventions. Audit, repair, audit again and verify a no-op rerun.

## Real repositories inspected

SDLC-docs has wireframes, forecast and wishlist custom doctypes, a plans ignore, a multi-file
foundation roadmap, and .agents/cli. Its audit.ts hardcodes a manage-docs path. Its body linter
already checks line length, heading gaps, stale pointers and a 50,000-byte size warning.
Replace only the wrapper integration and extract those rules; retain its other agent commands.

PRD-RAG has deployment: guide, diagrams: diagram and test-cases: test-case mappings and an
architecture ignore with a reason. It has concurrent core, first-draft and test-suite roadmaps.
The migration must retain these distinctions instead of forcing everything into specs.

## SDLC-docs conversion acceptance

Convert SDLC-docs itself, on a fresh branch cut after its in-progress work is committed.
Record the starting inventory before anything changes; gitignored local documents stay where
they are. Get approval for inferred topics and semantic archive choices. Demonstrate clean
structure, resolvable references, preserved roadmap acceptance/statuses and stable index
after a second repair. Test with reviews present and absent: generated index must match.

Run selected house-style rules with the plugin available and with discovery unavailable;
missing-plugin warnings must not disable local rules. Demonstrate a local rule error still
fails, while missing plugin alone permits the commit gate. Record unrelated pre-existing
findings separately instead of rewriting product prose just to make the conversion pass.
Fix any Struct Docs defect the conversion exposes in Struct Docs, never with a workaround in
SDLC-docs. Do not migrate PRD-RAG or any other repository as a side effect.

Why the real repository: the conversion happens once, and a branch undoes it as completely as
a disposable copy would, without a harness to maintain. Why approval for topics: the CLI cannot
read prose, so `owns` values are proposals that only the owner can confirm.
