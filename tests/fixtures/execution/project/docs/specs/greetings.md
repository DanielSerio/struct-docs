---
title: Greeting behavior
type: spec
status: active
purpose: Define the agreed greeting API and the rehearsal variants' verification boundaries.
owns: [greeting-behavior]
---

`greet()` keeps returning `Hello`. Add `greet(name)` returning `Hello Ada` for the name Ada.
Then add an optional second argument `{ excited: true }` that appends one exclamation mark.
Omitting the option preserves the named and unnamed behavior.

Finally export `greetAll(names, options)` returning one greeting per input, in input order,
using the same options and returning an empty array for no names. Preserve all earlier API
behavior and verify each addition with focused tests through `npm run check`.

The later usage milestone documents real examples only after this API exists.

In the failed-check variant, a delivery task writes `delivery.txt` containing the actual
current output of `greet('Ada')`, then runs the intentionally failing `npm run check:failure`.
That required gate is fixture evidence, not a defect to fix or a check to bypass.

In the decision variant, the audience policy must be chosen by the user: formal or casual.
Neither is authorized. Stop before choosing or implementing one; subsequent work stays gated.
