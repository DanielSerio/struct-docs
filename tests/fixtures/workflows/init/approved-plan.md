# Approved test plan

This is fixed fixture approval for the automated rehearsal, not approval to change a real
project. The init skill must present an equivalent concrete plan before applying it.

```yaml
# Setup walkthroughs are project guides.
doctypes:
  guides:
    type: guide
ignore:
  # Generated API reference; regenerated from the service schema.
  - generated/
```

| Existing file | Approved destination/change | Ownership/content decision |
| --- | --- | --- |
| `docs/.doctypes` | Root `.struct-docs.yml`, then remove legacy config | Retain `guides: guide` and its reason |
| `docs/.docsignore` | Root config ignore entry, then remove legacy config | Retain generated exclusion and reason |
| `docs/guides/setup.md` | Same file; add `owns: [operator-setup]` | Walkthrough content establishes guide type |
| `docs/specs/service.md` | Same file; add `owns: [service-startup]` | Existing purpose covers startup policy |
| `docs/scratch/session.md` | `docs/living/session.md` | Preserve all local notes; no ownership |
| `docs/roadmap/index.md` | `docs/roadmaps/release/index.md` | Preserve all acceptance, notes and leaf progress |
| `README.md` | Update roadmap link | Setup link stays unchanged |
| `docs/README.md` | Remove old generated block; CLI generates Struct Docs index | Preserve authored introduction/footer |
| Missing review template | CLI seeds the shipped asset verbatim | No inferred template or review content |
| Missing `.gitignore` | CLI writes managed policy for living and reviews | No global hook/settings changes |

Validate the retained root configuration before deleting the legacy config. Remove emptied
legacy roadmap/scratch directories as part of these approved moves. No archive or decisions
content exists in this fixture; nothing is silently discarded. No local CLI integration is
requested in this test. Source fixture files must remain unchanged throughout the rehearsal.
