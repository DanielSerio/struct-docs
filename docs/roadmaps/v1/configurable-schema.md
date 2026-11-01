---
id: configurable-schema
title: Configurable schema
type: roadmap-node
status: todo
intent: A project can define and validate its document schema in one file.
---

## Tasks

### project-tooling <!-- status: done -->
Intent: The repo can lint, typecheck and test TypeScript, since it holds no code yet.
Acceptance:
- [x] `npm run check` runs ESLint, TypeScript and the Node test runner, and passes on a sample module and test.
- [x] An explicit `any`, a missing semicolon, or a file over 100 code lines each fail lint, while a test file over 100 lines passes.
- [x] Importing a higher layer from `policy/` fails lint.

Notes:
- 2026-11-01 npm run check passed: lint, strict typecheck and four Node tests, including deliberate lint violations.

### config-loading <!-- status: done -->
Intent: `.struct-docs.yml` is read with a real YAML parser and is applied whole or not at all.
Acceptance:
- [x] A repo with no config file loads the defaults with no findings.
- [x] Invalid YAML, a duplicate key and an unknown option each produce an error with file and line.
- [x] A config holding any error yields no partially applied schema.
Deps: project-tooling

Notes:
- 2026-11-01 npm run check passed all 13 tests; YAML errors, duplicate keys and option errors retain source lines and return no config.

### doctype-registry <!-- status: done -->
Intent: Project entries merge over the default doctypes into the table every check reads.
Acceptance:
- [x] A fixture changes a default doctype, adds a custom one, and removes a default with a null entry.
- [x] A null field removes an inherited custom field, and omitted entries and fields keep their defaults.
- [x] This repo's own `.struct-docs.yml` loads with no findings.
Deps: config-loading

Notes:
- 2026-11-01 npm run check passed all 21 tests, including fixture merges, null removal, isolation and this repository config.

### field-kinds <!-- status: done -->
Intent: Each of the four field kinds compiles to a validator stored on the field.
Acceptance:
- [x] Fixtures accept and reject a value for each of `string`, `enum`, `list` and `reference`.
- [x] A `reference` with `to` rejects a target outside that directory.
- [x] An unsupported kind, an incompatible option and a non-boolean `required` each produce an error with file and line.
Deps: doctype-registry

Notes:
- 2026-11-01 npm run check passed all 25 tests; fixture values exercise all four grammars and invalid config option source locations.

### ignore-patterns <!-- status: done -->
Intent: The manage-docs ignore subset works from config, pinned by tests here.
Acceptance:
- [x] Ported tests pass for `*`, `**`, trailing slash and leading slash anchoring.
- [x] `?` and other characters outside the subset match literally.
Deps: project-tooling

Notes:
- 2026-11-01 npm run check passed all 31 tests; ported cases pin wildcard depth, anchors, directory boundaries and literal metacharacters.

### locked-policy <!-- status: done -->
Intent: Config cannot alter what the CLI depends on, and says so at the offending line.
Acceptance:
- [x] Redefining `title`, `type` or `purpose` produces an error with file and line.
- [x] Changing, removing or renaming the `roadmaps` doctype, or reusing a roadmap type, produces an error with file and line.
- [x] An ignore pattern matching roadmap paths is an error, including a broad glob such as `**`.
- [x] A `templates` or `living` doctype key, and `gitignored: true` with `owns: true`, each produce an error with file and line.
Deps: doctype-registry, ignore-patterns

Notes:
- 2026-11-01 npm run check passed all 38 tests, including protected fields, roadmap glob coverage, reserved types and gitignored ownership conflicts.

### path-classifier <!-- status: todo -->
Intent: One `classify()` answers every path question from the compiled config.
Acceptance:
- [ ] Fixtures prove only immediate Markdown children of a doctype directory are governed.
- [ ] Fixtures distinguish excluded, unrouted and forbidden paths, including a non-Markdown file in the docs root.
- [ ] A root rule or roadmap path wins over a matching ignore pattern, and no archived classification exists.
Deps: doctype-registry, ignore-patterns
