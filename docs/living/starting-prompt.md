# Struct Docs: starting prompt

Paste everything below the line into a new session in `C:\developer\struct-docs`.

---

Build **Struct Docs**, a Claude Code plugin that replaces my `manage-docs` plugin. This repo
holds only `docs/README.md` and this prompt, and it is not yet a git repository.

## Read first

- `docs/README.md`: the original brief. This prompt wins where they differ.
- `C:\developer\manage-docs`: the system being replaced. Read its `README.md`,
  `docs/product/prd.md`, every file in `docs/specs/`, and every `skills/*/SKILL.md`.
- `C:\developer\SDLC-docs\docs\specs\agents-cli.md`: a project-level CLI and `docs-lint` that
  grew beside manage-docs, showing what projects need that it lacked.
- `C:\developer\PRD-RAG` and `C:\developer\SDLC-docs`: real repos that must migrate.

## Why replace it

The problems to fix are **scattered config** (`.doctypes` and `.docsignore`) and **too little
customization** (a project type can only have the base fields). Keep what works: anything not
changed below carries over from manage-docs, including its principles of silence when clean,
nothing firing on an absent document, derived values written only by the CLI, one place for open
questions, and reasons living beside rules.

## Decisions

These are settled. Do not reopen them. Raise a conflict with me if you find one.

### Conflict and redundancy: `owns`

Each document declares the topics it is the single source of truth for:

```yaml
---
title: Accounts
type: spec
purpose: How people sign in, and how sessions start and end.
owns: [sign-in, sessions, invites]
---
```

- Topics are kebab-case. A topic claimed by two live documents is an error, reported at
  `file:line` and naming the other owner.
- `owns` is required unless a doctype sets `owns: false`. It is off for reviews, for
  `open-questions.md`, and for roadmaps.
- The docs must be honest about the limit: this catches declared overlap, not repeated prose.
  The CLI does not interpret meaning.

### Config: `.struct-docs.yml`

One file at the repo root replaces `.doctypes` and `.docsignore`. Illustrative shape:

```yaml
ignore: [generated/]
doctypes:
  product:
    type: prd
  specs:
    type: spec
    fields:
      status:
        kind: enum
        values: [draft, active, superseded]
        required: true
  reviews:
    type: review
    owns: false
    gitignored: true
    fields:
      subject: { kind: string, required: true }
      template: { kind: reference, to: templates, required: true }
  guides:
    type: guide
    fields:
      audience: { kind: string }
```

- Field kinds are `string`, `enum`, `list` and `reference`. Nothing more until a need appears.
- Keys are directory names and `type` is the document type, because the two are not always the
  same word (`product` and `prd`). Only immediate children of a doctype directory are governed.
- **Locked:** `title`, `type` and `purpose` on every non-roadmap document, and the `roadmap`
  doctype, whose structure and grammar carry over unchanged from manage-docs. It cannot be
  changed, removed or ignored. Config that tries to is an error.
- `product`, `specs` and `reviews` are defaults a project may change or remove. A roadmap's
  `specs:` field accepts a reference to any document, and the "no specs" warning fires only when
  the project has a `specs` doctype.
- `templates/` and `living/` are reserved directory names.

### Layout rules

- Only `README.md` (generated index, as in manage-docs) and `open-questions.md` may be in the
  docs root. Any other root file is an error.
- `docs/living/` replaces `scratch/`: never linted, never indexed. It and `docs/reviews/` are
  gitignored by default, and config can change that. `/init` writes the `.gitignore` entries.
- **Gitignored doctypes are linted when present but never listed in the generated index.**
  Otherwise the index would differ per machine and always look stale.
- There is no `docs/archive/` and no archive overlay. Git holds history, so a reference to a
  deleted document is an error. Remove the related manage-docs specs and logic.

### CLI

- A Node 22+ CLI named `docs-lint`, built with **Commander**, keeping the manage-docs commands
  and `file:line - problem` output with nothing printed when clean.
- Write it in TypeScript, **porting logic and tests from manage-docs** rather than designing
  from scratch. Use a real YAML parser for config.
- Plugins installed from git get no `npm install`, so commit a single esbuild bundle and have a
  test fail when it is out of date. The zero-runtime-dependency badge goes away, but installing
  the plugin must still add nothing to the user's project.
- The plugin CLI checks **frontmatter and structure** plus the roadmap grammar. It does not read
  other prose. The manage-docs size cap moves to the rule library below.
- There is no CI distribution and no npm package for now. The gate is local.

### Project CLI

`/init` asks whether to build a small project-level CLI. On yes:

- It generates a **Commander** program in the project (adding `commander` to its dev
  dependencies) that wraps the plugin CLI, so `docs-lint` can be run from the project.
- It finds the plugin in this order: a `STRUCT_DOCS_ROOT` env var, then `installPath` from
  `~/.claude/plugins/installed_plugins.json`, then `~/.claude/skills/struct-docs`. Install paths
  change per version, so never hardcode one. The registry format is not a public contract, so
  isolate that lookup in one function.
- It offers a **pre-commit hook**, or adds to an existing check script. If the plugin cannot be
  found, the plugin checks are **skipped with a warning naming how to install it**, and the
  commit proceeds.
- **House-style body rules live in the project CLI.** The plugin ships a library of ready-made
  rule templates, and `/init` copies the ones I choose into the project, where they are mine to
  edit. They keep running when the plugin is missing. Start with `line-length`, `heading-gap`,
  `stale-pointer` and `file-size` from SDLC-docs, then add others that are equally mechanical.

### Skills

`init`, `audit`, `roadmap`, `review` and `fold` carry over from manage-docs, with these changes,
plus the new `execute-roadmap`. The two manage-docs hooks also carry over, gated on a
`struct-docs:index` marker.

- **`/init`:** detects the current setup, proposes a `.struct-docs.yml`, and reorganizes docs
  after I approve the plan. It **migrates manage-docs repos**: converts `.doctypes` and
  `.docsignore`, swaps the index markers, proposes `owns` values for approval, and folds or
  removes `archive/`. It then offers the project CLI.
- **`/fold`:** I name the documents, as in "fold X and Y". **There is no marker, flag or default
  source.** My request is what marks them. It shows a plan, moves the content into the documents
  that own it, rewrites references, and deletes the sources. Remove the `docs/decisions/` default
  from manage-docs, but `/init` may still route a legacy tree to `/fold` during migration.
- **`/review`:** writes `docs/reviews/<branch, feature or roadmap name>.md`. Replaces the date
  prefix, so a repeat review of the same name overwrites the old one. Templates and finding
  ratings carry over.
- **`/execute-roadmap <file>`:** runs an **entire roadmap file**, whether a roadmap index or a
  broken-out milestone, following dependency order and updating statuses and acceptance boxes.
  It works on a branch with one subagent per task and commits after each verified task. It stops
  at the first blocked task and reports it, whether from failing checks or a decision only I can
  make. It never pushes or merges.

## What to do now

1. Run `git init`, and add a `.gitignore` covering `docs/living/` and `docs/reviews/`.
2. Dogfood from the start. Move the content of `docs/README.md` into `docs/product/prd.md`, and
   write the specs and `.struct-docs.yml` under this system's own rules, including `owns`.
3. Write `docs/roadmaps/v1/index.md`, using demonstrable milestones in about this order: config
   and schema; ported `docs-lint` with `owns`; ported skills and hooks; `execute-roadmap`; project
   CLI and rule library; migration of a copy of SDLC-docs.
4. **Stop for my review before writing any implementation code.** Do not commit until I ask.

Ask me only about things this prompt leaves truly undecided, each with your recommendation. Any
question I cannot answer goes in `docs/open-questions.md`.

## Deliberately deferred

CI and npm distribution, support for agents other than Claude Code, custom field kinds beyond
the four above, a config language for body rules, and staleness tracking between documents.
