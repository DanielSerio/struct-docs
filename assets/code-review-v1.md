# Code review

Structure for a review written by the `review` command. Copied verbatim into a project by
`init`, then owned by that project - edit it there to change how reviews read.

Free-form by design: this file has no frontmatter and is not schema-checked. Only the
reviews it produces are.

---

## Ratings

First in the file, so a reader can sort the findings before reading any of them. One row per
finding, in the order of Findings below; `#` is the finding's number there.

| # | Finding | Criticality | Problem confidence | Solution confidence | Effort | Blast radius | Regression potential | Flags |
|---|---------|-------------|--------------------|---------------------|--------|--------------|----------------------|-------|
| 1 | The finding, in a few words | High | 9 | 6 | 4 | 2 | 3 | 🧪 🏋️ 🐞 |

**Criticality** is how bad the problem is if it is left alone. It says nothing about the Fix,
which the other ratings cover. It is one of four levels:

- **Critical** - loses or exposes data, or takes the system down, in normal use. Fix it
  before anything else ships.
- **High** - a failure a user or an attacker can reach, or a promise of the specs that
  nothing checks. Fix it before more work builds on it.
- **Medium** - a failure under particular conditions, or a cost paid again and again. Plan
  it.
- **Low** - a small cost, or a nit that has a consequence. Fix it when working nearby. A nit
  with no consequence is a Note.

The findings are ordered by criticality, the most critical first.

Each other rating is a whole number from 1 to 10.

- **Problem confidence** - how sure it is that this is a real problem. 1 is a hunch; 10 is
  reproduced, or proven from the code.
- **Solution confidence** - how sure it is that the Fix is the right one. 1 is a guess; 10
  is a fix known to work.
- **Effort** - how much work the Fix is. 1 is a one-line change; 10 is a rewrite that spans
  the project.
- **Blast radius** - how much of the system the Fix touches. 1 is one function; 10 is every
  part of it.
- **Regression potential** - how likely the Fix is to break something that works today. 1 is
  that it cannot; 10 is that it almost certainly will.

A flag follows from the ratings and is never chosen by hand. Keep this table in the review,
so the flags can be read without the template:

| Flag | Means | Given when |
|------|-------|------------|
| 🧪 | requires further investigation | problem confidence or solution confidence is below 8 |
| 🏋️ | big lift | effort is 4 or more |
| 💥 | widespread | blast radius is 5 or more |
| 🐞 | requires extra QA | regression potential is 3 or more |

The ratings sort the findings of this one review. They are not a score for the subject, and
they are not compared with the ratings of another review.

## Subject

What was reviewed, and at what commit or state.

## Summary

Two or three sentences. What shape is this code in, and what is the one thing most worth
acting on.

## Findings

One numbered entry per finding, most critical first. The number is the one its row in Ratings
carries. For each:

- **What** - the problem, stated as a fact about the code.
- **Where** - `file:line`.
- **Why it matters** - the failure it causes or the cost it imposes. A finding with no
  consequence is a preference, and belongs under Notes instead.
- **Fix** - what to do, concretely.

## What is good

Not filler. Naming what works stops a later reader from "fixing" a deliberate choice, and
it is the only place in this system that records why something is the way it is.

## Notes

Preferences, nits, and anything the reviewer wants on record without asserting it matters.
Notes are not rated.

---

Anything the review surfaces that is genuinely **undecided** goes to
`docs/open-questions.md`, not into this document as a hedge. A review states what is;
open questions live in one place.
