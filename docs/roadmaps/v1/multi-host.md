---
id: multi-host
title: Multi-host support
type: roadmap-node
status: done
intent: One plugin checkout installs and behaves alike in Claude Code, Codex and Antigravity.
---

## Tasks

### host-research <!-- status: done -->
Intent: Each host's plugin, hook and skill contracts are verified before code depends on them.
Acceptance:
- [x] `docs/specs/packaging.md` names, with source links, each host's manifest path, plugin hook config location, plugin install location, required PostToolUse and Stop output, and how a hook command and a skill find files inside the plugin.
- [x] A PostToolUse payload for a file write and a Stop payload, captured from a real session of each host, are committed as sanitized fixtures.
- [x] Any contract a host does not document is recorded in the spec as observed behavior, with the session that showed it.
Notes:
- 2026-11-03 Captured live `PostToolUse` and `Stop` payloads from Claude Code (`6f67a583-d462-43e0-bb98-3815774f05fa`), Codex (`01a1a1d5-3e13-7323-8df0-45e67d7995cf`) and Antigravity (`c6f043a4-7870-4023-970c-0b6c11cb96cc`, `5616c166-0dac-4fff-8c4c-6e8fbdd2fc5e`), committed sanitized fixtures under `tests/fixtures/hooks/`, and documented each host's contracts and observed behavior in `docs/specs/packaging.md`.

### skill-paths <!-- status: done -->
Intent: Skills reach the bundled CLI the same way in every host.
Acceptance:
- [x] No skill references `CLAUDE_PLUGIN_ROOT` or another host variable, and each names the bundle by a path relative to its own `SKILL.md`.
- [x] Manifest tests resolve every skill's CLI path from a copied plugin with no host variables set, and fail when one points outside the plugin.
Deps: host-research
Notes:
- 2026-11-03 Replaced `${CLAUDE_PLUGIN_ROOT}/bin/docs-lint.mjs` in all six `SKILL.md` files with `../../bin/docs-lint.mjs` relative to each `SKILL.md` and updated `tools/plugin-skills.mjs` and `tools/plugin-manifest.test.mjs` to forbid host variables and resolve relative skill CLI paths inside the plugin.

### hook-adapters <!-- status: done -->
Intent: Each host's hook payload becomes one shape before the shared hook logic runs.
Acceptance:
- [x] Replaying each host's PostToolUse fixture gives the same single-file findings and sentinel as the equivalent Claude write, in that host's required output: in Antigravity, `{}` when clean, otherwise `overwriteResult` holding the original tool result followed by the findings.
- [x] A Codex `apply_patch` touching several files, including an added, a deleted and a moved file, checks each surviving docs file and arms the sentinel once.
- [x] Each host's Stop fixture repairs from the right project root and prints that host's required output, which in Antigravity never asks the agent to continue.
- [x] An unrecognized payload exits 0 with the host's empty output, or nothing where the host allows it.
Deps: host-research
Notes:
- 2026-11-03 Normalized Claude Code, Codex (`Write`/`Edit` and `apply_patch` headers) and Antigravity (`toolCall.args` and `workspacePaths`) payloads in `hooks/lib.mjs`, formatted host-required `PostToolUse` and `Stop` outputs in `hooks/post-write-check.mjs` and `hooks/stop-repair.mjs`, and added fixture replay, multi-file `apply_patch`, and unrecognized-payload tests in `tools/post-write-hook.test.mjs` and `tools/stop-hook.test.mjs`.

### host-manifests <!-- status: done -->
Intent: One checkout carries a manifest for every host, each registering the same skills and hooks.
Acceptance:
- [x] `.codex-plugin/plugin.json` and `.antigravity-plugin/plugin.json` exist, and each host's hook config, wherever that host reads it, registers both hooks with commands that resolve inside the plugin. One hooks file may serve more than one host.
- [x] Manifest tests cover all three hosts and fail on a missing referenced file, a hook missing from any host's registration, or a skill set that differs between hosts.
- [x] `claude plugin validate --strict`, `agy plugin validate --strict`, and Codex's validator if it has one, all pass on the copied plugin the manifest tests use, which holds only shipped files; repository-only `CLAUDE.md` and `AGENTS.md` stay at the root and out of the copy.
Deps: skill-paths, hook-adapters
Notes:
- 2026-11-03 Added `.codex-plugin/plugin.json`, `.antigravity-plugin/plugin.json`, and `hooks.json`; shared `copiedPlugin` in `tools/plugin-files.mjs` so manifest tests and strict host validators check the same shipped file set while keeping `CLAUDE.md` and `AGENTS.md` at the repository root; updated `tools/plugin-manifest.mjs`, `tools/plugin-skills.mjs`, `tools/plugin-manifest.test.mjs`, `AGENTS.md`, and `README.md`; verified `node tools/plugin-files.mjs claude plugin validate --strict` and `node tools/plugin-files.mjs agy plugin validate --strict` both pass.

### host-rehearsals <!-- status: done -->
Intent: Each host is shown working from a git install, and the README says how to install in each.
Acceptance:
- [x] In each host, a git-installed plugin on a fixture project runs the audit skill, and a docs edit produces post-write feedback and a Stop repair.
- [x] The execution rehearsal runs in each host with its own subagents, or stops before changing anything where a host has none.
- [x] The README gives install steps per host, including Codex hook trust, and no longer says Claude Code is the only supported host.
Deps: host-manifests
Notes:
- 2026-11-03 Rehearsed a git-cloned plugin across Claude Code (`session 9911402d-ed72-4044-83c1-8760ab3ffbb8`), Codex (`session 01a1a241-8ecf-7fb0-8c8d-43b0cb3bfa15`, via `.codex-plugin/hooks.json`), and Antigravity (`agy plugin install`) on fresh rehearsal fixtures: each host ran the `audit` skill cleanly, reported the `kebab-case` finding on `docs/specs/Bad_Name.md` from `PostToolUse`, and repaired `docs/README.md` on `Stop`. Rehearsed `execute-roadmap` on `docs/roadmaps/release/greeting.md` with each host's real subagents on `work/greeting`: Claude Code committed `6fe3f63`, `d7e324f`, and `e9e4cc3` above `2039efd`; Codex (`session 01a1a244-a7dd-7250-a45d-06e384e607c9`) committed `308b20e`, `7297bbd`, and `f67dfef` above `98b97c1`; Antigravity committed `5daf903`, `b66e637`, and `36798bc` above `4588e72`. Updated `README.md` and `AGENTS.md` with per-host install steps and Codex hook trust.
