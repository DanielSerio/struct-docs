---
name: review
description: Review code, a branch, feature or roadmap using the project's template and replace its stable review in docs/reviews/.
user-invocable: true
---

Review the subject the user names. Read its relevant code and governing docs, and explain
findings with evidence rather than treating the subject as something to score.

## Load the project template first

Before reviewing, read the named project template, or `docs/templates/code-review-v1.md`
when none was named. If that file is missing, stop and point at the init skill. Do not
invent a template or silently substitute the default for a missing named template: stable
structure is what lets readers compare findings.

Follow the project's template, including any changed structure, categories or thresholds.
The defaults below describe the shipped template; project changes take precedence. Keep
the required review metadata even when the template is free-form.

## Write one stable review

Use `docs/reviews/<branch-feature-or-roadmap-slug>.md`, with a stable kebab-case slug for
the confirmed subject and no date prefix. Re-reviewing that same subject replaces the
same file, even on another day. Read an existing file before replacing it. If the subject
or slug is ambiguous, or the filename belongs to a different subject, clarify rather than
overwriting an unrelated review or inventing a dated filename.

For example, `docs/reviews/auth.md` begins:

```yaml
---
title: Auth module review
type: review
purpose: Record actionable findings about account authentication.
subject: features/auth
template: templates/code-review-v1
---
```

`subject` is free-form text naming the code path, branch, feature or roadmap reviewed; it
is not a document reference. Record the reviewed commit or state in the template's Subject
section. `template` is the actual project template's docs-relative reference without
`.md`, such as `templates/security-review`; it must resolve to the template you read.
There is no `id` field. Follow the project's configured schema for any additional fields.

## Rate findings, not the subject

Order findings by consequence: **Critical**, **High**, **Medium**, then **Low**. Criticality
describes the problem if left alone, independently of how expensive its fix is. A nit with
no consequence belongs in unrated Notes.

Give every finding five integer ratings from 1 to 10, using the template's scale anchors:

- **Problem confidence**: how sure you are that this is a real problem.
- **Solution confidence**: how sure you are that the proposed fix is right.
- **Effort**: how much work the fix takes.
- **Blast radius**: how much of the system the fix touches.
- **Regression potential**: how likely the fix is to break working behavior.

Use inspected evidence for confidence ratings. In the shipped template, derive flags from
the ratings rather than choosing them independently:

| Flag meaning | Default threshold |
| --- | --- |
| Investigation | Either confidence is below 8 |
| Big lift | Effort is 4 or more |
| Widespread | Blast radius is 5 or more |
| Extra QA | Regression potential is 3 or more |

Copy the project's flag table into the review so its symbols and thresholds are readable
without opening the template. A finding can have several flags or none. Never total or
average ratings, assign a subject score, or compare scores across reviews. For each finding,
state what is wrong, its `file:line`, the consequence and a concrete fix in prose. Keep its
number aligned with the Ratings row. Follow the template's remaining sections, including
Notes for observations that do not assert a problem.

## Verify and report

Run the bundled structural check (`../../bin/docs-lint.mjs` relative to this `SKILL.md`)
from the project root and relay its findings:

```sh
node "../../bin/docs-lint.mjs" audit
```

Do not invent content or repair unrelated docs to quiet the report. Report the review's
path and whether it replaced the prior review. Ask the user about genuinely undecided
behavior with a recommendation; only a question they cannot answer goes to
`docs/open-questions.md`, never into the review as a hedge. Keep rules with their reasons
and edit no global settings.
