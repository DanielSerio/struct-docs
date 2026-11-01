---
id: v1
title: V1 Launch
type: roadmap
status: in-progress
intent: Ship usable product to first 10 users.
specs: [specs/sync-layer]
---

## Milestones

### auth <!-- status: done -->
Intent: People can sign in.
Acceptance:
- [x] Email and password
- [x] Session survives reload

### billing <!-- status: in-progress -->
Deps: auth
Breakout: ./billing.md

### reporting <!-- status: todo -->
Intent: Usage numbers the team can read.
Acceptance:
- [ ] Daily active users
Deps: billing

### mobile-app <!-- status: cut -->
Intent: Native client.
Acceptance:
- [ ] Ships to both stores
Notes:
- 2026-08-01 cut, web is enough for the first ten users

### exports <!-- status: todo -->
Intent: Customers can take their data with them.
Acceptance:
- [ ] CSV export
Deps: mobile-app
