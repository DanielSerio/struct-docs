---
title: CLI architecture and command contract
type: spec
status: active
purpose: Plugin commands, rule interface, layers and local development verification.
owns: [plugin-cli, rule-contract, architecture-layers, development-gate]
---

## Commands

Ship `docs-lint` for Node 22+ with Commander. The committed entry is
`bin/docs-lint.mjs`, one esbuild bundle with no runtime package installation. Commands:

- `init [--apply]`: survey, plan and apply safe initialization; no prose interpretation.
  Without `.struct-docs.yml`, init prints a drafted config naming every default doctype,
  every legacy `.doctypes` entry and every docs folder holding documents, with legacy ignore
  reasons and a comment naming the reserved `roadmaps/`, `templates/` and `living/`; apply
  writes it when nothing is left to decide. With a config, init refuses to apply while any
  of those folders is not named under `doctypes` (`null` names a removed default).
  With `--apply`, `--project-cli <rules>` (and `--docs-dirs <dirs>`) writes the approved
  project CLI and `--commit-gate <auto|pre-commit|check-script>` installs the approved gate
  (`specs/project-cli`). Neither runs a package manager; init prints the install command.
- `audit [--fix] [--verbose]`: full structural checks and optional derived repairs.
- `check <file>`: single-file parse, naming and type-placement checks; no tree scans. A
  missing file is a usage error (exit 2), so a typo never reads as clean; an existing file
  outside `docs/` passes unchecked, so a list of changed files can be passed whole.
- `repair`: derived repairs only, with no audit narration.
- `status [file]`: read-only progress tree and next ready node for every roadmap, or for the
  descendants of one roadmap file. Distinguishes finished, gated (naming blockers) and cyclic.

Commands work on the nearest adopted project at or above the working directory, searching no
higher than the git root; with none, the working directory is the project. Adopted means the
same as for the hooks (`specs/packaging`): one ordered struct-docs:index marker pair in
`docs/README.md`. One source defines it, and the build emits it for the hooks. File arguments
stay relative to the working directory. Why: a skill or agent that changed directory must not
pass vacuously.

Each command module exports `register(program)` and calls separately testable handlers.
The entry only configures Commander, arguments, streams and exit status. Findings use
`file:line - problem`. Any error finding exits 1, including malformed config, since it has a
source location. Clean, warnings-only and repairable-only runs exit 0. Usage errors and
execution failures exit 2. Help and `status` print because output is what was asked for; a
roadmap that cannot be modeled makes `status` exit 1 and point at `audit`. Missing docs for
audit and repair are silent success; init may create docs when there is content to seed.

Why: `status` is separate so audit can stay silent when clean, which is what makes it cheap
in a commit gate, while skills and `execute-roadmap` still get one source for what is next.
A stale derived value does not fail the gate because the Stop hook or `--fix` repairs it and
nobody has authored anything wrong.

## Single rule contract

Every plugin rule and copied house-style rule takes one parsed document and returns findings.
A parsed document carries its docs-relative path, raw source, lines, frontmatter values and
locations, classification, and optional parsed roadmap. Tree-wide handlers attach read-only
context (compiled config, reference targets, topic owners and roadmap model) to that document.
Rules neither read files nor print, mutate, import Commander or set exit codes. House-style
rules use only path, source, lines and frontmatter, which is what the copied reader supplies
(`specs/project-cli`).

A finding contains file, one-based line, rule identifier, severity (error, warning or
repairable) and message; a repairable finding also carries its repair metadata. The shared
reporter renders the standard output and computes exit status. Keep runtime failures distinct
from document findings.

Why: one contract keeps a large rule library quick to write and consistent, and a rule with
no I/O can be tested with a plain object and copied into a project unchanged.

## Layers

Port manage-docs logic and tests, replacing obsolete behavior rather than wrapping it.
The following boundaries are enforced by ESLint, including equivalent absolute imports.

| Layer | Allowed application dependencies |
| --- | --- |
| policy | policy only |
| read | policy, read |
| render | policy, render |
| roadmap | policy, read, roadmap |
| check | policy, read, render, roadmap, check |
| repair | policy, read, render, roadmap, repair |
| commands | All layers; coordinates handlers |

Keep schema as a registry and validators as field values. One classifier answers all path
questions. Only repair writes derived docs; initialization has an explicit apply phase.
Types live in the lowest layer that uses them. Resolve layers relative to the directory
holding `eslint.config.js`; neither the working directory nor ancestor directory names can
change enforcement. Source files directly under `scripts/` or in undeclared layers are errors.
Add a layer to the policy explicitly before using it. Tests are exempt from layer restrictions.
Favor small functions, dependency injection and composition; avoid speculative abstractions.

## Verified port foundations

Inspection of manage-docs confirms: commands/manage-docs.mjs is a thin argument adapter;
policy/doc-types.mjs is the table with docReference validator values; policy/classify.mjs
owns classification and isUnrouted; eslint.config.js restricts sibling-layer imports.
Port these patterns, adding Commander registration modules and the unified rule contract.

Port handler, parser, classifier, resolver, roadmap, repair and index tests. Remove archive
and legacy config expectations; add config kinds, locking, owns and ignored-index cases.
Use Node's test runner for pure logic; use process tests only for actual CLI boundaries.

Local check runs ESLint, TypeScript, tests, reproducible-bundle freshness, manifest/path
validation and dogfood checks. ESLint enforces no explicit any, TypeScript-aware semicolons (including type aliases,
declarations and member delimiters) and `max-lines`
under 100, counting code only (`skipBlankLines` and `skipComments`) so rationale comments are
never squeezed out. Overrides exempt constant files and give tests a higher cap, because tests
grow by adding cases. Use literal unions rather than TypeScript enums. Commit no CI workflow
or npm publication setup. The generated bundle and emitted project-CLI files are build output,
excluded from source lint limits.

Test builds clean their exact `dist/` output directory before compiling. Deleted or renamed
tests must not survive as stale JavaScript and affect the next run.
