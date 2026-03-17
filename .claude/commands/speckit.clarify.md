---
description: Identify underspecified areas in the feature spec and ask targeted clarification questions.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Load the current spec from the active feature directory in `specs/`.

2. Perform structured ambiguity scan across: Functional Scope, Domain & Data Model, Interaction & UX, Non-Functional Quality, Integration, Edge Cases, Constraints.

3. Generate max 5 prioritized clarification questions. Present ONE at a time with recommended option and alternatives table.

4. After each answer, update the spec:
   - Add to `## Clarifications` → `### Session YYYY-MM-DD`
   - Apply clarification to the appropriate spec section

5. Stop when: all critical ambiguities resolved, user signals "done", or 5 questions asked.

6. Report: questions asked, sections touched, coverage summary, suggested next command.
