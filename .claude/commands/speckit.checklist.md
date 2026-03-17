---
description: Generate a requirements quality checklist for the current feature spec.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Load feature context from the active feature directory in `specs/`.

2. Ask up to 3 clarifying questions about checklist focus, depth, and scope.

3. Generate checklist as "Unit Tests for Requirements" - validating requirement quality, NOT implementation:
   - Save to `specs/[feature]/checklists/[domain].md`
   - Items test: Completeness, Clarity, Consistency, Measurability, Coverage
   - Format: `- [ ] CHK### <requirement quality question> [Quality Dimension]`

4. Report: checklist path, item count, focus areas.

## Prohibited patterns (testing implementation, NOT requirements):
- "Verify", "Test", "Confirm" + implementation behavior
- References to code execution or system behavior

## Required patterns (testing requirements quality):
- "Are [requirements] defined/specified for [scenario]?"
- "Is [vague term] quantified with specific criteria?"
- "Are requirements consistent between [section A] and [section B]?"
