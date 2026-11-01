---
id: billing
title: Take money
type: roadmap-node
status: in-progress
intent: Stripe checkout plus webhook.
---

## Tasks

### checkout <!-- status: done -->
Intent: A customer can pay.
Acceptance:
- [x] Stripe checkout session
- [x] Card declined is handled

### webhooks <!-- status: todo -->
Intent: Keep subscription state in sync with Stripe.
Acceptance:
- [ ] Webhook updates subscription
- [ ] Replayed events are idempotent
Deps: checkout
Notes:
- 2026-07-22 started, stripe keys in vault
