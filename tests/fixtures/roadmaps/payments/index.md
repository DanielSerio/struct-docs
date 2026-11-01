---
id: payments
title: Payments hardening
type: roadmap
status: todo
intent: Take money reliably once the first ten users are paying.
specs: [specs/sync-layer]
---

## Milestones

### auth <!-- status: todo -->
Intent: Service-to-service auth between the gateway and core.
Acceptance:
- [ ] mTLS between gateway and core
- [ ] Keys rotate without a deploy

### reconciliation <!-- status: todo -->
Intent: The ledger matches Stripe every morning.
Acceptance:
- [ ] Nightly job flags mismatches
Deps: v1:auth
