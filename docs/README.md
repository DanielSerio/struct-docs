# Documentation

<!-- struct-docs:index -->

Route by `type` and the directory table in `.struct-docs.yml`. Extend the document whose
`purpose` and `owns` cover the material; when two purposes fit, the narrower wins. Create a
new document only when no existing purpose fits. Keep reasons beside rules. Ask the user
about undecided behavior; only what they cannot answer goes into `open-questions.md`.

## product

- [prd](product/prd.md) — The problem, users, product requirements and scope of Struct Docs.

## specs

- [checks](specs/checks.md) — Finding severity, audit scope and the boundary of automatic repair.
- [cli](specs/cli.md) — Plugin commands, rule interface, layers and local development verification.
- [config](specs/config.md) — How root configuration defines doctypes, field kinds and exclusions.
- [doc-schema](specs/doc-schema.md) — Non-roadmap frontmatter, naming, references and declared topic ownership.
- [execute-roadmap](specs/execute-roadmap.md) — Branch, task delegation, verification and stopping behavior for roadmap execution.
- [layout](specs/layout.md) — Path classification, generated index contents and retirement of documents.
- [migration](specs/migration.md) — Legacy conversion, reference preservation and validation on repository copies.
- [packaging](specs/packaging.md) — Git installation, committed bundle, hook lifecycle and local plugin verification.
- [project-cli](specs/project-cli.md) — Generated Commander wrapper, plugin discovery and project-owned body rules.
- [roadmap-rollup](specs/roadmap-rollup.md) — How roadmap status is derived, how deps resolve, and what the next ready node means.
- [roadmap-schema](specs/roadmap-schema.md) — How roadmap files are structured and parsed. Status and deps are in specs/roadmap-rollup.
- [skills](specs/skills.md) — Init, audit, roadmap, review and fold workflows and their approval boundaries.

## roadmaps

- [v1](roadmaps/v1/index.md) — **in-progress** — Replace manage-docs with customizable structural checks and prove migration on a repository copy.

<!-- /struct-docs:index -->
