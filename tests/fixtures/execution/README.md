# Whole-roadmap execution rehearsal

From the Struct Docs checkout, run one command:

```sh
npm run rehearse:execution -- success
```

Use `failed-check` or `decision` instead of `success` for a blocking variant. The command
prints JSON containing `root`, `project`, `remote`, `baseline`, `variant` and `plugin`.
It creates a new project and local bare remote under the OS temp directory, outside this
checkout. It never reuses a caller-selected directory and does not push or merge anything.
Manual copies remain available for inspection; remove only the returned rehearsal root
when finished, after verifying its path.

The project uses only Node builtins, so `npm run check` needs no `npm install`. Its default
check passes initially in every variant, and its docs audit clean. The failing variant adds
an explicit required red gate after the first task. The decision variant adds a user-only
choice at that point. Both gate all later tasks while preserving earlier completed work.

Use the returned plugin path for the bundled CLI, with the project as the working directory.
The existing `docs/roadmaps/release/greeting.md` breakout supports scoped execution; the
index also contains a later inline milestone to rehearse just-in-time breakout creation.
Baseline `main`, the bare remote and the completed baseline task provide observable evidence
that execution did not publish, merge or regenerate earlier progress.
