---
id: greeting
title: Optional greeting capabilities
type: roadmap-node
status: in-progress
intent: Add named, excited and batch greetings without changing the baseline contract.
---

## Tasks

### baseline-contract <!-- status: done -->
Intent: An unnamed greeting has a tested existing contract.
Acceptance:
- [x] Calling greet without arguments returns Hello
Notes:
- 2026-11-03 the baseline check passes; retain this completed work and evidence.

### named-greeting <!-- status: in-progress -->
Intent: A caller can greet a named person.
Acceptance:
- [ ] greet('Ada') returns Hello Ada
- [ ] npm run check verifies named and unchanged unnamed greetings
Deps: baseline-contract
Notes:
- 2026-11-03 task opened for this rehearsal; named output is not implemented yet.

### emphasis <!-- status: todo -->
Intent: A caller can request an excited greeting without changing default behavior.
Acceptance:
- [ ] greet('Ada', { excited: true }) returns Hello Ada!
- [ ] npm run check verifies both optional emphasis and the earlier default behavior
Deps: named-greeting

### batch-greeting <!-- status: todo -->
Intent: A caller can greet a list in its original order with the same options.
Acceptance:
- [ ] greetAll(['Ada', 'Lin'], { excited: true }) returns Hello Ada! followed by Hello Lin!
- [ ] An empty input returns an empty array and npm run check passes
Deps: emphasis
