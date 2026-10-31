# Struct Docs

Struct Docs will be an agent plugin meant to replace our `manage-docs` plugin. I have learned some things from using it.

## Purpose

A lot of people talk about _what_ project documentation should contain, less people talk about _how_ it should contain them. Our tool should use a (customizable) frontmatter schema to keep free of conflicts & redundancy. The docs-lint cli can run deterministic checks on our documentation that most people are using the model for.

## Customization

Instead of the current `.doctypes` and `.docsignore`, we will use a single `.struct-docs.yml` config file. This file allows us to specify the doctypes, what should be ignored, and even customize the frontmatter schema for the particular project.

## Doctypes

We will have 1 doctype that cannot be changed, removed, or ignored: `roadmap`. Roadmaps follow a particular structure and should not be customizable.

## Frontmatter Schema

Similar to above, We should probably have some required fields that cannot be removed or changed so that our CLI can be effective.

## Skills

It should contain the same skills as our manage docs, plus these if we dont have them or if below is defined differently.

- **/init**: Initialize new project docs. Detects the current setup and proposes a config (`.struct-docs.yml`). Will reorganize the documentation to follow the particular structure.
- **/roadmap**: Generates a new roadmap.
- **/execute-roadmap**: Executes a roadmap file.
- **/fold**: Extracts information from documentation that is marked for deletion and writes it to the project docs in the appropriate files so it is not lost.
- **/review**: Generates a formatted review file to `docs/reviews/<branch,feature,or roadmap name>.md`.

## `living` directory

The `docs/living` directory is an ignored directory for the user to use. It can be thought of as a scratch or temporary files directory.

## Rules

- The only files that may go in the docs root are `open-questions.md` and `README.md`. Everything else should go in folder named for its `doctype`.
- By default, `docs/reviews` and `docs/living` should be gitignored.

## Dogfooding

We should dogfood this project with it's own docs system.
