---
name: audit
description: Check documentation structure, relay file:line findings, repair derived values when requested, or report roadmap progress and next work.
user-invocable: true
---

Run the bundled CLI (`../../bin/docs-lint.mjs` relative to this `SKILL.md`) from the
project root. Do not load document prose to reason about mechanical compliance: the CLI
owns those checks.

```sh
node "../../bin/docs-lint.mjs" audit
```

Add `--fix` only when the user asks for repairs. Add `--verbose` only when the user asks
for detailed warnings. Finding a repairable value alone does not authorize repairs.
Relay `file:line - problem` findings and the exit result; do not invent purpose, topics,
acceptance or other content to make them pass. A clean audit is silent. Warnings are
counted unless `--verbose` was requested.

For roadmap progress or next-work questions, run the separate read-only report:

```sh
node "../../bin/docs-lint.mjs" status
```

When the user names a roadmap file, pass its project-relative path after `status`.
Relay its tree, next leaf and finished, gated, open or cyclic explanation as printed.
Never compute statuses, dependency satisfaction or next-work order yourself.

Ask the user about judgment calls, with a recommendation. Record a question in
`docs/open-questions.md` only when the user says they cannot answer it. Keep rules and
their reasons together, and do not edit global settings. Point legacy-structure findings
at the init skill rather than attempting migration during an audit.
