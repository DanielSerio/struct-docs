---
title: Documentation skills
type: spec
status: active
purpose: Init, audit, roadmap, review and fold workflows and their approval boundaries.
owns: [initialization-workflow, audit-workflow, roadmap-authoring, review-workflow, fold-workflow]
---

## Shared behavior

Port the five manage-docs skills as separate, concise skills in the SKILL.md format shared by
Claude Code, Codex and Antigravity. Invoke the bundled CLI by a path relative to the skill,
not a host variable (`specs/packaging`). Keep reasons beside rules, ask about undecided behavior and
record only user-unanswerable questions in open-questions. No global settings edits.

## Init

Read existing docs and seed from actual content, not an interview about missing documents.
Propose root config and a per-file reorganization plan before changing an existing setup.
Show proposed owns topics for approval. Offer custom types for unrouted project documents,
or exclusion with a reason for generated/vendor content; remember the decision in config.
Never guess a type from a directory name alone. Create no empty directories or placeholder
documents. Seed assets/code-review-v1.md verbatim into docs/templates/code-review-v1.md.

The proposed config names every docs directory in use and every legacy `.doctypes` entry,
defaults included, so a reader sees each folder's rules in one file and no legacy type is
dropped unasked. Keep `owns` on for tracked doctypes and propose topics for their documents;
turning it off is a plan item with a stated reason. Check what git already tracks before
proposing `gitignored`. Why: a doctype that owns nothing cannot catch a document proposing
what another already covers, such as a wishlist item proposed again.

After approval, apply migration and reference updates, gitignore policy and index generation.
Offer the project CLI and selectable house-style rules, then a pre-commit hook or integration
with an existing check script. Respect declines. The migration spec owns conversion details.

## Audit

Run the CLI rather than loading all document prose to evaluate mechanical compliance.
Pass --fix for requested repairs, and --verbose for detailed warnings. Relay findings without
inventing content to make them pass. When roadmap status or next work is requested, run
`docs-lint status` and relay its report. No independent status algorithm in the skill.

## Roadmap

`new <name>` creates only docs/roadmaps/<name>/index.md. Use the user's intent and milestones;
never infer scope from the name. If unspecified, propose milestones and agree on them first.
Use four to eight demonstrable milestones, each with two to four observable acceptance lines.
Add dependencies only where work really cannot start without the predecessor.

`breakout <id>` creates a task file only when that milestone starts. If a breakout already
exists, stop and report its contents rather than replacing progress. Move title and intent
into the breakout; retain only routing fields in the parent. Run audit --fix to derive status.

## Review

Load the named project template, or templates/code-review-v1.md, before reviewing. If absent,
stop and point to init. Write docs/reviews/<branch-feature-or-roadmap-slug>.md with required
subject and template metadata. No date prefix; a repeat of the same slug overwrites it.

Carry over the review template and finding ratings: Critical, High, Medium or Low, ordered
by criticality, plus integer 1–10 problem confidence, solution confidence, effort, blast radius
and regression potential. Flags: investigation if either confidence <8; big lift if effort
>=4; widespread if blast radius >=5; extra QA if regression potential >=3. Project template
changes prevail. Do not total ratings or score a subject; prose explains each consequence.

## Fold

Sources are exactly the files or directories the user names. No marker, flag or default
source; if none is named, ask for it. Read sources fully, consult index purposes and owns,
and open candidate destinations. Show source-to-destination plan, new purposes/topics and
any discarded material with reasons, then get approval before applying it.

Move rules and rationale to their owners, merge duplicate statements and create a document
only when existing purposes do not fit. Rewrite references throughout the repo and remove
legacy decisions fields. Delete sources only after their content is accounted for. Run
audit --fix and report what moved, was created or was dropped and why.
