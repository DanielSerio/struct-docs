---
id: multi-host
title: Multi-host support
type: roadmap-node
status: in-progress
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

### skill-paths <!-- status: todo -->
Intent: Skills reach the bundled CLI the same way in every host.
Acceptance:
- [ ] No skill references `CLAUDE_PLUGIN_ROOT` or another host variable, and each names the bundle by a path relative to its own `SKILL.md`.
- [ ] Manifest tests resolve every skill's CLI path from a copied plugin with no host variables set, and fail when one points outside the plugin.
Deps: host-research

### hook-adapters <!-- status: todo -->
Intent: Each host's hook payload becomes one shape before the shared hook logic runs.
Acceptance:
- [ ] Replaying each host's PostToolUse fixture gives the same single-file findings and sentinel as the equivalent Claude write, in that host's required output: in Antigravity, `{}` when clean, otherwise `overwriteResult` holding the original tool result followed by the findings.
- [ ] A Codex `apply_patch` touching several files, including an added, a deleted and a moved file, checks each surviving docs file and arms the sentinel once.
- [ ] Each host's Stop fixture repairs from the right project root and prints that host's required output, which in Antigravity never asks the agent to continue.
- [ ] An unrecognized payload exits 0 with the host's empty output, or nothing where the host allows it.
Deps: host-research

### host-manifests <!-- status: todo -->
Intent: One checkout carries a manifest for every host, each registering the same skills and hooks.
Acceptance:
- [ ] `.codex-plugin/plugin.json` and `.antigravity-plugin/plugin.json` exist, and each host's hook config, wherever that host reads it, registers both hooks with commands that resolve inside the plugin. One hooks file may serve more than one host.
- [ ] Manifest tests cover all three hosts and fail on a missing referenced file, a hook missing from any host's registration, or a skill set that differs between hosts.
- [ ] `claude plugin validate . --strict`, `agy plugin validate --strict .`, and Codex's validator if it has one, all pass.
Deps: skill-paths, hook-adapters

### host-rehearsals <!-- status: todo -->
Intent: Each host is shown working from a git install, and the README says how to install in each.
Acceptance:
- [ ] In each host, a git-installed plugin on a fixture project runs the audit skill, and a docs edit produces post-write feedback and a Stop repair.
- [ ] The execution rehearsal runs in each host with its own subagents, or stops before changing anything where a host has none.
- [ ] The README gives install steps per host, including Codex hook trust, and no longer says Claude Code is the only supported host.
Deps: host-manifests
