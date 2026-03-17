---
description: Create or update the project constitution with core principles and governance rules.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are updating the project constitution at `.specify/memory/constitution.md`.

Follow this execution flow:

1. Load the existing constitution at `.specify/memory/constitution.md`.

2. Collect/derive values for any placeholders:
   - If user input supplies a value, use it.
   - Otherwise infer from existing repo context.
   - `LAST_AMENDED_DATE` is today if changes are made.
   - `CONSTITUTION_VERSION` must increment according to semantic versioning.

3. Draft the updated constitution content:
   - Replace every placeholder with concrete text.
   - Preserve heading hierarchy.
   - Ensure each Principle section has a succinct name and non-negotiable rules.

4. Consistency propagation: Ensure templates in `.specify/templates/` align with updated principles.

5. Write the completed constitution back to `.specify/memory/constitution.md`.

6. Output a final summary with new version, any files flagged for follow-up, and suggested commit message.
